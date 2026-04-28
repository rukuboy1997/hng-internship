'use client'

import { useState } from 'react'
import type { Habit } from '@/types/habit'
import { validateHabitName } from '@/lib/validators'

interface Props {
  habit?: Habit
  onSave: (name: string, description: string) => void
  onCancel: () => void
}

export default function HabitForm({ habit, onSave, onCancel }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateHabitName(name)
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid name')
      return
    }
    setError('')
    onSave(validation.value, description.trim())
  }

  return (
    <form data-testid="habit-form" onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="habit-name"
          className="block text-sm font-medium text-gray-700"
        >
          Habit Name <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="habit-name"
          type="text"
          data-testid="habit-name-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          placeholder="e.g., Drink Water"
          maxLength={80}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 mt-1">
            {error}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="habit-description"
          className="block text-sm font-medium text-gray-700"
        >
          Description{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="habit-description"
          data-testid="habit-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Why is this habit important to you?"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="habit-frequency"
          className="block text-sm font-medium text-gray-700"
        >
          Frequency
        </label>
        <select
          id="habit-frequency"
          data-testid="habit-frequency-select"
          defaultValue="daily"
          disabled
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-gray-50 text-gray-700 shadow-sm"
        >
          <option value="daily">Daily</option>
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          data-testid="habit-save-button"
          className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          {habit ? 'Update Habit' : 'Save Habit'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
