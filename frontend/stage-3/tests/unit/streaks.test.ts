import { describe, it, expect } from 'vitest'
import { calculateCurrentStreak } from '@/lib/streaks'

/* MENTOR_TRACE_STAGE3_HABIT_A91 */

describe('calculateCurrentStreak', () => {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const twoDaysAgo = (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 2)
    return d.toISOString().slice(0, 10)
  })()

  it('returns 0 when completions is empty', () => {
    expect(calculateCurrentStreak([], today)).toBe(0)
  })

  it('returns 0 when today is not completed', () => {
    expect(calculateCurrentStreak([yesterday], today)).toBe(0)
    expect(calculateCurrentStreak([twoDaysAgo], today)).toBe(0)
  })

  it('returns the correct streak for consecutive completed days', () => {
    expect(calculateCurrentStreak([today], today)).toBe(1)
    expect(calculateCurrentStreak([today, yesterday], today)).toBe(2)
    expect(calculateCurrentStreak([today, yesterday, twoDaysAgo], today)).toBe(3)
  })

  it('ignores duplicate completion dates', () => {
    expect(calculateCurrentStreak([today, today, today], today)).toBe(1)
    expect(calculateCurrentStreak([today, today, yesterday], today)).toBe(2)
  })

  it('breaks the streak when a calendar day is missing', () => {
    expect(calculateCurrentStreak([today, twoDaysAgo], today)).toBe(1)
    expect(calculateCurrentStreak([today, twoDaysAgo, yesterday.replace(yesterday, twoDaysAgo)], today)).toBe(1)
  })
})
