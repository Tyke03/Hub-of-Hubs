export class WebSocketClient {
  private ws: WebSocket | null = null;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          resolve();
        };

        this.ws.onerror = (error) => {
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: string): void {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.send(data);
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(callback: (data: string) => void): void {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.onmessage = (event) => {
      callback(event.data);
    };
  }
}