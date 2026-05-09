import { describe, expect, it } from 'vitest'
import {
  findRoomCatalogEntry,
  getBuildingLabel,
  normalizeRoomInput,
  sortBuildingCodes,
} from '../data/roomCatalog'

describe('getBuildingLabel', () => {
  it('returns "Budova X" for a known building code', () => {
    expect(getBuildingLabel('A')).toBe('Budova A')
    expect(getBuildingLabel('G')).toBe('Budova G')
  })

  it('is case-insensitive', () => {
    expect(getBuildingLabel('a')).toBe('Budova A')
    expect(getBuildingLabel('kh')).toBe('Budova KH')
  })

  it('returns the raw code for an unknown building', () => {
    expect(getBuildingLabel('ZZZ')).toBe('ZZZ')
  })

  it('returns "Nezařazené" for null', () => {
    expect(getBuildingLabel(null)).toBe('Nezařazené')
  })

  it('returns "Nezařazené" for undefined', () => {
    expect(getBuildingLabel(undefined)).toBe('Nezařazené')
  })

  it('returns "Nezařazené" for empty string', () => {
    expect(getBuildingLabel('')).toBe('Nezařazené')
  })
})

describe('sortBuildingCodes', () => {
  it('sorts by catalog order', () => {
    const result = sortBuildingCodes(['G', 'A', 'B'])
    expect(result).toEqual(['A', 'B', 'G'])
  })

  it('puts known codes before unknown codes', () => {
    const result = sortBuildingCodes(['ZZZ', 'A', 'B'])
    expect(result[0]).toBe('A')
    expect(result[1]).toBe('B')
    expect(result[2]).toBe('ZZZ')
  })

  it('returns a new array (does not mutate)', () => {
    const input = ['G', 'A']
    const result = sortBuildingCodes(input)
    expect(result).not.toBe(input)
    expect(input).toEqual(['G', 'A'])
  })

  it('handles an empty array', () => {
    expect(sortBuildingCodes([])).toEqual([])
  })

  it('handles a single element', () => {
    expect(sortBuildingCodes(['B'])).toEqual(['B'])
  })
})

describe('normalizeRoomInput', () => {
  it('strips the building prefix from the input', () => {
    expect(normalizeRoomInput('A', 'A-A001')).toBe('A001')
    expect(normalizeRoomInput('KH', 'KH-101')).toBe('101')
  })

  it('is case-insensitive for the prefix', () => {
    expect(normalizeRoomInput('A', 'a-A001')).toBe('A001')
  })

  it('returns the trimmed input when there is no prefix', () => {
    expect(normalizeRoomInput('A', 'A001')).toBe('A001')
    expect(normalizeRoomInput('A', '  A001  ')).toBe('A001')
  })

  it('returns trimmed input when building code is null', () => {
    expect(normalizeRoomInput(null, ' A001 ')).toBe('A001')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeRoomInput('A', '')).toBe('')
  })
})

describe('findRoomCatalogEntry', () => {
  it('finds an entry by room code', () => {
    const entry = findRoomCatalogEntry('A', 'A001')
    expect(entry).not.toBeNull()
    expect(entry?.roomCode).toBe('A001')
    expect(entry?.buildingCode).toBe('A')
  })

  it('finds an entry when the full code with prefix is given', () => {
    const entry = findRoomCatalogEntry('A', 'A-A001')
    expect(entry?.roomCode).toBe('A001')
  })

  it('is case-insensitive', () => {
    const entry = findRoomCatalogEntry('a', 'a001')
    expect(entry?.roomCode).toBe('A001')
  })

  it('returns null for an unknown room code', () => {
    expect(findRoomCatalogEntry('A', 'ZZZZ')).toBeNull()
  })

  it('returns null for null building code', () => {
    expect(findRoomCatalogEntry(null, 'A001')).toBeNull()
  })

  it('returns null for null room code', () => {
    expect(findRoomCatalogEntry('A', null)).toBeNull()
  })

  it('returns null for empty room code', () => {
    expect(findRoomCatalogEntry('A', '')).toBeNull()
  })
})
