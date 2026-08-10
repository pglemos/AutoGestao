type ReleaseEnvironment = Record<string, string | undefined>

/**
 * Resolve one non-empty release identifier for build-time Sentry integration.
 * Vercel can expose an unset variable as an empty string, which must not be
 * forwarded to `sentry-cli --release`.
 */
export function resolveSentryRelease(env: ReleaseEnvironment): string {
  const candidates = [
    env.VITE_RELEASE,
    env.SENTRY_RELEASE,
    env.VERCEL_GIT_COMMIT_SHA,
    env.GITHUB_SHA,
  ]

  return candidates.map((value) => value?.trim()).find(Boolean) ?? 'dev'
}
