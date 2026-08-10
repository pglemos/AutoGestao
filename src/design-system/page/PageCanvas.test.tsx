import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageCanvas } from './PageCanvas'

describe('PageCanvas', () => {
  it('renders default main landmark with dashboard width and lateral safe area styles', () => {
    render(<PageCanvas id="test-canvas"><p>Content</p></PageCanvas>)

    const main = screen.getByRole('main')
    expect(main.id).toBe('test-canvas')
    expect(main.getAttribute('data-mx-page-canvas')).toBe('')
    expect(main.getAttribute('data-mx-page-width')).toBe('dashboard')
    expect(main.getAttribute('data-mx-page-clearance')).toBe('none')

    expect(main.style.maxWidth).toBe('var(--mx-page-width-dashboard)')
    expect(main.style.paddingInlineStart).toBe(
      'max(var(--mx-page-margin), env(safe-area-inset-left, 0px))',
    )
    expect(main.style.paddingInlineEnd).toBe(
      'max(var(--mx-page-margin), env(safe-area-inset-right, 0px))',
    )
  })

  it('supports custom semantic widths and clearance values', () => {
    render(
      <PageCanvas width="form" bottomClearance="actions" as="section">
        <p>Form Content</p>
      </PageCanvas>,
    )

    const section = screen.getByText('Form Content').parentElement
    expect(section?.tagName.toLowerCase()).toBe('section')
    expect(section?.getAttribute('data-mx-page-width')).toBe('form')
    expect(section?.getAttribute('data-mx-page-clearance')).toBe('actions')
    expect(section?.style.maxWidth).toBe('var(--mx-page-width-form)')
  })
})
