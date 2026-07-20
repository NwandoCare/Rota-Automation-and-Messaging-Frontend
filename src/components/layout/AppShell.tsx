import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useMe } from '@/api/hooks'
import { getAuth } from '@/features/auth/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import logoWhite from '@/assets/nwando-logo-white.png'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white',
  )

export function AppShell() {
  const { data: me } = useMe()
  const navigate = useNavigate()

  const signOut = () => {
    getAuth().signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 bg-slate-800 shadow">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:gap-6 sm:px-4">
          <img src={logoWhite} alt="Nwando Care" className="h-6 w-auto sm:h-8" />
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={tabClass}>
              Dashboard
            </NavLink>
            <NavLink to="/rota" className={tabClass}>
              Rota
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {me && (
              <span className="hidden text-sm text-slate-300 md:inline">
                Welcome, <span className="font-medium text-white">{me.name}</span>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              aria-label="Sign out"
              className="text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
