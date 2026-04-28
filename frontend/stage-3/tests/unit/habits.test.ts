import { describe, it, expect, beforeEach } from 'vitest'
import {
  toggleHabitCompletion,
  createHabit,
  updateHabit,
  deleteHabit,
  getUserHabits,
  saveHabitUpdate,
} from '@/lib/habits'
import type { Habit } from '@/types/habit'

const baseHabit: Habit = {
  id: 'habit-1',
  userId: 'user-1',
  name: 'Drink Water',
  description: 'Drink 8 glasses of water daily',
  frequency: 'daily',
  createdAt: '2024-01-01T00:00:00.000Z',
  completions: [],
}

describe('toggleHabitCompletion', () => {
  it('adds a completion date when the date is not present', () => {
    const result = toggleHabitCompletion(baseHabit, '2024-01-15')
    expect(result.completions).toContain('2024-01-15')
    expect(result.completions).toHaveLength(1)
  })

  it('removes a completion date when the date already exists', () => {
    const habit = { ...baseHabit, completions: ['2024-01-15', '2024-01-16'] }
    const result = toggleHabitCompletion(habit, '2024-01-15')
    expect(result.completions).not.toContain('2024-01-15')
    expect(result.completions).toContain('2024-01-16')
  })

  it('does not mutate the original habit object', () => {
    const habit = { ...baseHabit, completions: [] }
    toggleHabitCompletion(habit, '2024-01-15')
    expect(habit.completions).toHaveLength(0)
    expect(habit.completions).not.toContain('2024-01-15')
  })

  it('does not return duplicate completion dates', () => {
    const habit = { ...baseHabit, completions: ['2024-01-15', '2024-01-15', '2024-01-16'] }
    const result = toggleHabitCompletion(habit, '2024-01-17')
    const occurrences = result.completions.filter((d) => d === '2024-01-15').length
    expect(occurrences).toBe(1)
  })
})

describe('createHabit', () => {
  beforeEach(() => localStorage.clear())

  it('creates a habit with correct properties', () => {
    const habit = createHabit('user-1', 'Morning Run', 'Run 5km every day')
    expect(habit.userId).toBe('user-1')
    expect(habit.name).toBe('Morning Run')
    expect(habit.description).toBe('Run 5km every day')
    expect(habit.frequency).toBe('daily')
    expect(habit.completions).toEqual([])
    expect(habit.id).toBeTruthy()
    expect(habit.createdAt).toBeTruthy()
  })

  it('persists the habit so it can be retrieved by getUserHabits', () => {
    createHabit('user-1', 'Meditate', 'Ten minutes of mindfulness')
    const stored = getUserHabits('user-1')
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('Meditate')
  })

  it('does not include habits belonging to other users', () => {
    createHabit('user-1', 'Habit A', '')
    createHabit('user-2', 'Habit B', '')
    expect(getUserHabits('user-1')).toHaveLength(1)
    expect(getUserHabits('user-2')).toHaveLength(1)
  })
})

describe('updateHabit', () => {
  beforeEach(() => localStorage.clear())

  it('updates name and description for an existing habit', () => {
    const created = createHabit('user-1', 'Old Name', 'Old desc')
    const updated = updateHabit(created.id, 'New Name', 'New desc')
    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('New Name')
    expect(updated!.description).toBe('New desc')
    expect(updated!.id).toBe(created.id)
    expect(updated!.userId).toBe(created.userId)
  })

  it('returns null when the habit id does not exist', () => {
    const result = updateHabit('nonexistent-id', 'Name', 'Desc')
    expect(result).toBeNull()
  })
})

describe('deleteHabit', () => {
  beforeEach(() => localStorage.clear())

  it('removes the habit from storage', () => {
    const habit = createHabit('user-1', 'To Delete', '')
    deleteHabit(habit.id)
    expect(getUserHabits('user-1')).toHaveLength(0)
  })

  it('leaves other habits untouched', () => {
    const a = createHabit('user-1', 'Keep', '')
    const b = createHabit('user-1', 'Delete', '')
    deleteHabit(b.id)
    const remaining = getUserHabits('user-1')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(a.id)
  })
})

describe('saveHabitUpdate', () => {
  beforeEach(() => localStorage.clear())

  it('persists changes to a specific habit in storage', () => {
    const habit = createHabit('user-1', 'Original', '')
    const modified = { ...habit, name: 'Modified' }
    saveHabitUpdate(modified)
    const [stored] = getUserHabits('user-1')
    expect(stored.name).toBe('Modified')
  })

  it('does nothing when the habit id is not found', () => {
    createHabit('user-1', 'Existing', '')
    const phantom = { ...baseHabit, id: 'ghost-id', userId: 'user-1' }
    saveHabitUpdate(phantom)
    expect(getUserHabits('user-1')).toHaveLength(1)
    expect(getUserHabits('user-1')[0].name).toBe('Existing')
  })
})
