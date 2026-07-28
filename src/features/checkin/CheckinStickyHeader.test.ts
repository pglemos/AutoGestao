import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const checkinContainerSource = readFileSync(new URL('./Checkin.container.tsx', import.meta.url), 'utf8')
const checkinHeaderSource = readFileSync(new URL('./sections/CheckinHeader.tsx', import.meta.url), 'utf8')
const checkinFormSource = readFileSync(new URL('./sections/CheckinForm.tsx', import.meta.url), 'utf8')
const checkinCrmSource = readFileSync(new URL('./sections/CheckinCrmSection.tsx', import.meta.url), 'utf8')
const checkinHookSource = readFileSync(new URL('./hooks/useCheckinPage.ts', import.meta.url), 'utf8')
const sidebarShellSource = readFileSync(new URL('../../components/MxSidebarShell.tsx', import.meta.url), 'utf8')

describe('Checkin sticky header layout contract', () => {
  test('keeps Fechamento Diario pinned only on desktop inside checkin scroll area', () => {
    expect(checkinHeaderSource).toContain('md:sticky md:top-0')
    expect(checkinHeaderSource).not.toContain('className="sticky top-0')
    expect(checkinHeaderSource).toContain('Fechamento')
    expect(checkinContainerSource).toContain('overflow-y-auto overscroll-contain')
    expect(checkinContainerSource).toContain("document.documentElement.style.overflow = 'hidden'")
    expect(checkinContainerSource).toContain("document.body.style.overflow = 'hidden'")
    expect(checkinContainerSource).toContain('keepDocumentScrollPinned')
    expect(checkinContainerSource).toContain("window.addEventListener('scroll', keepDocumentScrollPinned")
  })

  test('prevents the universal MX shell from scrolling the whole document', () => {
    expect(sidebarShellSource).toContain('h-[100dvh] overflow-hidden')
    expect(sidebarShellSource).toContain('pt-[calc(72px+env(safe-area-inset-top))] md:pt-0')
    expect(sidebarShellSource).toContain('h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden')
    expect(sidebarShellSource).toContain("collapsed ? 'md:pl-16' : 'md:pl-64'")
    expect(sidebarShellSource).toContain('role="dialog"')
    expect(sidebarShellSource).toContain('useFocusTrap(drawerRef, mobileOpen)')
  })

  test('keeps CRM totals as comparison while persisting only declared values', () => {
    expect(checkinHookSource).toContain('crmDailyCounters')
    expect(checkinHookSource).toContain('effectiveForm')
    expect(checkinHookSource).toContain('effectiveTotals')
    expect(checkinHookSource).toContain('...declaredForm')
    expect(checkinHookSource).toContain('hasCrmActivity')
    expect(checkinHookSource).toContain('saveCheckin(checkinPayload')
    expect(checkinFormSource).not.toContain('Observações Operacionais')
  })

  test('keeps mobile CRM readable without desktop table overflow', () => {
    expect(checkinCrmSource).toContain('className="md:hidden"')
    expect(checkinCrmSource).toContain('className="hidden max-w-full overflow-x-auto md:block"')
    expect(checkinCrmSource).toContain('Agendamento')
    expect(checkinCrmSource).toContain('Veículo')
  })

  test('uses wizard de 4 etapas without reactivating the old deadline block', () => {
    expect(checkinFormSource).toContain('<FluxoFechamento')
    expect(checkinFormSource).toContain('Nesta fase, o horário não bloqueia o envio')
  })
})
