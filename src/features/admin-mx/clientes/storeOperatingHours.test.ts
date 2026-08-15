import { describe, expect, test } from 'bun:test'
import {
  buildDefaultOperatingHours,
  mapHoursToEditor,
  summarizeOperatingHours,
  validateOperatingHours,
  DEFAULT_MX_HOURS,
} from './storeOperatingHours'

describe('horários de funcionamento — lógica pura', () => {
  test('padrão MX abre seg a sáb e fecha domingo', () => {
    const map = buildDefaultOperatingHours()
    expect(map.monday.is_open).toBe(true)
    expect(map.saturday.is_open).toBe(true)
    expect(map.sunday.is_open).toBe(false)
    expect(DEFAULT_MX_HOURS).toHaveLength(7)
  })

  test('mapHoursToEditor preserva registros do banco e usa padrão para o resto', () => {
    const map = mapHoursToEditor([{ day_of_week: 'monday', is_open: true, opening_time: '09:00', closing_time: '17:00' }])
    expect(map.monday.opening_time).toBe('09:00')
    expect(map.tuesday.is_open).toBe(true)
    expect(map.tuesday.opening_time).toBe('08:00')
  })

  test('summarizeOperatingHours comprime a semana', () => {
    const map = buildDefaultOperatingHours()
    expect(summarizeOperatingHours(map)).toBe('Seg a Sáb · 08:00 às 18:00')
  })

  test('valida dia sem horário e fechamento anterior à abertura', () => {
    const map = buildDefaultOperatingHours()
    expect(validateOperatingHours(map)).toBe('')
    map.monday = { ...map.monday, opening_time: '', closing_time: '' }
    expect(validateOperatingHours(map)).toContain('Segunda-feira')
    map.monday = { ...map.monday, opening_time: '18:00', closing_time: '08:00' }
    expect(validateOperatingHours(map)).toContain('Segunda-feira')
  })

  test('recusa semana inteira fechada', () => {
    const map = buildDefaultOperatingHours()
    for (const day of Object.keys(map)) {
      map[day as keyof typeof map].is_open = false
    }
    expect(validateOperatingHours(map)).toBe('Defina pelo menos um dia aberto.')
  })
})
