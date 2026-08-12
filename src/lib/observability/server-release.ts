type ServerEnvironment = Record<string, string | undefined>

function firstDefined(...values: Array<string | undefined>): string | undefined {
    for (const value of values) {
        if (value && value.trim().length > 0) return value.trim()
    }
    return undefined
}

/** Resolve the commit identifier exposed by server-side release probes. */
export function getServerRelease(environment: ServerEnvironment = process.env): string {
    return (
        firstDefined(
            environment.VITE_RELEASE,
            environment.VERCEL_GIT_COMMIT_SHA,
        ) ?? 'unknown'
    )
}
