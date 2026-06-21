export {};

declare global {
  type DesktopUpdateStatus =
    | 'checking'
    | 'available'
    | 'downloading'
    | 'ready'
    | 'idle'
    | 'error';

  interface Window {
    electronAPI?: {
      isDesktop: boolean;
      platform: string;
      onUpdateStatus?: (
        callback: (payload: { status: DesktopUpdateStatus; detail?: string | number }) => void,
      ) => () => void;
      checkForUpdates?: () => Promise<unknown>;
      getAppVersion?: () => Promise<string>;
    };
  }
}
