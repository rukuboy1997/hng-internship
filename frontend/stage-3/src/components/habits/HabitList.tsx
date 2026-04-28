import type { Habit } from '@/types/habit'
import HabitCard from './HabitCard'

interface Props {
  habits: Habit[]
  onUpdate: (habit: Habit) => void
  onDelete: (id: string) => void
  onEdit: (habit: Habit) => void
}

export default function HabitList({ habits, onUpdate, onDelete, onEdit }: Props) {
  if (habits.length === 0) {
    return (
      <div
        data-testid="empty-state"
        className="text-center py-16 px-4"
      >
        <div className="text-5xl mb-4">🌱</div>
        <h3 className="text-lg font-semibold text-gray-900">No habits yet</h3>
        <p className="text-sm text-gray-500 mt-1">
          Create your first habit to start building your streak!
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3 list-none p-0">
      {habits.map((habit) => (
        <li key={habit.id}>
          <HabitCard
            habit={habit}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </li>
      ))}
    </ul>
  )
}
