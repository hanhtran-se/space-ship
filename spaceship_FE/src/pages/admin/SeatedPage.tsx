import { useEffect, useState } from 'react'
import { Button, Empty, Loading, Notice, PageHeader } from '../../components/ui'
import { api, type OpenSession } from '../../lib/api'
import { clock, money, plural } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import CheckInDialog from './CheckInDialog'
import CheckOutDialog from './CheckOutDialog'

const REFRESH_MS = 60_000

export default function SeatedPage() {
  const { data: sessions, error, loading, reload } = useQuery(api.openSessions)
  const [checkingIn, setCheckingIn] = useState(false)
  const [closing, setClosing] = useState<OpenSession | null>(null)

  // Keep the running estimates fresh while the page sits open at the counter.
  useEffect(() => {
    const timer = setInterval(reload, REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload])

  return (
    <>
      <PageHeader
        title="Currently seated"
        subtitle={sessions ? `${plural(sessions.length, 'open session')}` : undefined}
        action={
          <Button variant="primary" onClick={() => setCheckingIn(true)}>
            Check in
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      {loading && !sessions && <Loading />}

      {sessions && sessions.length === 0 && (
        <Empty title="Nobody is seated right now" hint="Press Check in when a customer arrives." />
      )}

      {sessions && sessions.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {session.customer.name}
                  {session.customer.phone && (
                    <span className="ml-2 text-sm font-normal text-muted tabular-nums">
                      {session.customer.phone}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {session.space_type.name} · Checked in at {clock(session.started_at)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-6">
                <div className="sm:text-right">
                  <p className="text-lg font-semibold tabular-nums">
                    {session.estimated_price === null ? '—' : money(session.estimated_price)}
                  </p>
                  <p className="text-xs text-muted">
                    {session.estimated_price === null
                      ? 'Price list incomplete'
                      : `Estimate · ${plural(session.billable_hours, 'hour')} billed`}
                  </p>
                </div>
                <Button onClick={() => setClosing(session)}>Check out</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {checkingIn && (
        <CheckInDialog
          seatedCustomerIds={new Set((sessions ?? []).map((s) => s.customer.id))}
          onClose={() => setCheckingIn(false)}
          onStarted={() => {
            setCheckingIn(false)
            reload()
          }}
        />
      )}

      {closing && (
        <CheckOutDialog
          session={closing}
          onClosed={reload}
          onDismiss={() => setClosing(null)}
        />
      )}
    </>
  )
}
