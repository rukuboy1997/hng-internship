'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@/types/auth'
import type { Habit } from '@/types/habit'
import { getCurrentSession, logout } from '@/lib/auth'
import {
  getUserHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  saveHabitUpdate,
} from '@/lib/habits'
import HabitList from '@/components/habits/HabitList'
import HabitForm from '@/components/habits/HabitForm'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

function DashboardContent({ session }: { session: Session }) {
  const router = useRouter()
  const [habits, setHabits] = useState<Habit[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  const loadHabits = useCallback(() => {
    setHabits(getUserHabits(session.userId))
  }, [session.userId])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleCreateHabit = (name: string, description: string) => {
    createHabit(session.userId, name, description)
    loadHabits()
    setShowForm(false)
  }

  const handleUpdateHabit = (name: string, description: string) => {
    if (!editingHabit) return
    updateHabit(editingHabit.id, name, description)
    loadHabits()
    setEditingHabit(null)
    setShowForm(false)
  }

  const handleHabitUpdate = (habit: Habit) => {
    saveHabitUpdate(habit)
    loadHabits()
  }

  const handleHabitDelete = (id: string) => {
    deleteHabit(id)
    loadHabits()
  }

  const handleHabitEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setShowForm(true)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingHabit(null)
  }

  const completedToday = habits.filter((h) =>
    h.completions.includes(new Date().toISOString().slice(0, 10))
  ).length

  return (
    <div data-testid="dashboard-page" className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="font-bold text-gray-900">Habit Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{session.email}</span>
            <button
              data-testid="auth-logout-button"
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {habits.length > 0 && (
          <div className="mb-5 p-4 bg-white rounded-xl border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Progress</p>
              <p className="text-lg font-bold text-gray-900">
                {completedToday}/{habits.length} habits
              </p>
            </div>
            <div className="text-3xl">{completedToday === habits.length && habits.length > 0 ? '🏆' : '📊'}</div>
          </div>
        )}

        {showForm ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              {editingHabit ? 'Edit Habit' : 'New Habit'}
            </h2>
            <HabitForm
              habit={editingHabit ?? undefined}
              onSave={editingHabit ? handleUpdateHabit : handleCreateHabit}
              onCancel={handleFormCancel}
            />
          </div>
        ) : (
          <button
            data-testid="create-habit-button"
            onClick={() => {
              setEditingHabit(null)
              setShowForm(true)
            }}
            className="w-full mb-5 py-3 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            + Add New Habit
          </button>
        )}

        <HabitList
          habits={habits}
          onUpdate={handleHabitUpdate}
          onDelete={handleHabitDelete}
          onEdit={handleHabitEdit}
        />
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      {(session) => <DashboardContent session={session} />}
    </ProtectedRoute>
  )
}
