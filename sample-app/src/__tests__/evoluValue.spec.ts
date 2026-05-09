import { describe, expect, it } from 'vitest'
import {
  toNonEmpty100,
  toNonEmpty1000,
  toNullableNonEmpty100,
  toNullableString1000,
} from '../utils/evoluValue'

describe('toNonEmpty100', () => {
  it('returns the trimmed value', () => {
    expect(toNonEmpty100('hello')).toBe('hello')
    expect(toNonEmpty100('  hello  ')).toBe('hello')
  })

  it('throws for an empty string', () => {
    expect(() => toNonEmpty100('')).toThrow()
  })

  it('throws for a whitespace-only string', () => {
    expect(() => toNonEmpty100('   ')).toThrow()
  })

  it('throws for a string longer than 100 characters', () => {
    expect(() => toNonEmpty100('a'.repeat(101))).toThrow()
  })

  it('accepts exactly 100 characters', () => {
    expect(() => toNonEmpty100('a'.repeat(100))).not.toThrow()
  })
})

describe('toNullableNonEmpty100', () => {
  it('returns the trimmed value for a non-empty string', () => {
    expect(toNullableNonEmpty100('hello')).toBe('hello')
    expect(toNullableNonEmpty100('  hi  ')).toBe('hi')
  })

  it('returns null for null', () => {
    expect(toNullableNonEmpty100(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(toNullableNonEmpty100(undefined)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(toNullableNonEmpty100('')).toBeNull()
  })

  it('returns null for a whitespace-only string', () => {
    expect(toNullableNonEmpty100('   ')).toBeNull()
  })

  it('throws for a string longer than 100 characters', () => {
    expect(() => toNullableNonEmpty100('a'.repeat(101))).toThrow()
  })
})

describe('toNonEmpty1000', () => {
  it('returns the trimmed value', () => {
    expect(toNonEmpty1000('hello')).toBe('hello')
  })

  it('throws for an empty string', () => {
    expect(() => toNonEmpty1000('')).toThrow()
  })

  it('accepts up to 1000 characters', () => {
    expect(() => toNonEmpty1000('a'.repeat(1000))).not.toThrow()
  })

  it('throws for more than 1000 characters', () => {
    expect(() => toNonEmpty1000('a'.repeat(1001))).toThrow()
  })
})

describe('toNullableString1000', () => {
  it('returns the trimmed value for a non-empty string', () => {
    expect(toNullableString1000('hello')).toBe('hello')
  })

  it('returns null for null', () => {
    expect(toNullableString1000(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(toNullableString1000(undefined)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(toNullableString1000('')).toBeNull()
  })

  it('accepts up to 1000 characters', () => {
    expect(() => toNullableString1000('a'.repeat(1000))).not.toThrow()
  })
})
