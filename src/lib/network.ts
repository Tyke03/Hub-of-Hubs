import axios from 'axios';

export async function ping(host: string): Promise<string> {
  const start = performance.now();
  try {
    await fetch(`https://${host}`, { mode: 'no-cors' });
    const duration = performance.now() - start;
    return `Ping to ${host}: ${duration.toFixed(2)}ms`;
  } catch (error) {
    throw new Error(`Failed to ping ${host}: ${error}`);
  }
}

export async function curl(url: string, method = 'GET', data?: any): Promise<string> {
  try {
    const response = await axios({
      method,
      url,
      data,
      timeout: 5000
    });
    return JSON.stringify(response.data, null, 2);
  } catch (error) {
    throw new Error(`Failed to curl ${url}: ${error}`);
  }
}

export async function checkConnectivity(): Promise<string> {
  const results = [];
  results.push(`Online Status: ${navigator.onLine ? 'Connected' : 'Disconnected'}`);
  
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      results.push(`Connection Type: ${conn.effectiveType || 'Unknown'}`);
      results.push(`Downlink: ${conn.downlink || 'Unknown'} Mbps`);
      results.push(`RTT: ${conn.rtt || 'Unknown'} ms`);
    }
  }
  
  return results.join('\n');
}