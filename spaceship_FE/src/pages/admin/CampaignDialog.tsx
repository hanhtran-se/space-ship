import { useState, type FormEvent } from 'react'
import { Button, Choice, Input, Modal, Notice } from '../../components/ui'
import { api, type Campaign, type CampaignInput } from '../../lib/api'
import { errorText } from '../../lib/format'

type Props = {
  /** null = create a new campaign */
  campaign: Campaign | null
  onSaved: () => void
  onClose: () => void
}

export default function CampaignDialog({ campaign, onSaved, onClose }: Props) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [note, setNote] = useState(campaign?.condition ?? '')
  const [type, setType] = useState<CampaignInput['discount_type']>(
    campaign?.discount_type ?? 'percent',
  )
  const [value, setValue] = useState(campaign ? String(campaign.discount_value) : '')
  const [active, setActive] = useState(campaign?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    const body: CampaignInput = {
      name: name.trim(),
      condition: note.trim(),
      discount_type: type,
      discount_value: Number(value),
      is_active: active,
    }
    setSaving(true)
    setError(null)
    try {
      if (campaign) await api.updateCampaign(campaign.id, body)
      else await api.createCampaign(body)
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setSaving(false)
    }
  }

  return (
    <Modal title={campaign ? `Edit ${campaign.name}` : 'Add campaign'} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <Input
          label="Name"
          placeholder="Sunday discount"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={200}
          disabled={saving}
          required
        />
        <Input
          label="When to use it (optional)"
          placeholder="Sundays, students, first visit…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          disabled={saving}
        />
        <Choice
          label="Discount"
          name="discount-type"
          value={type}
          onChange={setType}
          disabled={saving}
          options={[
            { value: 'percent', label: 'Percent (%)' },
            { value: 'amount', label: 'Fixed amount (₫)' },
          ]}
        />
        <Input
          label={type === 'percent' ? 'Percent off' : 'Amount off (₫)'}
          type="number"
          inputMode="numeric"
          min={1}
          max={type === 'percent' ? 100 : undefined}
          step={1}
          placeholder={type === 'percent' ? '5' : '10000'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={saving}
          required
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-3 text-sm transition hover:border-accent-strong hover:bg-surface has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-4 cursor-pointer accent-accent-ink"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            disabled={saving}
          />
          <span>
            <span className="block font-medium">Turned on</span>
            <span className="block text-muted">
              Only campaigns that are on can be picked at check-out.
            </span>
          </span>
        </label>

        {error && <Notice>{error}</Notice>}

        <Button type="submit" variant="primary" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : campaign ? 'Save changes' : 'Add campaign'}
        </Button>
      </form>
    </Modal>
  )
}
