declare module 'qz-tray' {
  const qz: {
    websocket: {
      isActive: () => boolean;
      connect: (cfg?: { retries?: number; delay?: number }) => Promise<void>;
      disconnect: () => Promise<void>;
    };
    printers: {
      find: (query?: string) => Promise<string[]>;
      getDefault: () => Promise<string>;
    };
    configs: {
      create: (printer: string | null, opts?: Record<string, unknown>) => unknown;
    };
    print: (config: unknown, data: unknown[]) => Promise<void>;
    security: {
      setCertificatePromise: (fn: (resolve: (v: string) => void, reject: (e: Error) => void) => void) => void;
      setSignaturePromise: (fn: (toSign: string) => (resolve: (v: string) => void, reject: (e: Error) => void) => void) => void;
    };
  };
  export default qz;
}
