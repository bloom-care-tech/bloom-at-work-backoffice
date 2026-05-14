import * as Sentry from '@sentry/react';

export function initClientSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof dsn !== 'string' || !dsn.trim()) {
    return;
  }
  const rel = import.meta.env.VITE_SENTRY_RELEASE;
  const release =
    typeof rel === 'string' && rel.trim().length > 0 ? rel.trim() : undefined;
  Sentry.init({
    dsn: dsn.trim(),
    environment: import.meta.env.MODE,
    release,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.05,
  });
}

export function ClientErrorFallback() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Algo correu mal</h1>
      <p>Atualize a página. Se o problema continuar, contacte o suporte.</p>
    </div>
  );
}
