import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Loading, Modal, Notice, focusRing } from '../../components/ui'
import { api, type SpaceType } from '../../lib/api'
import { errorText, matchesCustomer, money } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'

type Props = {
  seatedCustomerIds: Set<number>
  onClose: () => void
  onStarted: () => void
}

function hourlyPrice(spaceType: SpaceType): string {
  const hourly = spaceType.price_tiers.find((tier) => tier.kind === 'hourly')
  return hourly ? `${money(hourly.price)} / hour` : 'No hourly price'
}

const optionClass = (selected: boolean) =>
  `flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${focusRing} ${
    selected
      ? 'border-accent-strong bg-accent/40'
      : 'border-line hover:border-accent-strong hover:bg-surface'
  }`

export default function CheckInDialog({ seatedCustomerIds, onClose, onStarted }: Props) {
  const customers = useQuery(api.customers)
  const spaceTypes = useQuery(api.availableSpaceTypes)
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [spaceTypeId, setSpaceTypeId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = (customers.data ?? []).filter((customer) => matchesCustomer(customer, search))

  async function start() {
    if (customerId === null || spaceTypeId === null) return
    setSubmitting(true)
    setError(null)
    try {
      await api.startSession(customerId, spaceTypeId)
      onStarted()
    } catch (err) {
      setError(errorText(err))
      setSubmitting(false)
      // The room may have just been taken; show the current availability.
      spaceTypes.reload()
    }
  }

  return (
    <Modal title="Check in" onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-medium">Customer</h3>
          {customers.error && <Notice onRetry={customers.reload}>{customers.error}</Notice>}
          {customers.loading && !customers.data && <Loading label="Loading customers…" />}
          {customers.data && customers.data.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              No customers yet.{' '}
              <Link
                to="/customers"
                className={`rounded font-medium text-ink underline underline-offset-2 hover:text-accent-ink ${focusRing}`}
              >
                Add one first
              </Link>
              .
            </p>
          )}
          {customers.data && customers.data.length > 0 && (
            <>
              <Input
                label="Search customers"
                hideLabel
                type="search"
                placeholder="Search by name or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {matches.map((customer) => {
                  const seated = seatedCustomerIds.has(customer.id)
                  return (
                    <li key={customer.id}>
                      <button
                        type="button"
                        disabled={seated}
                        aria-pressed={customerId === customer.id}
                        onClick={() => setCustomerId(customer.id)}
                        className={optionClass(customerId === customer.id)}
                      >
                        <span className="truncate">{customer.name}</span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {seated ? 'Seated' : customer.phone}
                        </span>
                      </button>
                    </li>
                  )
                })}
                {matches.length === 0 && (
                  <li className="px-1 py-3 text-sm text-muted">No customer matches “{search}”.</li>
                )}
              </ul>
            </>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium">Space</h3>
          {spaceTypes.error && <Notice onRetry={spaceTypes.reload}>{spaceTypes.error}</Notice>}
          {spaceTypes.loading && !spaceTypes.data && <Loading label="Loading spaces…" />}
          {spaceTypes.data && spaceTypes.data.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              No space is available right now.
            </p>
          )}
          {spaceTypes.data && spaceTypes.data.length > 0 && (
            <ul className="space-y-1.5">
              {spaceTypes.data.map((spaceType) => (
                <li key={spaceType.id}>
                  <button
                    type="button"
                    aria-pressed={spaceTypeId === spaceType.id}
                    onClick={() => setSpaceTypeId(spaceType.id)}
                    className={optionClass(spaceTypeId === spaceType.id)}
                  >
                    <span className="truncate">{spaceType.name}</span>
                    <span className="shrink-0 text-xs text-muted">{hourlyPrice(spaceType)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Rooms that are in use are not listed.</p>
        </section>

        {error && <Notice>{error}</Notice>}

        <Button
          variant="primary"
          className="w-full"
          disabled={customerId === null || spaceTypeId === null || submitting}
          onClick={start}
        >
          {submitting ? 'Starting…' : 'Start'}
        </Button>
      </div>
    </Modal>
  )
}
