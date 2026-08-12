import { getServerRelease } from '../src/lib/observability/server-release'

const RELEASE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    'Content-Type': 'text/plain; charset=utf-8',
}

function release(request: Request): Response {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                ...RELEASE_HEADERS,
                Allow: 'GET, HEAD, OPTIONS',
            },
        })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return Response.json(
            { status: 'error', error_code: 'method_not_allowed' },
            {
                status: 405,
                headers: {
                    ...RELEASE_HEADERS,
                    Allow: 'GET, HEAD, OPTIONS',
                    'Content-Type': 'application/json; charset=utf-8',
                },
            },
        )
    }

    const value = getServerRelease()
    return new Response(request.method === 'HEAD' ? null : value, {
        status: 200,
        headers: {
            ...RELEASE_HEADERS,
            'X-Release': value,
        },
    })
}

export default {
    fetch: release,
}
