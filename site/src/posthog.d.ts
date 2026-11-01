interface Window {
  awesomeAnalytics?: {
    capture(name: string, properties?: object): void;
    exception(flow?: string, kind?: string): void;
    optOut(): void;
    isOptedOut(): boolean;
  };
  posthog?: {
    capture(eventName: string, properties?: Record<string, unknown>): void;
    captureException(error: unknown, properties?: Record<string, unknown>): void;
  };
}
