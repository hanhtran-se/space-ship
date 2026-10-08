import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useState, type FormEvent } from 'react'
import { Button, Input, Modal, Notice, focusRing } from '../../components/ui'
import { api, type Customer } from '../../lib/api'
import { errorText, plural } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'

type Props = {
  customer: Customer
  onChanged: (customer: Customer) => void
  onClose: () => void
}

function EditDetails({ customer, onChanged }: Pick<Props, 'customer' | 'onChanged'>) {
  const [name, setName] = useState(customer.name)
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const unchanged = name.trim() === customer.name && phone.trim() === (customer.phone ?? '')

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await api.updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
      })
      setName(updated.name)
      setPhone(updated.phone ?? '')
      setSaved(true)
      onChanged(updated)
    } catch (err) {
      // Includes "This phone number already belongs to …" from the server.
      setError(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Input
        label="Name"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setSaved(false)
        }}
        maxLength={200}
        disabled={saving}
        required
      />
      <Input
        label="Phone number"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value)
          setSaved(false)
        }}
        maxLength={20}
        disabled={saving}
        required
      />
      {error && <Notice>{error}</Notice>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || unchanged || !name.trim() || !phone.trim()}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && (
          <span role="status" className="text-sm text-muted">
            Saved
          </span>
        )}
      </div>
    </form>
  )
}

export default function CustomerDialog({ customer, onChanged, onClose }: Props) {
  const link = `${window.location.origin}/s/${customer.token}`
  const loadDetail = useCallback(() => api.customer(customer.id), [customer.id])
  const detail = useQuery(loadDetail)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <Modal title={customer.name} onClose={onClose}>
      <section aria-label="Magic link">
        <p className="text-sm text-muted">
          Share this private link with {customer.name}. It shows only their own visits, and nothing
          on it can be changed.
        </p>

        <div className="mt-4 flex justify-center rounded-xl border border-line p-5">
          <QRCodeSVG value={link} size={168} fgColor="#2a2520" marginSize={0} />
        </div>

        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className={`mt-3 block rounded-lg bg-surface px-3 py-2.5 text-sm break-all underline-offset-2 transition hover:underline active:opacity-70 ${focusRing}`}
        >
          {link}
        </a>

        <Button variant="primary" className="mt-3 w-full" onClick={copy}>
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </Button>
        {copyState === 'failed' && (
          <p className="mt-2 text-center text-xs text-muted">
            Couldn’t copy automatically — select the link above and copy it.
          </p>
        )}
      </section>

      <section aria-label="Activity" className="mt-6 border-t border-line pt-4 text-sm">
        {detail.error && <Notice onRetry={detail.reload}>{detail.error}</Notice>}
        {detail.loading && !detail.data && (
          <p role="status" className="text-muted">
            Loading activity…
          </p>
        )}
        {detail.data && (
          <dl className="flex gap-8">
            <div>
              <dt className="text-muted">Loyalty points</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {detail.data.points_balance}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Visits</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {plural(detail.data.sessions.length, 'session')}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-label="Edit details" className="mt-6 border-t border-line pt-4">
        <h3 className="mb-3 text-sm font-medium">Details</h3>
        <EditDetails customer={customer} onChanged={onChanged} />
      </section>
    </Modal>
  )
}
