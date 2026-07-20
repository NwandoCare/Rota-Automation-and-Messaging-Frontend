import { useState } from 'react'
import { CalendarX2, Repeat2, UsersRound, HeartHandshake } from 'lucide-react'
import { useDashboard, useMe } from '@/api/hooks'
import { formatDateLongUK, todayLondon } from '@/lib/dates'
import { Input } from '@/components/ui/input'
import { ProfileCard } from './ProfileCard'
import { StatCard } from './StatCard'

export function DashboardPage() {
  const [date, setDate] = useState(todayLondon())
  const { data: me } = useMe()
  const { data: stats, isLoading } = useDashboard(date)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {me ? `Welcome, ${me.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-500">{formatDateLongUK(date)}</p>
        </div>
        <label className="flex w-full items-center gap-2 text-sm text-slate-600 sm:w-auto">
          Date
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-40"
          />
        </label>
      </div>

      {me && <ProfileCard me={me} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Carers"
          value={stats?.carers}
          icon={UsersRound}
          to="/rota"
        />
        <StatCard
          label="Clients"
          value={stats?.clients}
          icon={HeartHandshake}
          to="/rota"
        />
        <StatCard
          label="Unscheduled shifts"
          value={stats?.unscheduled}
          icon={CalendarX2}
          to={`/rota?filter=unassigned&date=${date}`}
          accent={stats && stats.unscheduled > 0 ? 'warn' : 'default'}
        />
        <StatCard
          label="Covers"
          value={stats?.covers}
          icon={Repeat2}
          to={`/rota?date=${date}`}
        />
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading counts…</p>}
      {stats && (
        <p className="text-sm text-slate-500">
          {stats.scheduled} scheduled and {stats.unscheduled} unscheduled shift
          {stats.unscheduled === 1 ? '' : 's'} across {stats.areas.map((a) => a.name).join(' and ')}{' '}
          on {formatDateLongUK(date)}.
        </p>
      )}
    </div>
  )
}
