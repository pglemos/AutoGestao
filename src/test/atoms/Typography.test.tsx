import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Typography } from '@/components/atoms/Typography'

afterEach(() => {
  cleanup()
})

describe('Typography Atom', () => {
  test('uses weights aligned to the approved Base44 typography (h1/h2 font-bold, h3/h4 font-semibold)', () => {
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

    // h1 passou de font-black para font-bold: o peso 900 era do visual legado
    // do MX; o aprovado (Base44/Dono) usa 700.
    expect(screen.getByText('Title').className).toContain('font-bold')
    expect(screen.getByText('Subtitle').className).toContain('font-bold')
    expect(screen.getByText('Card title').className).toContain('font-semibold')
    expect(screen.getByText('Small heading').className).toContain('font-semibold')
    expect(screen.getByText('Body copy').className).toContain('font-normal')
    expect(screen.getByText('Caption').className).toContain('font-medium')
    expect(screen.getByText('Tiny').className).toContain('font-medium')
  })
})
