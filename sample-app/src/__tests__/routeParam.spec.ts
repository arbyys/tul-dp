import { describe, expect, it } from 'vitest'
import { routeParamToString } from '../utils/routeParam'

describe('routeParamToString', () => {
  it('returns a plain string value', () => {
    expect(routeParamToString('abc')).toBe('abc')
  })

  it('returns null for an empty string', () => {
    expect(routeParamToString('')).toBe(null)
  })

  it('returns the first element of a non-empty array', () => {
    expect(routeParamToString(['a', 'b', 'c'])).toBe('a')
  })

  it('returns null for an empty array', () => {
    expect(routeParamToString([])).toBe(null)
  })

  it('returns null for an array whose first element is an empty string', () => {
    expect(routeParamToString(['', 'b'])).toBe(null)
  })

  it('returns null for a number', () => {
    expect(routeParamToString(42)).toBe(null)
  })

  it('returns null for null', () => {
    expect(routeParamToString(null)).toBe(null)
  })

  it('returns null for undefined', () => {
    expect(routeParamToString(undefined)).toBe(null)
  })

  it('returns null for an object', () => {
    expect(routeParamToString({ id: 'x' })).toBe(null)
  })
})
