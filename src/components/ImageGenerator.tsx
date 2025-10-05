import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Download, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';

type Props = {
  isDarkMode: boolean;
};

type ImageModel = {
  id: string;
  displayName: string;
  description?: string;
  apiKey?: string;
  apiEndpoint?: string;
};

type ApiError = {
  message: string;
  details?: string;
  code?: string;
  suggestion?: string;
};

export function ImageGenerator({ isDarkMode }: Props) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ImageModel>({
    id: 'stable-diffusion-3.5',
    displayName: 'Stable Diffusion 3.5',
    description: 'Latest Stable Diffusion model with improved quality',
    apiEndpoint: 'https://api.venice.ai/api/v1/images/generations'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [apiKey, setApiKey] = useState('g1H5MqjuRKmkscrVnh1MNwQnx2yLRWLpAx6gwWeyU0');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const imageModels: ImageModel[] = [
    {
      id: 'stable-diffusion-3.5',
      displayName: 'Stable Diffusion 3.5 (Venice)',
      description: 'Latest Stable Diffusion model with improved quality',
      apiEndpoint: 'https://api.venice.ai/api/v1/images/generations'
    },
    {
      id: 'dall-e-3',
      displayName: 'DALL-E 3 (OpenAI)',
      description: 'OpenAI\'s DALL-E 3 model - requires OpenAI API key',
      apiEndpoint: 'https://api.openai.com/v1/images/generations'
    },
    {
      id: 'pixai',
      displayName: 'PixAI',
      description: 'PixAI image generation - requires PixAI API key',
      apiEndpoint: 'https://api.pixai.art/v1/images/generations'
    }
  ];

  const imageRef = useRef<HTMLImageElement>(null);

  const handleModelChange = (modelId: string) => {
    const model = imageModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      setError(null);
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      let response;
      
      // Different API handling based on the selected model
      if (selectedModel.id.includes('dall-e')) {
        response = await axios({
          method: 'POST',
          url: 'https://api.openai.com/v1/images/generations',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          data: {
            model: "dall-e-3",
            prompt: prompt.trim(),
            n: 1,
            size: "1024x1024",
            quality: "standard"
          }
        });
        
        if (response.data?.data?.[0]?.url) {
          setGeneratedImage(response.data.data[0].url);
        } else {
          throw new Error('No image was generated');
        }
      } else if (selectedModel.id.includes('pixai')) {
        response = await axios({
          method: 'POST',
          url: 'https://api.pixai.art/v1/images/generations',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          data: {
            prompt: prompt.trim(),
            negative_prompt: negativePrompt.trim() || undefined,
            cfg_scale: cfgScale,
            width: 768,
            height: 768
          }
        });
        
        if (response.data?.images?.[0]?.url) {
          setGeneratedImage(response.data.images[0].url);
        } else {
          throw new Error('No image was generated');
        }
      } else {
        // Venice AI API (default)
        const requestData = {
          model: selectedModel.id,
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          cfg_scale: cfgScale,
          width: 768,
          height: 768,
          steps: 30
        };

        response = await axios({
          method: 'POST',
          url: 'https://api.venice.ai/api/v1/images/generations',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          data: requestData
        });

        if (response.data?.data?.[0]?.url) {
          setGeneratedImage(response.data.data[0].url);
        } else {
          throw new Error('No image was generated');
        }
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      
      const apiError: ApiError = {
        message: 'Failed to generate image'
      };
      
      if (error.response) {
        apiError.message = `Server error: ${error.response.status}`;
        apiError.code = `HTTP ${error.response.status}`;
        
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            apiError.details = error.response.data;
          } else if (error.response.data.error) {
            apiError.details = typeof error.response.data.error === 'string' 
              ? error.response.data.error 
              : error.response.data.error.message;
          }
        }
        
        if (error.response.status === 401 || error.response.status === 403) {
          apiError.suggestion = "Your API key may be invalid or expired. Try updating your API key.";
        } else if (error.response.status === 400) {
          apiError.suggestion = "The request was invalid. Check your prompt for prohibited content or try simplifying it.";
        } else if (error.response.status === 429) {
          apiError.suggestion = "You've exceeded your rate limit or quota. Wait a while or check your subscription.";
        } else if (error.response.status >= 500) {
          apiError.suggestion = "The server encountered an error. This is not your fault - try again later.";
        }
      } else if (error.request) {
        apiError.message = 'Network Error';
        apiError.details = 'No response received from server';
        apiError.suggestion = "Check your internet connection or try again later. The API service might be down.";
      } else {
        apiError.message = error.message;
      }
      
      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    window.open(generatedImage, '_blank');
  };

  return (
    <div className={`mt-6 rounded-lg overflow-hidden ${
      isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100 border border-gray-200'
    }`}>
      <div className={`flex items-center px-4 py-2 ${
        isDarkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-200 border-b border-gray-300'
      }`}>
        <ImageIcon className={`h-4 w-4 ${isDarkMode ? 'text-purple-400' : 'text-indigo-500'}`} />
        <span className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Image Generator
        </span>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleGenerateImage} className="space-y-4">
          <div>
            <label 
              htmlFor="model-select" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Model
            </label>
            <select
              id="model-select"
              value={selectedModel.id}
              onChange={(e) => handleModelChange(e.target.value)}
              className={`w-full rounded-md px-3 py-2 text-sm ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-300 border-gray-700' 
                  : 'bg-white text-gray-700 border-gray-300'
              } border focus:outline-none focus:ring-2 ${
                isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
              }`}
            >
              {imageModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
            </select>
            {selectedModel.description && (
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedModel.description}
              </p>
            )}
          </div>
          
          <div>
            <div className="flex justify-between items-center">
              <label 
                htmlFor="api-key" 
                className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                API Key
              </label>
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className={`text-xs ${isDarkMode ? 'text-purple-400' : 'text-indigo-500'}`}
              >
                {showApiKeyInput ? 'Hide' : 'Show/Edit'}
              </button>
            </div>
            {showApiKeyInput && (
              <input
                id="api-key"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className={`w-full rounded-md px-3 py-2 text-sm ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-300 placeholder-gray-500 border-gray-700' 
                    : 'bg-white text-gray-700 placeholder-gray-400 border-gray-300'
                } border focus:outline-none focus:ring-2 ${
                  isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
                }`}
              />
            )}
            {!showApiKeyInput && (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                API key is set {apiKey ? '✓' : '✗'}
              </p>
            )}
          </div>
          
          <div>
            <label 
              htmlFor="prompt" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={3}
              className={`w-full rounded-md px-3 py-2 text-sm ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-300 placeholder-gray-500 border-gray-700' 
                  : 'bg-white text-gray-700 placeholder-gray-400 border-gray-300'
              } border focus:outline-none focus:ring-2 ${
                isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
              }`}
              required
            />
          </div>
          
          <div>
            <label 
              htmlFor="negative-prompt" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Negative Prompt (Optional)
            </label>
            <textarea
              id="negative-prompt"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Describe what you don't want in the image..."
              rows={2}
              className={`w-full rounded-md px-3 py-2 text-sm ${
                isDarkMode 
                  ? 'bg-gray-800 text-gray-300 placeholder-gray-500 border-gray-700' 
                  : 'bg-white text-gray-700 placeholder-gray-400 border-gray-300'
              } border focus:outline-none focus:ring-2 ${
                isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-indigo-500'
              }`}
            />
          </div>
          
          <div>
            <label 
              htmlFor="cfg-scale" 
              className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
            >
              Creativity vs. Strictness: {cfgScale} 
              <span className="text-xs ml-1">
                (Lower = more creative, Higher = more strict to prompt)
              </span>
            </label>
            <input
              id="cfg-scale"
              type="range"
              min="1"
              max="14"
              step="0.5"
              value={cfgScale}
              onChange={(e) => setCfgScale(parseFloat(e.target.value))}
              className={`w-full ${isDarkMode ? 'accent-purple-500' : 'accent-indigo-500'}`}
            />
            <div className="flex justify-between text-xs mt-1">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Creative</span>
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Balanced</span>
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Strict</span>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !prompt.trim() || !apiKey}
            className={`w-full rounded-md py-2 px-4 text-white font-medium flex items-center justify-center ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50 transition-colors duration-200`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </button>
        </form>
        
        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-100 border border-red-300 text-red-800 text-sm">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{error.message}</p>
                {error.details && <p className="mt-1">{error.details}</p>}
                {error.code && <p className="mt-1 text-xs">Error code: {error.code}</p>}
                {error.suggestion && (
                  <p className="mt-2 text-xs border-t border-red-200 pt-2">
                    <strong>Suggestion:</strong> {error.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {generatedImage && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Generated Image
              </h3>
              <button
                onClick={handleDownloadImage}
                className={`flex items-center text-xs px-2 py-1 rounded ${
                  isDarkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                <Download className="h-3 w-3 mr-1" />
                View Full Size
              </button>
            </div>
            <div className={`rounded-md overflow-hidden border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-300'
            }`}>
              <img 
                ref={imageRef}
                src={generatedImage} 
                alt="AI generated" 
                className="w-full h-auto"
                onError={() => {
                  setError({
                    message: "Failed to load image",
                    details: "The image URL could not be loaded. It may have expired or been removed.",
                    suggestion: "Try generating a new image or check if the API service is functioning correctly."
                  });
                  setGeneratedImage(null);
                }}
              />
            </div>
            <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Generated with {selectedModel.displayName} model
            </p>
          </div>
        )}
      </div>
    </div>
  );
}