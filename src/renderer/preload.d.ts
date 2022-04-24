declare global {
  interface Window {
      ipcRenderer: {
        myPing(): void;
        on(
          channel: string,
          func: (...args: unknown[]) => void
        ): (() => void) | undefined;
        once(channel: string, func: (...args: unknown[]) => void): void;
        send(channel: string, ...args: unknown[]): void;
        removeListener(channel: string, func: (...args: unknown[]) => void): void;
      };
    };
  
}

export {};
