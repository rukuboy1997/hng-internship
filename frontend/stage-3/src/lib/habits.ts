import type { Habit } from '@/types/habit'
import { getHabits, saveHabits } from './storage'

export function toggleHabitCompletion(habit: Habit, date: string): Habit {
  const completions = [...new Set(habit.completions)]
  const idx = completions.indexOf(date)
  if (idx === -1) {
    return { ...habit, completions: [...completions, date] }
  }
  return { ...habit, completions: completions.filter((d) => d !== date) }
}

export function createHabit(
  userId: string,
  name: string,
  description: string
): Habit {
  const habit: Habit = {
    id: crypto.randomUUID(),
    userId,
    name,
    description,
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    completions: [],
  }
  const habits = getHabits()
  saveHabits([...habits, habit])
  return habit
}

export function updateHabit(
  id: string,
  name: string,
  description: string
): Habit | null {
  const habits = getHabits()
  const idx = habits.findIndex((h) => h.id === id)
  if (idx === -1) return null
  const updated = { ...habits[idx], name, description }
  habits[idx] = updated
  saveHabits(habits)
  return updated
}

export function deleteHabit(id: string): void {
  const habits = getHabits()
  saveHabits(habits.filter((h) => h.id !== id))
}

export function getUserHabits(userId: string): Habit[] {
  return getHabits().filter((h) => h.userId === userId)
}

export function saveHabitUpdate(habit: Habit): void {
  const habits = getHabits()
  const idx = habits.findIndex((h) => h.id === habit.id)
  if (idx !== -1) {
    habits[idx] = habit
    saveHabits(habits)
  }
}
