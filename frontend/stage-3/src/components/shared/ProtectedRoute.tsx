'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentSession } from '@/lib/auth'
import type { Session } from '@/types/auth'

interface Props {
  children: (session: Session) => React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const s = getCurrentSession()
    if (!s) {
      router.push('/login')
    } else {
      setSession(s)
    }
    setChecked(true)
  }, [router])

  if (!checked || !session) return null
  return <>{children(session)}</>
}
