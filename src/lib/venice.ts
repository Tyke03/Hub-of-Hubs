import axios from 'axios';

const VENICE_API_KEY = 'g1H5MqjuRKmkscrVnh1MNwQnx2yLRWLpAx6gwWeyU0';
const VENICE_API_URL = 'https://api.venice.ai/api/v1';

export type VeniceTextModel = {
  id: string;
  type: string;
  displayName?: string;
  description?: string;
};

export type VeniceImageModel = {
  id: string;
  type: string;
  displayName?: string;
  description?: string;
};

export async function getVeniceTextModels(): Promise<VeniceTextModel[]> {
  try {
    const response = await axios({
      method: 'GET',
      url: `${VENICE_API_URL}/models`,
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`
      }
    });
    
    if (response.data && response.data.data) {
      return response.data.data
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
    }
    return [];
  } catch (error) {
    console.error('Error fetching Venice text models:', error);
    return [];
  }
}

export async function getVeniceImageModels(): Promise<VeniceImageModel[]> {
  try {
    const response = await axios({
      method: 'GET',
      url: `${VENICE_API_URL}/models`,
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`
      }
    });
    
    if (response.data && response.data.data) {
      return response.data.data
        .filter((model: any) => model.type === 'image')
        .map((model: any) => ({
          id: model.id,
          type: model.type,
          displayName: model.id
            .split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          description: model.model_spec?.traits?.join(', ') || 'No description available'
        }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Venice image models:', error);
    return [];
  }
}

export async function generateImage(params: {
  model: string;
  prompt: string;
  negativePrompt?: string;
  stylePreset?: string;
  cfgScale?: number;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  hideWatermark?: boolean;
}) {
  try {
    const response = await axios({
      method: 'POST',
      url: `${VENICE_API_URL}/image/generate`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENICE_API_KEY}`
      },
      data: {
        model: params.model,
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        style_preset: params.stylePreset || 'none',
        cfg_scale: params.cfgScale || 7.5,
        width: params.width || 768,
        height: params.height || 768,
        steps: params.steps || 30,
        seed: params.seed,
        hide_watermark: params.hideWatermark || false
      }
    });
    
    if (response.data && response.data.images && response.data.images.length > 0) {
      return {
        success: true,
        imageData: `data:image/png;base64,${response.data.images[0]}`,
        timing: response.data.timing
      };
    }
    
    return {
      success: false,
      error: 'No image was generated'
    };
  } catch (error: any) {
    console.error('Error generating image:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Unknown error'
    };
  }
}

export async function chatCompletion(params: {
  model: string;
  messages: Array<{role: string; content: string}>;
  maxTokens?: number;
  temperature?: number;
  includeVeniceSystemPrompt?: boolean;
}) {
  try {
    const response = await axios({
      method: 'POST',
      url: `${VENICE_API_URL}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENICE_API_KEY}`
      },
      data: {
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens || 1000,
        temperature: params.temperature || 0.7,
        venice_parameters: {
          include_venice_system_prompt: params.includeVeniceSystemPrompt ?? false
        }
      }
    });
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return {
        success: true,
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      };
    }
    
    return {
      success: false,
      error: 'No response was generated'
    };
  } catch (error: any) {
    console.error('Error in chat completion:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Unknown error'
    };
  }
}