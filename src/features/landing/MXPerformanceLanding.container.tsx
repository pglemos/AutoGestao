import { LANDING_CSS } from './data/landing-css'
import { useLandingEffects } from './hooks/useLandingEffects'
import { LandingErrorBoundary } from './components/LandingErrorBoundary'
import { TopBarSection } from './sections/TopBarSection'
import { HeroSection } from './sections/HeroSection'
import { MarqueeBand } from './sections/MarqueeBand'
import { ProofSection } from './sections/ProofSection'
import { ProblemSection } from './sections/ProblemSection'
import { SistemaSection } from './sections/SistemaSection'
import { QuoteSection } from './sections/QuoteSection'
import { ParticleBandSection } from './sections/ParticleBandSection'
import { PublicosSection } from './sections/PublicosSection'
import { JourneySection } from './sections/JourneySection'
import { ModulosSection } from './sections/ModulosSection'
import { ConsultoriaSection } from './sections/ConsultoriaSection'
import { FAQSection } from './sections/FAQSection'
import { CTASection } from './sections/CTASection'
import { FooterSection } from './sections/FooterSection'

/**
 * Container da landing pública MXPerformance.
 *
 * Story 2.1 — PILOTO UX-001. Orquestra sections e efeitos:
 * - CSS inline preservado (visual baseline).
 * - useLandingEffects expõe refs e gerencia DOM observers + scripts.
 * - LandingErrorBoundary isola falhas por section (AC4).
 *
 * Ver ADR-0050 para o pattern completo.
 */
export function MXPerformanceLanding() {
  const { cursorRef, progRef, topbarRef, consoleRef, heroVapourRef, particleStageRef } =
    useLandingEffects()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div ref={cursorRef} className="mxp-cursor" />
      <div ref={progRef} className="mxp-scroll-progress" />

      <main className="mxp-root">
        <LandingErrorBoundary sectionName="TopBar">
          <TopBarSection topbarRef={topbarRef} />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Hero">
          <HeroSection heroVapourRef={heroVapourRef} consoleRef={consoleRef} />
        </LandingErrorBoundary>

        <MarqueeBand variant="main" />

        <LandingErrorBoundary sectionName="Proof">
          <ProofSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Problem">
          <ProblemSection />
        </LandingErrorBoundary>

        <MarqueeBand variant="micro" />

        <LandingErrorBoundary sectionName="Sistema">
          <SistemaSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Quote">
          <QuoteSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="ParticleBand">
          <ParticleBandSection particleStageRef={particleStageRef} />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Publicos">
          <PublicosSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Journey">
          <JourneySection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Modulos">
          <ModulosSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Consultoria">
          <ConsultoriaSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="FAQ">
          <FAQSection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="CTA">
          <CTASection />
        </LandingErrorBoundary>

        <LandingErrorBoundary sectionName="Footer">
          <FooterSection />
        </LandingErrorBoundary>
      </main>
    </>
  )
}

export default MXPerformanceLanding
