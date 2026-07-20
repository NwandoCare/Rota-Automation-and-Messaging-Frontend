import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAuth } from './auth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!getAuth().isSignedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
