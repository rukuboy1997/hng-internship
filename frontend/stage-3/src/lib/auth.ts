import type { Session } from '@/types/auth'
import { getUsers, saveUsers, getSession, saveSession } from './storage'

export function signup(
  email: string,
  password: string
): { success: boolean; error?: string } {
  const users = getUsers()
  if (users.find((u) => u.email === email)) {
    return { success: false, error: 'User already exists' }
  }
  const user = {
    id: crypto.randomUUID(),
    email,
    password,
    createdAt: new Date().toISOString(),
  }
  saveUsers([...users, user])
  saveSession({ userId: user.id, email: user.email })
  return { success: true }
}

export function login(
  email: string,
  password: string
): { success: boolean; error?: string } {
  const users = getUsers()
  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) {
    return { success: false, error: 'Invalid email or password' }
  }
  saveSession({ userId: user.id, email: user.email })
  return { success: true }
}

export function logout(): void {
  saveSession(null)
}

export function getCurrentSession(): Session | null {
  return getSession()
}
