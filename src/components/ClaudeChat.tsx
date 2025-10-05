import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ChevronDown, Image } from 'lucide-react';
import axios from 'axios';

type Props = {
  isDarkMode: boolean;
};

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type VeniceModel = {
  id: string;
  type: string;
  displayName?: string;
  description?: string;
};

export function ClaudeChat({ isDarkMode }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<VeniceModel>({
    id: 'default',
    type: 'text',
    displayName: 'Default (Recommended)',
    description: 'Venice AI will select the best model for your query'
  });
  const [availableModels, setAvailableModels] = useState<VeniceModel[]>([
    { id: 'default', type: 'text', displayName: 'Default (Recommended)', description: 'Venice AI will select the best model for your query' },
    { id: 'llama-3.3-70b', type: 'text', displayName: 'Llama 3.3 70B', description: 'Meta\'s Llama 3.3 70B model - Balanced performance' },
    { id: 'llama-3.2-3b', type: 'text', displayName: 'Llama 3.2 3B', description: 'Fastest response times, smaller model' },
    { id: 'llama-3.1-405b', type: 'text', displayName: 'Llama 3.1 405B', description: 'Most intelligent, largest model' },
    { id: 'dolphin-2.9.2-qwen2-72b', type: 'text', displayName: 'Dolphin Qwen2 72B', description: 'Most uncensored responses' },
    { id: 'qwen-2.5-coder-32b', type: 'text', displayName: 'Qwen 2.5 Coder 32B', description: 'Specialized for code generation' },
    { id: 'deepseek-r1-llama-70b', type: 'text', displayName: 'DeepSeek R1 Llama 70B', description: 'DeepSeek R1 distilled from Llama' },
    { id: 'deepseek-r1-671b', type: 'text', displayName: 'DeepSeek R1 671B', description: 'Massive 671B parameter model' },
    { id: 'qwen-2.5-vl', type: 'text', displayName: 'Qwen 2.5 VL 72B', description: 'Vision-language model (text only in this interface)' },
    { id: 'deepseek-coder-v2-lite', type: 'text', displayName: 'DeepSeek Coder V2 Lite', description: 'Specialized for coding tasks' }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Listen for model change events from terminal
  useEffect(() => {
    const handleModelChange = (event: CustomEvent) => {
      const { modelId } = event.detail;
      const model = availableModels.find(m => m.id === modelId);
      
      if (model) {
        setSelectedModel(model);
        setMessages(prev => [
          ...prev, 
          { 
            role: 'system', 
            content: `Model changed to ${model.displayName || model.id}${model.description ? ` (${model.description})` : ''}`
          }
        ]);
      }
    };

    window.addEventListener('veniceModelChange', handleModelChange as EventListener);
    
    return () => {
      window.removeEventListener('veniceModelChange', handleModelChange as EventListener);
    };
  }, [availableModels]);

  // Fetch available models from Venice API
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios({
          method: 'GET',
          url: 'https://api.venice.ai/api/v1/models',
          headers: {
            'Authorization': 'Bearer g1H5MqjuRKmkscrVnh1MNwQnx2yLRWLpAx6gwWeyU0'
          }
        });
        
        if (response.data && response.data.data) {
          // Filter to only text models
          const textModels = response.data.data
            .filter((model: any) => model.type === 'text')
            .map((model: any) => ({
              id: model.id,
              type: model.type,
              displayName: model.id
                .split('-')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
              description: model.model_spec?.traits?.join(', ') || 'No description available'
            }));
          
          if (textModels.length > 0) {
            // Add default option at the beginning
            const updatedModels = [
              { 
                id: 'default', 
                type: 'text', 
                displayName: 'Default (Recommended)', 
                description: 'Venice AI will select the best model for your query' 
              },
              ...textModels
            ];
            
            setAvailableModels(updatedModels);
          }
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        // Keep using the hardcoded models if API call fails
      }
    };
    
    fetchModels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare conversation history for the API
      const apiMessages = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for the HUBCO admin dashboard. Provide concise, accurate information about system administration and help with technical questions.'
        },
        ...messages.filter(msg => msg.role !== 'system').map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      // Venice AI API call
      const response = await axios({
        method: 'POST',
        url: 'https://api.venice.ai/api/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer g1H5MqjuRKmkscrVnh1MNwQnx2yLRWLpAx6gwWeyU0'
        },
        data: {
          model: selectedModel.id,
          messages: apiMessages,
          max_tokens: 1000,
          temperature: 0.7,
          venice_parameters: {
            include_venice_system_prompt: false
          }
        }
      });

      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const assistantMessage = response.data.choices[0].message.content;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage
        }]);
      } else {
        throw new Error('Invalid response format from Venice AI API');
      }
    } catch (error: any) {
      // Safe error logging that avoids Symbol() serialization issues
      console.error('Error calling Venice AI:', error.message || 'Unknown error');
      
      let errorMessage = 'Unknown error';
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Server error: ${error.response.status}`;
        if (error.response.data && typeof error.response.data === 'object') {
          // Safely log error data without potential Symbol issues
          try {
            console.error('Error details:', JSON.stringify(error.response.data));
          } catch (e) {
            console.error('Error details could not be stringified');
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message;
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again or select a different model.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelSelect = (model: VeniceModel) => {
    setSelectedModel(model);
    setIsModelDropdownOpen(false);
    
    // Add a system message indicating the model change
    setMessages(prev => [
      ...prev, 
      { 
        role: 'system', 
        content: `Model changed to ${model.displayName || model.id}${model.description ? ` (${model.description})` : ''}`
      }
    ]);
  };

  return (
    <div className={`mt-6 rounded-lg overflow-hidden ${
      isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100 border border-gray-200'
    }`}>
      <div className={`flex items-center justify-between px-4 py-2 ${
        isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-200 border-b border-gray-300'
      }`}>
        <div className="flex items-center">
          <Bot className={`h-4 w-4 ${isDarkMode ? 'text-purple-400' : 'text-indigo-500'}`} />
          <span className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Venice AI Chat
          </span>
        </div>
        
        {/* Model selector dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className={`flex items-center text-xs px-2 py-1 rounded ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            <span className="mr-1">{selectedModel.displayName || selectedModel.id}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          
          {isModelDropdownOpen && (
            <div className={`absolute right-0 mt-1 w-64 rounded-md shadow-lg z-10 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="py-1 max-h-64 overflow-y-auto">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    } ${selectedModel.id === model.id ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                  >
                    <div className="font-medium">{model.displayName || model.id}</div>
                    {model.description && (
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {model.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="h-64 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Welcome to Venice AI Chat! How can I assist you today?</p>
            <p className="text-xs mt-2">Current model: {selectedModel.displayName || selectedModel.id}</p>
            <p className="text-xs mt-1">For image generation, scroll down to the Image Generator section below</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === 'user' 
                ? 'text-right' 
                : message.role === 'system' 
                  ? 'text-center' 
                  : 'text-left'
            }`}
          >
            {message.role === 'system' ? (
              <div className={`inline-block px-3 py-1 rounded-lg text-xs ${
                isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}>
                {message.content}
              </div>
            ) : (
              <div
                className={`inline-block max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? isDarkMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-800 text-gray-300'
                    : 'bg-white text-gray-700'
                }`}
              >
                {message.content}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-center">
            <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${
              isDarkMode ? 'border-purple-500' : 'border-indigo-500'
            } mx-auto`}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={`p-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Venice AI something..."
            className={`flex-1 rounded-lg px-4 py-2 ${
              isDarkMode
                ? 'bg-gray-800 text-gray-300 placeholder-gray-500 border-gray-700'
                : 'bg-white text-gray-700 placeholder-gray-400 border-gray-300'
            } border focus:outline-none focus:ring-2 ${
              isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`rounded-lg p-2 ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } disabled:opacity-50`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="flex justify-end mt-2">
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center`}>
            <Image className="h-3 w-3 mr-1" />
            <span>For image generation, see below</span>
          </div>
        </div>
      </form>
    </div>
  );
}