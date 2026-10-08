import { useState, type FormEvent } from 'react'
import { Button, Empty, Input, Loading, Notice, PageHeader, focusRing } from '../../components/ui'
import { api, type Customer } from '../../lib/api'
import { errorText, matchesCustomer, plural } from '../../lib/format'
import { useQuery } from '../../lib/useQuery'
import CustomerDialog from './CustomerDialog'

export default function CustomersPage() {
  const { data: customers, error, loading, reload } = useQuery(api.customers)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [opened, setOpened] = useState<Customer | null>(null)

  async function addCustomer(event: FormEvent) {
    event.preventDefault()
    setAdding(true)
    setAddError(null)
    try {
      const customer = await api.createCustomer(name.trim(), phone.trim())
      setName('')
      setPhone('')
      reload()
      // Straight to the link, so the owner can share it while the customer is there.
      setOpened(customer)
    } catch (err) {
      setAddError(errorText(err))
    } finally {
      setAdding(false)
    }
  }

  const matches = (customers ?? []).filter((customer) => matchesCustomer(customer, search))

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={customers ? plural(customers.length, 'customer') : undefined}
      />

      <form onSubmit={addCustomer} className="mb-8 rounded-xl border border-line p-5">
        <h2 className="mb-3 font-medium">New customer</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Name"
              placeholder="Customer name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
              disabled={adding}
              required
            />
          </div>
          <div className="flex-1">
            <Input
              label="Phone number"
              type="tel"
              inputMode="tel"
              placeholder="0901 234 567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={20}
              disabled={adding}
              required
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={adding || name.trim() === '' || phone.trim() === ''}
          >
            {adding ? 'Adding…' : 'Add customer'}
          </Button>
        </div>
        {addError && (
          <div className="mt-3">
            <Notice>{addError}</Notice>
          </div>
        )}
      </form>

      {error && (
        <div className="mb-4">
          <Notice onRetry={reload}>{error}</Notice>
        </div>
      )}

      {loading && !customers && <Loading />}

      {customers && customers.length === 0 && (
        <Empty title="No customers yet" hint="Add the first one above to get their magic link." />
      )}

      {customers && customers.length > 0 && (
        <>
          <div className="mb-3 max-w-xs">
            <Input
              label="Search customers"
              hideLabel
              type="search"
              placeholder="Search by name or phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {matches.length === 0 ? (
            <Empty title={`No customer matches “${search}”`} hint="Try a name, a phone number, or both." />
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {matches.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => setOpened(customer)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface active:bg-line/50 ${focusRing}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{customer.name}</span>
                      <span className="block text-sm text-muted tabular-nums">
                        {customer.phone ?? 'No phone number'}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-muted">Details →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {opened && (
        <CustomerDialog
          customer={opened}
          onChanged={(customer) => {
            setOpened(customer)
            reload()
          }}
          onClose={() => setOpened(null)}
        />
      )}
    </>
  )
}
