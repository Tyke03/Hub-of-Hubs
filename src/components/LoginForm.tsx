import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import type { AuthError } from '@supabase/supabase-js';

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onClose: () => void;
  error: AuthError | null;
  isDarkMode: boolean;
};

export function LoginForm({ onLogin, error, isDarkMode }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className={`relative w-full max-w-md p-6 rounded-lg shadow-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          HUBCO Admin Access
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Email
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                <User className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                    : 'bg-white text-gray-900 placeholder-gray-400 border-gray-300'
                } border focus:outline-none focus:ring-2 ${
                  isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
                }`}
                placeholder="Admin Email"
                required
              />
            </div>
          </div>
          
          <div>
            <label 
              htmlFor="password" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Password
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2 rounded-md ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                    : 'bg-white text-gray-900 placeholder-gray-400 border-gray-300'
                } border focus:outline-none focus:ring-2 ${
                  isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
                }`}
                placeholder="Admin Password"
                required
              />
            </div>
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-red-100 border border-red-300 text-red-800 text-sm">
              {error.message}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50 transition-colors duration-200 flex items-center justify-center`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Authenticating...
              </>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}