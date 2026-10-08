import { useState, type FormEvent } from 'react'
import { Button, Choice, Input, Modal, Notice, focusRing } from '../../components/ui'
import { api, type SpaceType, type SpaceTypeInput } from '../../lib/api'
import { errorText } from '../../lib/format'

const MAX_COMBOS = 3

type ComboRow = { hours: string; price: string }

type Props = {
  /** null = create a new space type */
  spaceType: SpaceType | null
  onSaved: () => void
  onClose: () => void
}

function tierPrice(spaceType: SpaceType | null, kind: 'hourly' | 'full_day'): string {
  const tier = spaceType?.price_tiers.find((t) => t.kind === kind)
  return tier ? String(tier.price) : ''
}

function existingCombos(spaceType: SpaceType | null): ComboRow[] {
  return (spaceType?.price_tiers ?? [])
    .filter((tier) => tier.kind === 'combo')
    .map((tier) => ({ hours: String(tier.duration_minutes / 60), price: String(tier.price) }))
}

export default function SpaceTypeDialog({ spaceType, onSaved, onClose }: Props) {
  const [name, setName] = useState(spaceType?.name ?? '')
  const [description, setDescription] = useState(spaceType?.description ?? '')
  const [mode, setMode] = useState<SpaceTypeInput['pricing_mode']>(
    spaceType?.pricing_mode ?? 'per_person',
  )
  const [capacity, setCapacity] = useState(String(spaceType?.capacity ?? 1))
  const [hourlyPrice, setHourlyPrice] = useState(tierPrice(spaceType, 'hourly'))
  const [combos, setCombos] = useState<ComboRow[]>(existingCombos(spaceType))
  const [fullDayPrice, setFullDayPrice] = useState(tierPrice(spaceType, 'full_day'))
  const [busy, setBusy] = useState<'saving' | 'removing' | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setCombo(index: number, change: Partial<ComboRow>) {
    setCombos((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const body: SpaceTypeInput = {
      name: name.trim(),
      description: description.trim(),
      pricing_mode: mode,
      capacity: mode === 'per_room' ? Number(capacity) : 1,
      hourly_price: Number(hourlyPrice),
      combos: combos.map((combo) => ({ hours: Number(combo.hours), price: Number(combo.price) })),
      full_day_price: fullDayPrice === '' ? null : Number(fullDayPrice),
    }
    setBusy('saving')
    setError(null)
    try {
      if (spaceType) await api.updateSpaceType(spaceType.id, body)
      else await api.createSpaceType(body)
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setBusy(null)
    }
  }

  async function remove() {
    if (!spaceType) return
    setBusy('removing')
    setError(null)
    try {
      await api.removeSpaceType(spaceType.id)
      onSaved()
    } catch (err) {
      setError(errorText(err))
      setBusy(null)
      setConfirmingRemove(false)
    }
  }

  const disabled = busy !== null

  return (
    <Modal title={spaceType ? `Edit ${spaceType.name}` : 'Add space type'} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <Input
            label="Name"
            placeholder="Single Desk, Amazon Room…"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            disabled={disabled}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="Where it is, what it includes"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            disabled={disabled}
          />
          <Choice
            label="Charged"
            name="pricing-mode"
            value={mode}
            onChange={setMode}
            disabled={disabled}
            options={[
              { value: 'per_person', label: 'Per person (desk)' },
              { value: 'per_room', label: 'Per room' },
            ]}
          />
          {mode === 'per_room' && (
            <Input
              label="Capacity (people)"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              disabled={disabled}
              required
            />
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <h3 className="font-medium">Prices (₫)</h3>
          <Input
            label="Price per hour"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="15000"
            value={hourlyPrice}
            onChange={(event) => setHourlyPrice(event.target.value)}
            disabled={disabled}
            required
          />

          <fieldset disabled={disabled}>
            <legend className="mb-1.5 text-sm font-medium">
              Combos <span className="font-normal text-muted">(up to {MAX_COMBOS})</span>
            </legend>
            {combos.length === 0 && (
              <p className="text-sm text-muted">No combos. Every hour is charged at the hourly price.</p>
            )}
            <ul className="flex flex-col gap-2">
              {combos.map((combo, index) => (
                <li key={index} className="flex items-end gap-2">
                  <div className="w-24">
                    <Input
                      label={`Combo ${index + 1} hours`}
                      hideLabel
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={24}
                      step={1}
                      placeholder="Hours"
                      value={combo.hours}
                      onChange={(event) => setCombo(index, { hours: event.target.value })}
                      required
                    />
                  </div>
                  <span className="pb-3 text-sm text-muted">h for</span>
                  <div className="flex-1">
                    <Input
                      label={`Combo ${index + 1} price`}
                      hideLabel
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="Price"
                      value={combo.price}
                      onChange={(event) => setCombo(index, { price: event.target.value })}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove combo ${index + 1}`}
                    onClick={() => setCombos((rows) => rows.filter((_, i) => i !== index))}
                    className={`grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-xl text-muted transition hover:bg-surface hover:text-ink active:bg-line/60 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {combos.length < MAX_COMBOS && (
              <Button
                className="mt-2"
                onClick={() => setCombos((rows) => [...rows, { hours: '', price: '' }])}
              >
                Add combo
              </Button>
            )}
          </fieldset>

          <Input
            label="Full-day price (optional)"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="80000"
            value={fullDayPrice}
            onChange={(event) => setFullDayPrice(event.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted">
            New prices apply to sessions closed from now on. Bills already issued don’t change.
          </p>
        </section>

        {error && <Notice>{error}</Notice>}

        <Button type="submit" variant="primary" className="w-full" disabled={disabled}>
          {busy === 'saving' ? 'Saving…' : spaceType ? 'Save changes' : 'Add space type'}
        </Button>

        {spaceType && (
          <div className="border-t border-line pt-4">
            {confirmingRemove ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">Remove {spaceType.name}? Past sessions are kept.</p>
                <div className="flex gap-2">
                  <Button onClick={() => setConfirmingRemove(false)} disabled={disabled}>
                    Keep
                  </Button>
                  <Button onClick={remove} disabled={disabled}>
                    {busy === 'removing' ? 'Removing…' : 'Yes, remove'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setConfirmingRemove(true)}
                disabled={disabled}
              >
                Remove this space type
              </Button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}
