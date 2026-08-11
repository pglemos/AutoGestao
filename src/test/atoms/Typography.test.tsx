import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Typography } from '@/components/atoms/Typography'

afterEach(() => {
  cleanup()
})

describe('Typography Atom', () => {
  test('uses the canonical semantic typography presets', () => {
    render(
      <div>
        <Typography variant="h1">Title</Typography>
        <Typography variant="h2">Subtitle</Typography>
        <Typography variant="h3">Card title</Typography>
        <Typography variant="h4">Small heading</Typography>
        <Typography variant="p">Body copy</Typography>
        <Typography variant="caption">Caption</Typography>
        <Typography variant="tiny">Tiny</Typography>
      </div>,
    )

    expect(screen.getByText('Title').className).toContain('text-h1')
    expect(screen.getByText('Subtitle').className).toContain('text-h2')
    expect(screen.getByText('Card title').className).toContain('text-h3')
    expect(screen.getByText('Small heading').className).toContain('text-h4')
    expect(screen.getByText('Body copy').className).toContain('text-body-sm')
    expect(screen.getByText('Caption').className).toContain('text-caption')
    expect(screen.getByText('Tiny').className).toContain('text-caption')
  })
})
