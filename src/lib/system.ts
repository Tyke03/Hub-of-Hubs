export type SystemStats = {
  browser: {
    userAgent: string;
    platform: string;
    language: string;
    cookiesEnabled: boolean;
    onLine: boolean;
  };
  memory: {
    total?: number;
    used?: number;
  };
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    orientation: string;
  };
  performance: {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
    navigation: {
      type: string;
      redirectCount: number;
    };
  };
};

export async function getSystemStats(): Promise<SystemStats> {
  const memory = (performance as any).memory;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  return {
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    },
    memory: memory ? {
      total: memory.jsHeapSizeLimit,
      used: memory.usedJSHeapSize,
    } : undefined,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      orientation: screen.orientation.type,
    },
    performance: {
      memory: memory,
      navigation: {
        type: nav.type,
        redirectCount: nav.redirectCount,
      },
    },
  };
}

export async function getPerformanceMetrics(): Promise<string> {
  const metrics = await performance.getEntriesByType('resource');
  return metrics
    .slice(0, 10)
    .map(entry => `${entry.name.slice(0, 40).padEnd(40)} ${entry.duration.toFixed(2)}ms`)
    .join('\n');
}

export async function getVeniceModels() {
  try {
    const response = await fetch('https://api.venice.ai/api/v1/models', {
      headers: {
        'Authorization': 'Bearer g1H5MqjuRKmkscrVnh1MNwQnx2yLRWLpAx6gwWeyU0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.filter((model: any) => model.type === 'text');
  } catch (error) {
    console.error('Error fetching Venice models:', error);
    return [];
  }
}