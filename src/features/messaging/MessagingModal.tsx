import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useMessagePreview, useSendMessages } from '@/api/hooks'
import type { SendRecipient } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RecipientGroup, type GroupDraft } from './RecipientGroup'

interface MessagingModalProps {
  changeId: string | null
  onClose: () => void
}

/**
 * Opens after a successful save: proposes one WhatsApp message per affected
 * carer/client, template pre-selected from the urgency × kind matrix. The
 * coordinator unticks anyone who shouldn't be messaged and edits the
 * variable slots before sending.
 */
export function MessagingModal({ changeId, onClose }: MessagingModalProps) {
  const { data, isLoading } = useMessagePreview(changeId)
  const send = useSendMessages(changeId)
  const [groupDrafts, setGroupDrafts] = useState<Record<string, GroupDraft>>({})

  useEffect(() => {
    if (!data) return
    setGroupDrafts(
      Object.fromEntries(
        data.groups.map((g) => [
          `${g.recipient_kind}:${g.recipient_id}`,
          { include: true, variables: { ...g.variables } },
        ]),
      ),
    )
  }, [data])

  if (changeId === null) return null

  const includedCount = Object.values(groupDrafts).filter((d) => d.include).length

  const handleSend = () => {
    if (!data) return
    const recipients: SendRecipient[] = data.groups
      .filter((g) => groupDrafts[`${g.recipient_kind}:${g.recipient_id}`]?.include)
      .map((g) => ({
        recipient_kind: g.recipient_kind,
        recipient_id: g.recipient_id,
        template: g.template,
        variables: groupDrafts[`${g.recipient_kind}:${g.recipient_id}`].variables,
      }))
    send.mutate(
      { recipients },
      {
        onSuccess: ({ sent }) => {
          toast.success(`${sent} message${sent === 1 ? '' : 's'} queued for WhatsApp delivery.`)
          onClose()
        },
        onError: () => toast.error('Sending failed — messages have not gone out.'),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notify affected people</DialogTitle>
          <DialogDescription>
            One message per affected carer and client, covering all their changes. Untick anyone
            you will contact another way.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing messages…
          </div>
        )}

        {data && data.groups.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            No one is affected by these changes.
          </p>
        )}

        {data && data.groups.length > 0 && (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {data.groups.map((g) => {
              const key = `${g.recipient_kind}:${g.recipient_id}`
              const draft = groupDrafts[key]
              if (!draft) return null
              return (
                <RecipientGroup
                  key={key}
                  group={g}
                  draft={draft}
                  onChange={(d) => setGroupDrafts((prev) => ({ ...prev, [key]: d }))}
                />
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={send.isPending}>
            Skip messages
          </Button>
          <Button onClick={handleSend} disabled={send.isPending || includedCount === 0}>
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send {includedCount} message{includedCount === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
