import React, { useEffect, useState } from 'react';
import { Settings, Bell, Home, Sun, Moon } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import { AdminTerminal } from './components/AdminTerminal';
import { ClaudeChat } from './components/ClaudeChat';
import { ImageGenerator } from './components/ImageGenerator';
import { HubcoBanner } from './components/HubcoBanner';
import { LoginForm } from './components/LoginForm';

type AdminProfile = {
  id: string;
  name: string;
  avatar_url: string;
  status: string;
};

function App() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
        setShowLoginForm(!session?.user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setShowLoginForm(!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching admin profile:', error);
          return;
        }
        
        setProfile(data);
      } catch (error) {
        console.error('Error in profile management:', error);
      }
    };

    fetchAdminProfile();

    if (user) {
      const subscription = supabase
        .channel('profile_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            setProfile(payload.new as AdminProfile);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const handleAdminSignIn = async (email: string, password: string) => {
    try {
      setAuthError(null);
      
      // Skip signup attempt and go straight to sign in since we know the user exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        setAuthError(signInError);
        console.error('Supabase request failed', signInError);
      } else {
        setShowLoginForm(false);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError(error as AuthError);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setShowLoginForm(true);
  };

  const handleThemeChange = (theme: 'dark' | 'light') => {
    setIsDarkMode(theme === 'dark');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <HubcoBanner />
      {/* Navigation */}
      <nav className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Home className={`h-8 w-8 ${isDarkMode ? 'text-purple-500' : 'text-indigo-600'}`} />
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <span className={`${isDarkMode ? 'border-purple-500 text-white' : 'border-indigo-500 text-gray-900'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  Admin Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
              </button>
              {user && (
                <>
                  <button className={`p-2 rounded-full ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}>
                    <Bell className="h-6 w-6" />
                  </button>
                  <button className={`p-2 rounded-full ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}>
                    <Settings className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      isDarkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      {showLoginForm && !user && (
        <LoginForm 
          onLogin={handleAdminSignIn} 
          onClose={() => {}} 
          error={authError}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDarkMode ? 'border-purple-500' : 'border-indigo-500'} mx-auto`}></div>
          </div>
        ) : user ? (
          <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow rounded-lg p-6`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Administration</h2>
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'}
                    alt="Admin"
                    className="h-12 w-12 rounded-full"
                  />
                  <div>
                    <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Administrator</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{profile.status}</p>
                  </div>
                </div>
                <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Controls</h4>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Welcome to your system administration dashboard. Use the terminal below to manage system operations and monitor performance.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Admin Terminal */}
                  <AdminTerminal isDarkMode={isDarkMode} onThemeChange={handleThemeChange} />
                  
                  {/* Venice AI Chat */}
                  <ClaudeChat isDarkMode={isDarkMode} />
                </div>
                
                {/* Image Generator */}
                <div className="mt-6">
                  <ImageGenerator isDarkMode={isDarkMode} />
                </div>
              </div>
            ) : (
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Loading admin profile...</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;