import { UserRound } from 'lucide-react'
import type { Me } from '@/api/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function ProfileCard({ me }: { me: Me }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <UserRound className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <div className="font-semibold">{me.name}</div>
          <div className="text-sm text-slate-500">
            {me.role === 'coordinator' ? 'Coordinator' : 'Admin'} for{' '}
            {me.areas.map((a) => a.name).join(', ')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {me.areas.map((a) => (
              <Badge key={a.id} variant="secondary">
                {a.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
