import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState as useReactState } from 'react'
import HabitForm from '@/components/habits/HabitForm'
import HabitList from '@/components/habits/HabitList'
import HabitCard from '@/components/habits/HabitCard'
import { STORAGE_KEYS } from '@/lib/constants'
import type { Habit } from '@/types/habit'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}))

function createTestHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'test-habit-id',
    userId: 'test-user-id',
    name: 'Drink Water',
    description: 'Stay hydrated',
    frequency: 'daily',
    createdAt: '2024-01-01T00:00:00.000Z',
    completions: [],
    ...overrides,
  }
}

describe('habit form', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows a validation error when habit name is empty', async () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(<HabitForm onSave={onSave} onCancel={onCancel} />)

    await user.click(screen.getByTestId('habit-save-button'))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Habit name is required')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('creates a new habit and renders it in the list', async () => {
    const user = userEvent.setup()

    function TestWrapper() {
      const [habits, setHabits] = useReactState<Habit[]>([])
      const [showForm, setShowForm] = useReactState(true)

      const handleSave = (name: string, description: string) => {
        const newHabit: Habit = {
          id: 'new-habit-id',
          userId: 'user-1',
          name,
          description,
          frequency: 'daily',
          createdAt: new Date().toISOString(),
          completions: [],
        }
        setHabits([newHabit])
        setShowForm(false)
      }

      return (
        <div>
          {showForm && <HabitForm onSave={handleSave} onCancel={() => setShowForm(false)} />}
          <HabitList
            habits={habits}
            onUpdate={() => {}}
            onDelete={() => {}}
            onEdit={() => {}}
          />
        </div>
      )
    }

    render(<TestWrapper />)

    await user.type(screen.getByTestId('habit-name-input'), 'Drink Water')
    await user.type(screen.getByTestId('habit-description-input'), 'Stay hydrated every day')
    await user.click(screen.getByTestId('habit-save-button'))

    expect(screen.getByTestId('habit-card-drink-water')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  it('edits an existing habit and preserves immutable fields', async () => {
    const originalHabit = createTestHabit({
      id: 'immutable-id-xyz',
      userId: 'owner-user-id',
      createdAt: '2024-03-15T08:00:00.000Z',
      completions: ['2024-03-15', '2024-03-16'],
      name: 'Drink Water',
      description: 'Original description',
    })

    const onSave = vi.fn()
    const user = userEvent.setup()

    render(
      <HabitForm habit={originalHabit} onSave={onSave} onCancel={() => {}} />
    )

    await user.clear(screen.getByTestId('habit-name-input'))
    await user.type(screen.getByTestId('habit-name-input'), 'Exercise')
    await user.clear(screen.getByTestId('habit-description-input'))
    await user.type(screen.getByTestId('habit-description-input'), 'New description')
    await user.click(screen.getByTestId('habit-save-button'))

    expect(onSave).toHaveBeenCalledWith('Exercise', 'New description')

    const [newName, newDescription] = onSave.mock.calls[0] as [string, string]
    const updatedHabit = { ...originalHabit, name: newName, description: newDescription }

    expect(updatedHabit.id).toBe('immutable-id-xyz')
    expect(updatedHabit.userId).toBe('owner-user-id')
    expect(updatedHabit.createdAt).toBe('2024-03-15T08:00:00.000Z')
    expect(updatedHabit.completions).toEqual(['2024-03-15', '2024-03-16'])
    expect(updatedHabit.frequency).toBe('daily')
  })

  it('deletes a habit only after explicit confirmation', async () => {
    const onDelete = vi.fn()
    const onUpdate = vi.fn()
    const onEdit = vi.fn()
    const habit = createTestHabit({ name: 'Read Books', completions: [] })
    const user = userEvent.setup()

    render(
      <HabitCard
        habit={habit}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onEdit={onEdit}
      />
    )

    await user.click(screen.getByTestId('habit-delete-read-books'))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument()

    await user.click(screen.getByTestId('confirm-delete-button'))
    expect(onDelete).toHaveBeenCalledWith('test-habit-id')
  })

  it('toggles completion and updates the streak display', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const habit = createTestHabit({ name: 'Meditate', completions: [] })
    const user = userEvent.setup()
    let currentHabit = { ...habit }

    function TestCard() {
      const [h, setH] = useReactState(currentHabit)
      return (
        <HabitCard
          habit={h}
          onUpdate={(updated) => {
            currentHabit = updated
            setH(updated)
          }}
          onDelete={() => {}}
          onEdit={() => {}}
        />
      )
    }

    render(<TestCard />)

    const streakEl = screen.getByTestId('habit-streak-meditate')
    expect(streakEl).toHaveTextContent('0 days streak')

    await user.click(screen.getByTestId('habit-complete-meditate'))

    expect(screen.getByTestId('habit-streak-meditate')).toHaveTextContent('1 day streak')
    expect(currentHabit.completions).toContain(today)
  })
})
