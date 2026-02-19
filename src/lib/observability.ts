import { trackEvent } from './telemetry';

let initialized = false;

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'unknown_error';
  }
}

export function setupGlobalObservability() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    void trackEvent({
      eventName: 'frontend_error',
      page: 'global',
      metadata: {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    void trackEvent({
      eventName: 'frontend_unhandled_rejection',
      page: 'global',
      metadata: {
        reason: normalizeErrorMessage(event.reason),
      },
    });
  });
}

export function trackPageView(path: string) {
  void trackEvent({
    eventName: 'frontend_page_view',
    page: 'app',
    metadata: { path },
  });
}

export function trackRpcFailure(scope: string, action: string, error: unknown) {
  void trackEvent({
    eventName: 'frontend_rpc_error',
    page: scope,
    metadata: {
      action,
      error: normalizeErrorMessage(error),
    },
  });
}

