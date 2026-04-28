import { describe, it, expect } from 'vitest'
import { getHabitSlug } from '@/lib/slug'

describe('getHabitSlug', () => {
  it('returns lowercase hyphenated slug for a basic habit name', () => {
    expect(getHabitSlug('Drink Water')).toBe('drink-water')
    expect(getHabitSlug('Read Books')).toBe('read-books')
    expect(getHabitSlug('Exercise Daily')).toBe('exercise-daily')
  })

  it('trims outer spaces and collapses repeated internal spaces', () => {
    expect(getHabitSlug('  drink  water  ')).toBe('drink-water')
    expect(getHabitSlug('  hello   world  ')).toBe('hello-world')
    expect(getHabitSlug(' multiple   spaces   here ')).toBe('multiple-spaces-here')
  })

  it('removes non alphanumeric characters except hyphens', () => {
    expect(getHabitSlug('Drink Water!')).toBe('drink-water')
    expect(getHabitSlug('Hello, World!')).toBe('hello-world')
    expect(getHabitSlug('Run 5km Every Day')).toBe('run-5km-every-day')
    expect(getHabitSlug('Read @home')).toBe('read-home')
  })
})
