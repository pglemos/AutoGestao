/**
 * Integração Vercel Web Analytics + Speed Insights.
 *
 * Ambos são incluídos no plano Hobby. Montados uma única vez, no topo da app.
 *
 * Privacidade: `beforeSend` do Analytics remove querystring das URLs, para que
 * nenhum identificador pessoal presente em link chegue ao painel.
 */

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { getEnvironment } from './release'

type AnalyticsMode = 'auto' | 'development' | 'production'

function resolveMode(): AnalyticsMode {
    return getEnvironment() === 'development' ? 'development' : 'production'
}

/** Remove querystring e fragmento, preservando o path para agrupamento. */
function stripQuery(url: string): string {
    const queryIndex = url.search(/[?#]/)
    return queryIndex === -1 ? url : url.slice(0, queryIndex)
}

export function VercelObservability(): React.ReactElement {
    const mode = resolveMode()
    return (
        <>
            <Analytics
                mode={mode}
                beforeSend={(event) => ({ ...event, url: stripQuery(event.url) })}
            />
            <SpeedInsights
                // 100% das rotas — sem redução antecipada de amostragem (§8.2).
                sampleRate={1}
                beforeSend={(data) => ({ ...data, url: stripQuery(data.url) })}
            />
        </>
    )
}

export default VercelObservability
