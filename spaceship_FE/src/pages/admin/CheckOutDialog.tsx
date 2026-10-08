import { useState, type ReactNode } from 'react'
import { Button, Loading, Modal, Notice } from '../../components/ui'
import { api, type Bill, type Campaign, type OpenSession } from '../../lib/api'
import { clock, duration, errorText, money, plural } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'

type Props = {
  session: OpenSession
  /** The session was closed on the server; the seated list is now stale. */
  onClosed: () => void
  onDismiss: () => void
}

function campaignLabel(campaign: Campaign): string {
  const amount =
    campaign.discount_type === 'percent'
      ? `${campaign.discount_value}% off`
      : `${money(campaign.discount_value)} off`
  return `${campaign.name} — ${amount}`
}

function Line({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${strong ? 'text-lg font-semibold' : 'text-sm'}`}
    >
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  )
}

export default function CheckOutDialog({ session, onClosed, onDismiss }: Props) {
  const campaigns = useQuery(api.campaigns)
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bill, setBill] = useState<Bill | null>(null)

  async function close() {
    setSubmitting(true)
    setError(null)
    try {
      setBill(await api.closeSession(session.id, campaignId))
      onClosed()
    } catch (err) {
      setError(errorText(err))
      setSubmitting(false)
    }
  }

  if (bill) {
    return (
      <Modal title="Bill" onClose={onDismiss}>
        <p className="font-medium">{bill.customer.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {bill.space_type.name} · {clock(bill.started_at)} – {bill.ended_at && clock(bill.ended_at)}
        </p>

        <dl className="mt-5 space-y-2.5">
          <Line label="Time seated" value={duration(bill.duration_minutes)} />
          <Line label="Billed as" value={plural(bill.billable_hours, 'hour')} />
          <Line label="Price" value={money(bill.base_price ?? 0)} />
          {bill.campaign && (
            <Line label={bill.campaign.name} value={`− ${money(bill.discount_amount ?? 0)}`} />
          )}
          <div className="border-t border-line pt-3">
            <Line label="Total" value={money(bill.final_price ?? 0)} strong />
          </div>
        </dl>

        <p className="mt-5 rounded-lg bg-surface px-4 py-3 text-sm">
          {bill.points_earned > 0
            ? `${bill.customer.name} earned ${plural(bill.points_earned, 'loyalty point')} for this stay.`
            : 'No loyalty point for this stay — it was shorter than the threshold.'}
        </p>

        <Button variant="primary" className="mt-6 w-full" onClick={onDismiss}>
          Done
        </Button>
      </Modal>
    )
  }

  return (
    <Modal title="Check out" onClose={onDismiss}>
      <p className="font-medium">{session.customer.name}</p>
      <p className="mt-0.5 text-sm text-muted">
        {session.space_type.name} · Checked in at {clock(session.started_at)}
      </p>

      <dl className="mt-5 space-y-2.5">
        <Line label="Time seated so far" value={duration(session.elapsed_minutes)} />
        <Line
          label="Estimate before discount"
          value={session.estimated_price === null ? '—' : money(session.estimated_price)}
        />
      </dl>

      <fieldset className="mt-6" disabled={submitting}>
        <legend className="mb-2 text-sm font-medium">Campaign</legend>
        {campaigns.error && <Notice onRetry={campaigns.reload}>{campaigns.error}</Notice>}
        {campaigns.loading && !campaigns.data && <Loading label="Loading campaigns…" />}
        {campaigns.data && (
          <div className="space-y-1.5">
            {[null, ...campaigns.data].map((campaign) => {
              const id = campaign?.id ?? null
              return (
                <label
                  key={id ?? 'none'}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm transition hover:border-accent-strong hover:bg-surface has-checked:border-accent-strong has-checked:bg-accent/40 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-ink"
                >
                  <input
                    type="radio"
                    name="campaign"
                    className="size-4 cursor-pointer accent-accent-ink"
                    checked={campaignId === id}
                    onChange={() => setCampaignId(id)}
                  />
                  <span>{campaign ? campaignLabel(campaign) : 'No campaign'}</span>
                </label>
              )
            })}
            {campaigns.data.length === 0 && (
              <p className="text-xs text-muted">There are no active campaigns.</p>
            )}
          </div>
        )}
      </fieldset>

      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}

      <Button variant="primary" className="mt-6 w-full" disabled={submitting} onClick={close}>
        {submitting ? 'Closing…' : 'Close session'}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        The check-out time is recorded the moment you press the button.
      </p>
    </Modal>
  )
}
