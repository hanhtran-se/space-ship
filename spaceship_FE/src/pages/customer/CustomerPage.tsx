import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import lounge from '../../assets/lounge.jpg'
import { Brand } from '../../components/Brand'
import { Empty, Loading, Notice } from '../../components/ui'
import { api } from '../../lib/api'
import { clock, day, duration, minutesBetween } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-line px-4 py-4 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export default function CustomerPage() {
  const { token = '' } = useParams()
  const load = useCallback(() => api.customerView(token), [token])
  const { data: view, error, loading, reload } = useQuery(load)

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-8">
        <Brand tagline />
      </header>

      {loading && !view && <Loading label="Loading your visits…" />}

      {error && !view && (
        <Notice onRetry={reload}>
          {error === 'Link not found'
            ? 'This link isn’t valid. Please ask at the counter for a new one.'
            : error}
        </Notice>
      )}

      {view && (
        <main>
          <img
            src={lounge}
            alt="A lounge corner with a sofa and wooden tables"
            className="mb-8 aspect-[16/7] w-full rounded-2xl object-cover"
          />

          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="text-3xl font-semibold tracking-tight">{view.name}</h1>

          {view.active_session && (
            <section className="mt-6 rounded-xl bg-accent/50 px-5 py-4" aria-label="Active session">
              <p className="font-medium text-accent-ink">
                Checked in at {clock(view.active_session.started_at)}
              </p>
              <p className="mt-0.5 text-sm text-accent-ink/80">{view.active_session.space_type}</p>
            </section>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Hours studied" value={duration(view.total_hours * 60)} wide />
            <Stat label="Sessions" value={String(view.total_sessions)} />
            <Stat label="Points" value={String(view.points_balance)} />
          </dl>

          <section className="mt-10">
            <h2 className="mb-3 text-sm font-medium text-muted">Session history</h2>
            {view.history.length === 0 ? (
              <Empty
                title="No finished sessions yet"
                hint="Your visits will appear here after you check out."
              />
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {view.history.map((session) => (
                  <li
                    key={session.started_at}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{day(session.started_at)}</p>
                      <p className="mt-0.5 truncate text-sm text-muted">
                        {clock(session.started_at)} – {clock(session.ended_at)} ·{' '}
                        {session.space_type}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">
                      {duration(minutesBetween(session.started_at, session.ended_at))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="mt-10 text-center text-xs text-muted">
            This page is private to you and read-only.
          </p>
        </main>
      )}
    </div>
  )
}
