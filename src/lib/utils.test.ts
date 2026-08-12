import { describe, it, expect } from 'bun:test'
import { cn, getPreRegistrationLink, slugify, toCamelCase, toSnakeCase } from './utils'

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('bg-status-error', 'bg-[#00A89D]')).toBe('bg-[#00A89D]')
  })

  it('should handle arrays and objects', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
    expect(cn({ class1: true, class2: false })).toBe('class1')
    expect(cn([{ class1: true }, 'class2'])).toBe('class1 class2')
  })

  it('should handle complex combinations', () => {
    expect(cn('base-class', [
      'conditional',
      { 'active': true, 'disabled': false }
    ], 'extra')).toBe('base-class conditional active extra')
  })

  it('should handle undefined and null values', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('slugify utility', () => {
  it('should preserve readable store slugs when names have accents', () => {
    expect(slugify('PISCAR VEÍCULOS')).toBe('piscar-veiculos')
    expect(slugify('OTÁVIO LAGE')).toBe('otavio-lage')
    expect(slugify('BEDIM AUTOMÓVEIS')).toBe('bedim-automoveis')
  })

  it('should collapse separators and trim generated slugs', () => {
    expect(slugify('  InvestCar MG / RJ  ')).toBe('investcar-mg-rj')
  })
})

describe('public link utilities', () => {
  it('should generate absolute pre-registration links with normalized store slugs', () => {
    const link = getPreRegistrationLink('PISCAR VEÍCULOS')
    expect(link).toEndWith('/pre-cadastro/piscar-veiculos')
    expect(link.startsWith('http')).toBe(true)
  })
})


describe('toCamelCase utility', () => {
  it('should return primitive values unchanged', () => {
    expect(toCamelCase(null)).toBeNull()
    expect(toCamelCase(undefined)).toBeUndefined()
    expect(toCamelCase(123)).toBe(123)
    expect(toCamelCase('string_value')).toBe('string_value')
    expect(toCamelCase(true)).toBe(true)
  })

  it('should convert snake_case keys to camelCase', () => {
    expect(toCamelCase({ first_name: 'John', last_name: 'Doe' })).toEqual({ firstName: 'John', lastName: 'Doe' })
  })

  it('should convert kebab-case keys to camelCase', () => {
    expect(toCamelCase({ 'first-name': 'John', 'last-name': 'Doe' })).toEqual({ firstName: 'John', lastName: 'Doe' })
  })

  it('should handle nested objects', () => {
    const input = {
      user_profile: {
        first_name: 'John',
        address_info: {
          zip_code: '12345'
        }
      }
    }
    const expected = {
      userProfile: {
        firstName: 'John',
        addressInfo: {
          zipCode: '12345'
        }
      }
    }
    expect(toCamelCase(input)).toEqual(expected)
  })

  it('should handle arrays', () => {
    const input = [
      { first_name: 'John' },
      { last_name: 'Doe' }
    ]
    const expected = [
      { firstName: 'John' },
      { lastName: 'Doe' }
    ]
    expect(toCamelCase(input)).toEqual(expected)
  })

  it('should handle mixed arrays and nested objects', () => {
    const input = {
      user_list: [
        { user_details: { first_name: 'John' } },
        'simple_string',
        null
      ]
    }
    const expected = {
      userList: [
        { userDetails: { firstName: 'John' } },
        'simple_string',
        null
      ]
    }
    expect(toCamelCase(input)).toEqual(expected)
  })
})

describe('toSnakeCase utility', () => {
  it('should return primitive values unchanged', () => {
    expect(toSnakeCase(null)).toBeNull()
    expect(toSnakeCase(undefined)).toBeUndefined()
    expect(toSnakeCase(123)).toBe(123)
    expect(toSnakeCase('stringValue')).toBe('stringValue')
    expect(toSnakeCase(true)).toBe(true)
  })

  it('should convert camelCase keys to snake_case', () => {
    expect(toSnakeCase({ firstName: 'John', lastName: 'Doe' })).toEqual({ first_name: 'John', last_name: 'Doe' })
  })

  it('should handle nested objects', () => {
    const input = {
      userProfile: {
        firstName: 'John',
        addressInfo: {
          zipCode: '12345'
        }
      }
    }
    const expected = {
      user_profile: {
        first_name: 'John',
        address_info: {
          zip_code: '12345'
        }
      }
    }
    expect(toSnakeCase(input)).toEqual(expected)
  })

  it('should handle arrays', () => {
    const input = [
      { firstName: 'John' },
      { lastName: 'Doe' }
    ]
    const expected = [
      { first_name: 'John' },
      { last_name: 'Doe' }
    ]
    expect(toSnakeCase(input)).toEqual(expected)
  })

  it('should handle mixed arrays and nested objects', () => {
    const input = {
      userList: [
        { userDetails: { firstName: 'John' } },
        'simpleString',
        null
      ]
    }
    const expected = {
      user_list: [
        { user_details: { first_name: 'John' } },
        'simpleString',
        null
      ]
    }
    expect(toSnakeCase(input)).toEqual(expected)
  })
})
