import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupForm from '@/components/auth/SignupForm'
import LoginForm from '@/components/auth/LoginForm'
import { STORAGE_KEYS } from '@/lib/constants'
import type { User } from '@/types/auth'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
}))

describe('auth flow', () => {
  beforeEach(() => {
    localStorage.clear()
    mockPush.mockClear()
  })

  it('submits the signup form and creates a session', async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByTestId('auth-signup-email'), 'alice@example.com')
    await user.type(screen.getByTestId('auth-signup-password'), 'password123')
    await user.click(screen.getByTestId('auth-signup-submit'))

    const rawSession = localStorage.getItem(STORAGE_KEYS.SESSION)
    expect(rawSession).not.toBeNull()
    const session = JSON.parse(rawSession!)
    expect(session).not.toBeNull()
    expect(session.email).toBe('alice@example.com')
    expect(session.userId).toBeDefined()
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error for duplicate signup email', async () => {
    const existingUser: User = {
      id: 'existing-id',
      email: 'alice@example.com',
      password: 'password123',
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([existingUser]))

    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByTestId('auth-signup-email'), 'alice@example.com')
    await user.type(screen.getByTestId('auth-signup-password'), 'newpassword')
    await user.click(screen.getByTestId('auth-signup-submit'))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('User already exists')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('submits the login form and stores the active session', async () => {
    const existingUser: User = {
      id: 'user-123',
      email: 'bob@example.com',
      password: 'securepass',
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([existingUser]))

    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByTestId('auth-login-email'), 'bob@example.com')
    await user.type(screen.getByTestId('auth-login-password'), 'securepass')
    await user.click(screen.getByTestId('auth-login-submit'))

    const rawSession = localStorage.getItem(STORAGE_KEYS.SESSION)
    expect(rawSession).not.toBeNull()
    const session = JSON.parse(rawSession!)
    expect(session).not.toBeNull()
    expect(session.email).toBe('bob@example.com')
    expect(session.userId).toBe('user-123')
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error for invalid login credentials', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByTestId('auth-login-email'), 'nobody@example.com')
    await user.type(screen.getByTestId('auth-login-password'), 'wrongpassword')
    await user.click(screen.getByTestId('auth-login-submit'))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Invalid email or password')
    expect(mockPush).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toBeNull()
  })
})
