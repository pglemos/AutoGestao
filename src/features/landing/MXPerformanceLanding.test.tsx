import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { MXPerformanceLanding } from './MXPerformanceLanding.container'

afterEach(cleanup)

describe('landing pública', () => {
  test('expõe o conteúdo principal por um único landmark main', () => {
    const { getAllByRole } = render(<MXPerformanceLanding />)

    expect(getAllByRole('main')).toHaveLength(1)
  })
})
