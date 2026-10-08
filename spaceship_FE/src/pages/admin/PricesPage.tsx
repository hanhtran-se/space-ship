import { useState } from 'react'
import { Button, Empty, Loading, Notice, PageHeader, Tag } from '../../components/ui'
import { api, type PriceTier, type SpaceType } from '../../lib/api'
import { duration, money } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import SpaceTypeDialog from './SpaceTypeDialog'

function tierNote(tier: PriceTier): string {
  if (tier.kind === 'hourly') return 'Each hour not covered by a combo'
  if (tier.kind === 'combo') return `Bundle of ${duration(tier.duration_minutes)}`
  return 'Stays beyond the full-day threshold'
}

export default function PricesPage() {
  const { data: spaceTypes, error, loading, reload } = useQuery(api.spaceTypes)
  // 'new' opens an empty form; a space type opens it for editing.
  const [editing, setEditing] = useState<SpaceType | 'new' | null>(null)

  return (
    <>
      <PageHeader
        title="Prices"
        subtitle="Space types and their price lists."
        action={
          <Button variant="primary" onClick={() => setEditing('new')}>
            Add space type
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      {loading && !spaceTypes && <Loading />}

      {spaceTypes && spaceTypes.length === 0 && (
        <Empty
          title="No space types yet"
          hint="Add a desk or a room and set its prices to start checking customers in."
        />
      )}

      {spaceTypes && spaceTypes.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {spaceTypes.map((spaceType) => (
            <article key={spaceType.id} className="flex flex-col rounded-xl border border-line p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{spaceType.name}</h2>
                  {spaceType.description && (
                    <p className="mt-0.5 text-sm text-muted">{spaceType.description}</p>
                  )}
                </div>
                <Tag tone={spaceType.is_available ? 'green' : 'neutral'}>
                  {spaceType.is_available ? 'Available' : 'In use'}
                </Tag>
              </div>

              <p className="mt-3 text-sm text-muted">
                {spaceType.pricing_mode === 'per_room'
                  ? `Charged per room · up to ${spaceType.capacity} people`
                  : 'Charged per person'}
              </p>

              <ul className="mt-4 flex-1 divide-y divide-line border-t border-line">
                {spaceType.price_tiers.map((tier) => (
                  <li key={tier.id} className="flex items-baseline justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{tier.label}</p>
                      <p className="text-xs text-muted">{tierNote(tier)}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{money(tier.price)}</p>
                  </li>
                ))}
              </ul>

              <Button className="mt-4 w-full" onClick={() => setEditing(spaceType)}>
                Edit
              </Button>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <SpaceTypeDialog
          spaceType={editing === 'new' ? null : editing}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
