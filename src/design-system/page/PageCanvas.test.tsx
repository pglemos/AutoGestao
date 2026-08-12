import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageCanvas } from './PageCanvas'

describe('PageCanvas', () => {
  it('renders a content container with dashboard width and lateral safe area styles', () => {
    render(<PageCanvas id="test-canvas"><p>Content</p></PageCanvas>)

    const canvas = document.getElementById('test-canvas')
    expect(canvas?.tagName.toLowerCase()).toBe('div')
    expect(screen.queryByRole('main')).toBeNull()
    expect(canvas?.getAttribute('data-mx-page-canvas')).toBe('')
    expect(canvas?.getAttribute('data-mx-page-width')).toBe('dashboard')
    expect(canvas?.getAttribute('data-mx-page-clearance')).toBe('none')

    expect(canvas?.style.maxWidth).toBe('var(--mx-page-width-dashboard)')
    expect(canvas?.style.paddingInlineStart).toBe(
      'max(var(--mx-page-margin), env(safe-area-inset-left, 0px))',
    )
    expect(canvas?.style.paddingInlineEnd).toBe(
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

  it('gives a named canvas a valid region role when the consumer does not provide one', () => {
    render(<PageCanvas aria-label="Conteúdo do painel"><p>Named content</p></PageCanvas>)

    expect(screen.getByRole('region', { name: 'Conteúdo do painel' })).toBeTruthy()
  })
})
