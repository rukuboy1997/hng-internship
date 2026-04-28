'use client'

import { useState } from 'react'
import type { Habit } from '@/types/habit'
import { getHabitSlug } from '@/lib/slug'
import { calculateCurrentStreak } from '@/lib/streaks'
import { toggleHabitCompletion } from '@/lib/habits'

interface Props {
  habit: Habit
  onUpdate: (habit: Habit) => void
  onDelete: (id: string) => void
  onEdit: (habit: Habit) => void
}

export default function HabitCard({ habit, onUpdate, onDelete, onEdit }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)

  const slug = getHabitSlug(habit.name)
  const today = new Date().toISOString().slice(0, 10)
  const streak = calculateCurrentStreak(habit.completions, today)
  const isCompleted = habit.completions.includes(today)

  const handleToggle = () => {
    const updated = toggleHabitCompletion(habit, today)
    onUpdate(updated)
  }

  return (
    <article
      data-testid={`habit-card-${slug}`}
      className={`rounded-xl border p-4 transition-colors ${
        isCompleted
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{habit.name}</h3>
          {habit.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {habit.description}
            </p>
          )}
          <div
            data-testid={`habit-streak-${slug}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600"
          >
            <span>🔥</span>
            <span>{streak} day{streak !== 1 ? 's' : ''} streak</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            data-testid={`habit-complete-${slug}`}
            onClick={handleToggle}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
              isCompleted
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            {isCompleted ? '✓ Done' : 'Complete'}
          </button>

          <button
            data-testid={`habit-edit-${slug}`}
            onClick={() => onEdit(habit)}
            aria-label={`Edit ${habit.name}`}
            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>

          <button
            data-testid={`habit-delete-${slug}`}
            onClick={() => setShowConfirm(true)}
            aria-label={`Delete ${habit.name}`}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {showConfirm && (
        <div
          role="dialog"
          aria-label="Confirm deletion"
          className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200"
        >
          <p className="text-sm text-red-700 mb-3 font-medium">
            Delete &quot;{habit.name}&quot;? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              data-testid="confirm-delete-button"
              onClick={() => onDelete(habit.id)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
