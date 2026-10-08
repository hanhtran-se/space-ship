import { useState, type FormEvent } from 'react'
import { Button, Empty, Input, Loading, Notice, PageHeader } from '../../components/ui'
import { api, type Setting } from '../../lib/api'
import { errorText } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'

const DESCRIPTIONS: Record<string, { title: string; help: string; unit: string; max?: number }> = {
  rounding_threshold_minutes: {
    title: 'Rounding threshold',
    help: 'Leftover minutes above this round the stay up to the next hour; otherwise it rounds down.',
    unit: 'minutes',
    max: 59,
  },
  full_day_threshold_hours: {
    title: 'Full-day threshold',
    help: 'Stays longer than this many billed hours are charged the full-day price.',
    unit: 'hours',
  },
  point_threshold_hours: {
    title: 'Loyalty point threshold',
    help: 'Sitting at least this long earns one loyalty point.',
    unit: 'hours',
  },
}

function SettingRow({ setting }: { setting: Setting }) {
  const info = DESCRIPTIONS[setting.key] ?? { title: setting.key, help: '', unit: '' }
  const [saved, setSaved] = useState(setting.value)
  const [value, setValue] = useState(String(setting.value))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const unchanged = value.trim() === String(saved)

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setJustSaved(false)
    try {
      const updated = await api.updateSetting(setting.key, Number(value))
      setSaved(updated.value)
      setValue(String(updated.value))
      setJustSaved(true)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="p-5">
      <form onSubmit={save} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex-1">
          <h2 className="font-medium">{info.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{info.help}</p>
        </div>
        <div className="flex items-end gap-3">
          <div className="w-28">
            <Input
              label={info.unit ? `${info.title} (${info.unit})` : info.title}
              hideLabel
              type="number"
              inputMode="numeric"
              min={0}
              max={info.max}
              step={1}
              required
              value={value}
              disabled={saving}
              onChange={(event) => {
                setValue(event.target.value)
                setJustSaved(false)
              }}
            />
          </div>
          <span className="w-14 pb-3 text-sm text-muted">{info.unit}</span>
          <Button type="submit" variant="primary" disabled={saving || unchanged || value === ''}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
      {error && (
        <div className="mt-3">
          <Notice>{error}</Notice>
        </div>
      )}
      {justSaved && (
        <p role="status" className="mt-2 text-sm text-muted">
          Saved. It applies to sessions closed from now on.
        </p>
      )}
    </li>
  )
}

export default function SettingsPage() {
  const { data: settings, error, loading, reload } = useQuery(api.settings)

  return (
    <>
      <PageHeader title="Settings" subtitle="Thresholds used for pricing and loyalty points." />

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      {loading && !settings && <Loading />}

      {settings && settings.length === 0 && <Empty title="No settings available" />}

      {settings && settings.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {settings.map((setting) => (
            <SettingRow key={setting.key} setting={setting} />
          ))}
        </ul>
      )}
    </>
  )
}
