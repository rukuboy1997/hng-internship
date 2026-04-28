import { describe, it, expect, beforeEach } from 'vitest'
import { getUsers, saveUsers, getSession, saveSession, getHabits, saveHabits } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/constants'
import type { User, Session } from '@/types/auth'
import type { Habit } from '@/types/habit'

const makeUser = (id: string, email: string): User => ({
  id,
  email,
  password: 'password123',
  createdAt: new Date().toISOString(),
})

const makeHabit = (id: string, userId: string): Habit => ({
  id,
  userId,
  name: 'Exercise',
  description: 'Daily exercise',
  frequency: 'daily',
  createdAt: new Date().toISOString(),
  completions: [],
})

describe('getUsers / saveUsers', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty array when no users are stored', () => {
    expect(getUsers()).toEqual([])
  })

  it('returns stored users after saveUsers', () => {
    const users = [makeUser('u1', 'a@test.com'), makeUser('u2', 'b@test.com')]
    saveUsers(users)
    const result = getUsers()
    expect(result).toHaveLength(2)
    expect(result[0].email).toBe('a@test.com')
  })

  it('returns empty array for corrupted JSON in users storage', () => {
    localStorage.setItem(STORAGE_KEYS.USERS, 'not-json')
    expect(getUsers()).toEqual([])
  })
})

describe('getSession / saveSession', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when no session is stored', () => {
    expect(getSession()).toBeNull()
  })

  it('returns the session after saveSession', () => {
    const session: Session = { userId: 'u1', email: 'user@test.com' }
    saveSession(session)
    const result = getSession()
    expect(result).toEqual(session)
  })

  it('returns null after saving a null session', () => {
    saveSession(null)
    expect(getSession()).toBeNull()
  })

  it('returns null for corrupted JSON in session storage', () => {
    localStorage.setItem(STORAGE_KEYS.SESSION, '{bad json}')
    expect(getSession()).toBeNull()
  })
})

describe('getHabits / saveHabits', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty array when no habits are stored', () => {
    expect(getHabits()).toEqual([])
  })

  it('returns stored habits after saveHabits', () => {
    const habits = [makeHabit('h1', 'u1'), makeHabit('h2', 'u1')]
    saveHabits(habits)
    const result = getHabits()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('h1')
  })

  it('returns empty array for corrupted JSON in habits storage', () => {
    localStorage.setItem(STORAGE_KEYS.HABITS, '{{invalid}')
    expect(getHabits()).toEqual([])
  })
})
