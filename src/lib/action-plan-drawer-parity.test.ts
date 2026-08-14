import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  getExecutionQuickActions,
  shouldShowProgressEditor,
} from '../components/owner/actionplan/actionPlanUiUtils.js'

describe('action drawer execution actions', () => {
  it('keeps select menus above the dialog overlay so form choices are clickable', () => {
    const selectSource = readFileSync(resolve(import.meta.dir, '../components/ui/select.jsx'), 'utf8')
    expect(selectSource).toContain('z-[var(--mx-z-popover)]')
  })

  it('keeps progress, block and unblock out of the shared action group', () => {
    expect(getExecutionQuickActions('in_progress').map((action) => action.value)).toEqual([
      'delegate',
      'submitValidation',
    ])
    expect(getExecutionQuickActions('blocked').map((action) => action.value)).toEqual([
      'delegate',
      'consultant',
    ])
  })

  it('does not expose progress editing while validation or block is active', () => {
    expect(shouldShowProgressEditor('in_progress')).toBe(true)
    expect(shouldShowProgressEditor('blocked')).toBe(false)
    expect(shouldShowProgressEditor('awaiting_validation')).toBe(false)
  })
})
