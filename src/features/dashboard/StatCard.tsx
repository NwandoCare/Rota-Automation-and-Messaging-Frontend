import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | undefined
  icon: LucideIcon
  to: string
  accent?: 'default' | 'warn'
}

export function StatCard({ label, value, icon: Icon, to, accent = 'default' }: StatCardProps) {
  return (
    <Link to={to} className="group focus-visible:outline-none">
      <Card
        className={cn(
          'flex items-center gap-4 p-5 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-brand-500',
          accent === 'warn' && 'border-amber-300 bg-amber-50',
        )}
      >
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            accent === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700',
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">
            {value === undefined ? '—' : value}
          </div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      </Card>
    </Link>
  )
}
