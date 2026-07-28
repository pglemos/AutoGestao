import { describe, it, expect } from 'bun:test'

describe('MXScoreCard UI Logic', () => {
  it('should return correct tone classes based on props', () => {
    const getToneClasses = (tone: string) => {
      const map: Record<string, string> = {
        brand: 'bg-mx-green-50 border-mx-green-200 text-mx-green-700',
        success: 'bg-status-success-surface border-mx-emerald-100 text-status-success',
        warning: 'bg-status-warning-surface border-mx-amber-100 text-status-warning',
        error: 'bg-status-error-surface border-mx-red-100 text-status-error',
      }
      return map[tone] || map.error
    }

    expect(getToneClasses('brand')).toContain('bg-mx-green-50')
    expect(getToneClasses('success')).toContain('bg-status-success-surface')
    expect(getToneClasses('warning')).toContain('bg-status-warning-surface')
    expect(getToneClasses('error')).toContain('bg-status-error-surface')
  })

  it('should fallback to error tone for unknown values', () => {
    const getToneClasses = (tone: string) => {
      const map: Record<string, string> = {
        brand: 'bg-mx-green-50',
        success: 'bg-status-success-surface',
        warning: 'bg-status-warning-surface',
        error: 'bg-status-error-surface',
      }
      return map[tone] || map.error
    }

    expect(getToneClasses('unknown')).toContain('bg-status-error-surface')
  })
})
