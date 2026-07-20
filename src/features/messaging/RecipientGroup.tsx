import type { MessagePreviewGroup } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { renderTemplate, TEMPLATES } from './templates'

export interface GroupDraft {
  include: boolean
  variables: Record<string, string>
}

interface RecipientGroupProps {
  group: MessagePreviewGroup
  draft: GroupDraft
  onChange: (draft: GroupDraft) => void
}

export function RecipientGroup({ group, draft, onChange }: RecipientGroupProps) {
  const template = TEMPLATES[group.template]
  const emergency = group.template.startsWith('emergency')

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-opacity',
        draft.include ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`send-${group.recipient_kind}-${group.recipient_id}`}
          type="checkbox"
          checked={draft.include}
          onChange={(e) => onChange({ ...draft, include: e.target.checked })}
          className="h-4 w-4 accent-brand-600"
        />
        <label
          htmlFor={`send-${group.recipient_kind}-${group.recipient_id}`}
          className="font-medium"
        >
          {group.recipient_name}
        </label>
        <Badge variant="secondary">{group.recipient_kind}</Badge>
        <Badge variant={emergency ? 'red' : 'default'} className="ml-auto">
          {template.label}
        </Badge>
      </div>

      {draft.include && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            Change details (variable slot)
            <Textarea
              value={draft.variables.details ?? ''}
              onChange={(e) =>
                onChange({ ...draft, variables: { ...draft.variables, details: e.target.value } })
              }
              className="mt-1"
              rows={2}
            />
          </label>
          <div className="rounded-md bg-slate-100 p-2.5 text-xs leading-relaxed text-slate-700">
            {renderTemplate(group.template, draft.variables)}
          </div>
        </div>
      )}
    </div>
  )
}
