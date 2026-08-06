import { describe, expect, test } from 'bun:test'
import { generateStrongTemporaryPassword, isStrongPassword } from './passwordPolicy'

describe('password policy helpers', () => {
  test('requires 8+ characters with upper, lower and number', () => {
    expect(isStrongPassword('12345')).toBe(false)
    expect(isStrongPassword('123456')).toBe(false)
    expect(isStrongPassword('12345678')).toBe(false)
    expect(isStrongPassword('abcdefgh')).toBe(false)
    expect(isStrongPassword('ABCDEFGH')).toBe(false)
    expect(isStrongPassword('Senha123')).toBe(true)
    expect(isStrongPassword('mx!Gestao#2026')).toBe(true)
  })

  test('generates compliant temporary passwords', () => {
    for (let index = 0; index < 20; index += 1) {
      const password = generateStrongTemporaryPassword()
      expect(password.length).toBeGreaterThanOrEqual(8)
      expect(isStrongPassword(password)).toBe(true)
    }
  })
})
