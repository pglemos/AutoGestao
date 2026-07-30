import type { RefObject } from 'react'

type Props = {
  heroVapourRef: RefObject<HTMLSpanElement | null>
  consoleRef: RefObject<HTMLDivElement | null>
}

export function HeroSection({ heroVapourRef, consoleRef }: Props) {
  return (
    <section className="hero" aria-labelledby="hero-h">
      <div className="hero-bg" aria-hidden="true">
        <div className="grad" />
        <div className="grid" />
        <div className="glow" />
        <div className="scanline" />
      </div>
      <div className="wrap">
        <div className="hero-grid">
          <div data-reveal>
            <h1 id="hero-h" className="hero-title">
              <span className="mask">
                <span>Tire a loja do</span>
              </span>
              <span className="mask vapour-line">
                <span
                  ref={heroVapourRef}
                  id="hero-vapour"
                  className="vapour-host"
                >
                  improviso.
                </span>
              </span>
            </h1>
            <p className="hero-sub" data-reveal data-reveal-delay="3">
              MX Performance é o <b>sistema operacional</b> que conecta Fechamento Diário, metas, ranking,
              funil, devolutivas, PDI, treinamentos, agenda e consultoria — em um único ambiente. Menos
              achismo. Menos planilha. <b>Mais rotina, dados e cobrança inteligente.</b>
            </p>
            <div className="hero-ctas" data-reveal data-reveal-delay="4">
              <a className="btn btn-primary" href="#cta">
                Quero implantar a rotina MX <span className="arrow">→</span>
              </a>
              <a className="btn btn-ghost" href="#sistema">
                Ver o sistema em ação <span className="arrow">↓</span>
              </a>
            </div>
            <div className="hero-strip" data-reveal data-reveal-delay="5">
              <div className="strip-cell">
                <div className="strip-num">D-1<span>/D-0</span></div>
                <div className="strip-lab">Lógica de lançamento</div>
              </div>
              <div className="strip-cell">
                <div className="strip-num">09:30<span>·45</span></div>
                <div className="strip-lab">Janela operacional</div>
              </div>
              <div className="strip-cell">
                <div className="strip-num">3<span>perfis</span></div>
                <div className="strip-lab">Dono · Gerente · Vendedor</div>
              </div>
              <div className="strip-cell">
                <div className="strip-num">1<span>plataforma</span></div>
                <div className="strip-lab">Comercial + consultoria</div>
              </div>
            </div>
          </div>

          <div className="console" ref={consoleRef} aria-hidden="true" data-reveal data-reveal-delay="2">
            <div className="console-bar">
              <div className="dots"><i /><i /><i /></div>
              <div className="title">Painel da Loja · <b>Unidade 014 — Centro</b></div>
              <div className="live"><span className="dot" />ao vivo</div>
            </div>
            <div className="console-body">
              <div className="kpi">
                <div className="kpi-h">
                  <span className="l">Vendas / Mês</span>
                  <span className="t">+12.4%</span>
                </div>
                <div className="kpi-v" data-counter="187">0<small>/220</small></div>
                <div className="kpi-bar"><i style={{ width: '85%' }} /></div>
                <div className="kpi-foot"><span>Atingimento 85%</span><span>Gap 33</span></div>
              </div>
              <div className="kpi">
                <div className="kpi-h">
                  <span className="l">Projeção</span>
                  <span className="t">on-pace</span>
                </div>
                <div className="kpi-v" data-counter="214">0<small>uni</small></div>
                <div className="kpi-bar">
                  <i style={{ width: '97%', background: 'linear-gradient(90deg,var(--warn),var(--mx))' }} />
                </div>
                <div className="kpi-foot"><span>Dias úteis</span><span>4 restantes</span></div>
              </div>
              <div className="kpi full">
                <div className="kpi-h">
                  <span className="l">Funil — método MX</span>
                  <span className="t">diagnóstico ›</span>
                </div>
                <div className="funnel">
                  <div className="step">
                    <div className="l">Leads</div>
                    <div className="v" data-counter="1284">0</div>
                    <div className="conv">→ 38%</div>
                  </div>
                  <div className="step warn">
                    <div className="l">Agendam.</div>
                    <div className="v" data-counter="488">0</div>
                    <div className="conv">→ 61%</div>
                  </div>
                  <div className="step">
                    <div className="l">Visitas</div>
                    <div className="v" data-counter="298">0</div>
                    <div className="conv">→ 63%</div>
                  </div>
                  <div className="step">
                    <div className="l">Vendas</div>
                    <div className="v" data-counter="187">0</div>
                    <div className="conv">⌀ 14.6%</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="ticker">
              <div className="ticker-track">
                <span><b>09:14</b> Vendedor 03 lançou D-1</span>
                <span><b>09:18</b> Carteira +12 agendamentos</span>
                <span><b>09:22</b> Gargalo: agend → visita</span>
                <span><b>09:26</b> Devolutiva enviada · R. Almeida</span>
                <span><b>09:31</b> Janela de lançamento encerrada</span>
                <span><b>09:14</b> Vendedor 03 lançou D-1</span>
                <span><b>09:18</b> Carteira +12 agendamentos</span>
                <span><b>09:22</b> Gargalo: agend → visita</span>
                <span><b>09:26</b> Devolutiva enviada · R. Almeida</span>
                <span><b>09:31</b> Janela de lançamento encerrada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <span className="line" />
      </div>
    </section>
  )
}
