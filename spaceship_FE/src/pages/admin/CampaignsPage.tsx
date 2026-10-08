import { useState } from 'react'
import { Button, Empty, Loading, Notice, PageHeader, Tag, focusRing } from '../../components/ui'
import { api, type Campaign } from '../../lib/api'
import { money } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import CampaignDialog from './CampaignDialog'

function discountText(campaign: Campaign): string {
  return campaign.discount_type === 'percent'
    ? `${campaign.discount_value}% off`
    : `${money(campaign.discount_value)} off`
}

export default function CampaignsPage() {
  const { data: campaigns, error, loading, reload } = useQuery(api.allCampaigns)
  // 'new' opens an empty form; a campaign opens it for editing.
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null)

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Discounts you can pick when checking a customer out."
        action={
          <Button variant="primary" onClick={() => setEditing('new')}>
            Add campaign
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      {loading && !campaigns && <Loading />}

      {campaigns && campaigns.length === 0 && (
        <Empty
          title="No campaigns yet"
          hint="Add one, for example “Sunday discount — 5% off”."
        />
      )}

      {campaigns && campaigns.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <button
                type="button"
                onClick={() => setEditing(campaign)}
                className={`flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface active:bg-line/50 ${focusRing}`}
              >
                <span className={`min-w-0 ${campaign.is_active ? '' : 'opacity-60'}`}>
                  <span className="block truncate font-medium">{campaign.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {discountText(campaign)}
                    {campaign.condition && ` · ${campaign.condition}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <Tag>{campaign.is_active ? 'On' : 'Off'}</Tag>
                  <span className="text-sm text-muted">Edit →</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CampaignDialog
          campaign={editing === 'new' ? null : editing}
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
