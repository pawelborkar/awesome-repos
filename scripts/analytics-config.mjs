import { createHash } from 'node:crypto';
export const tokenFingerprint = token => createHash('sha256').update(token).digest('hex');
export function browserAnalyticsConfig(env, manifest) {
  const apiKey = env.PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() || '';
  const apiHost = env.PUBLIC_POSTHOG_HOST?.trim().replace(/\/+$/, '') || '';
  const production = env.PRODUCTION === 'true';
  const requested = env.ANALYTICS_ENABLED !== 'false';
  if (production && env.ANALYTICS_ENABLED === 'true' && (!apiKey || !apiHost)) {
    throw new Error('PostHog requires PUBLIC_POSTHOG_PROJECT_TOKEN and PUBLIC_POSTHOG_HOST.');
  }
  const enabled = production && requested && Boolean(apiKey && apiHost);
  // Provisioning is optional and only controls additional diagnostic products.
  const diagnosticsVerified = manifest?.controls?.verified && manifest?.target?.token_sha256 === tokenFingerprint(apiKey);
  const replayRequested = env.PUBLIC_POSTHOG_REPLAY_ENABLED === 'true' || env.REPLAY_ENABLED === 'true';
  const errorsRequested = env.PUBLIC_POSTHOG_ERRORS_ENABLED === 'true' || env.ERRORS_ENABLED === 'true';
  return {
    enabled,
    apiKey: enabled ? apiKey : '',
    apiHost, uiHost: env.PUBLIC_POSTHOG_UI_HOST || 'https://us.posthog.com',
    release: env.GITHUB_SHA || env.RELEASE_SHA || 'local',
    replayEnabled: Boolean(enabled && (replayRequested || (diagnosticsVerified && manifest?.controls?.products?.replay))),
    errorsEnabled: Boolean(enabled && (errorsRequested || (diagnosticsVerified && manifest?.controls?.products?.errors))),
    replaySampleRate: Number(env.PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE || manifest?.controls?.replay_sample_rate) || 0.1,
  };
}
