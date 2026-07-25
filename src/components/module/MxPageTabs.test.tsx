import React from 'react'
import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MxPageTabs } from './MxPageTabs'

afterEach(cleanup)

const items = [
  { key: 'perfil', label: 'Perfil', description: 'Dados pessoais', group: 'pessoal' },
  { key: 'sistema', label: 'Sistema MX', description: 'Auditoria e logs', group: 'sistema', readOnly: true },
] as const

describe('MxPageTabs', () => {
  test('filters by label, description and group', () => {
    render(<MxPageTabs items={[...items]} activeKey="perfil" onChange={() => undefined} ariaLabel="Configurações" searchable groupLabels={{ pessoal: 'Conta pessoal', sistema: 'Sistema' }} />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'auditoria' } })
    expect(screen.queryByRole('tab', { name: /Perfil/ })).toBeNull()
    expect(screen.getByRole('tab', { name: /Sistema MX/ })).toBeTruthy()
  })

  test('announces read-only tabs and changes selection', () => {
    let selected = 'perfil'
    render(<MxPageTabs items={[...items]} activeKey="perfil" onChange={(key) => { selected = key }} ariaLabel="Configurações" />)
    const system = screen.getByRole('tab', { name: /Sistema MX/ })
    expect(system.getAttribute('data-mx-read-only')).toBe('true')
    fireEvent.click(system)
    expect(selected).toBe('sistema')
  })
})
