const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')
const AUTH_KEY = 'spaceship.auth'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// The owner's Basic Auth credentials live only for the browser tab's lifetime.
export const authToken = {
  get: () => sessionStorage.getItem(AUTH_KEY),
  set: (username: string, password: string) =>
    sessionStorage.setItem(AUTH_KEY, btoa(`${username}:${password}`)),
  clear: () => sessionStorage.removeItem(AUTH_KEY),
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

type RequestOptions = { method?: string; body?: unknown; admin?: boolean }

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') return data.detail
    // Validation errors arrive as a list of { msg }.
    if (Array.isArray(data.detail) && typeof data.detail[0]?.msg === 'string') {
      return data.detail[0].msg.replace(/^Value error, /, '')
    }
  } catch {
    // fall through to the generic message
  }
  return `Request failed (${response.status})`
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, admin = true } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = admin ? authToken.get() : null
  if (token) headers.Authorization = `Basic ${token}`

  let response: Response
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Check the connection and try again.")
  }

  if (response.status === 401 && admin) {
    authToken.clear()
    onUnauthorized()
  }
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export type Brief = { id: number; name: string }

export type Customer = {
  id: number
  name: string
  phone: string | null
  token: string
  is_active: boolean
  created_at: string
}

export type Session = {
  id: number
  customer: Brief & { phone: string | null }
  space_type: Brief
  campaign: Brief | null
  started_at: string
  ended_at: string | null
  base_price: number | null
  discount_amount: number | null
  final_price: number | null
}

export type CustomerDetail = Customer & { points_balance: number; sessions: Session[] }

export type OpenSession = Session & {
  elapsed_minutes: number
  billable_hours: number
  estimated_price: number | null
}

export type Bill = Session & {
  duration_minutes: number
  billable_hours: number
  points_earned: number
}

export type PriceTier = {
  id: number
  kind: 'hourly' | 'combo' | 'full_day'
  label: string
  duration_minutes: number
  price: number
}

export type SpaceType = {
  id: number
  name: string
  description: string
  capacity: number
  pricing_mode: 'per_person' | 'per_room'
  price_tiers: PriceTier[]
  is_available: boolean
}

export type Campaign = {
  id: number
  name: string
  condition: string
  discount_type: 'percent' | 'amount'
  discount_value: number
  is_active: boolean
}

export type CampaignInput = Omit<Campaign, 'id'>

/** A space type together with its whole price list, as the owner edits it. */
export type SpaceTypeInput = {
  name: string
  description: string
  capacity: number
  pricing_mode: 'per_person' | 'per_room'
  hourly_price: number
  combos: { hours: number; price: number }[]
  full_day_price: number | null
}

export type Setting = { key: string; value: number }

export type CustomerView = {
  name: string
  points_balance: number
  active_session: { space_type: string; started_at: string } | null
  history: { space_type: string; started_at: string; ended_at: string; hours: number }[]
  total_hours: number
  total_sessions: number
}

export const api = {
  me: () => request<{ username: string }>('/admin/me'),

  customers: () => request<Customer[]>('/admin/customers'),
  customer: (id: number) => request<CustomerDetail>(`/admin/customers/${id}`),
  createCustomer: (name: string, phone: string) =>
    request<Customer>('/admin/customers', { method: 'POST', body: { name, phone } }),
  updateCustomer: (id: number, changes: { name: string; phone: string }) =>
    request<Customer>(`/admin/customers/${id}`, { method: 'PATCH', body: changes }),

  spaceTypes: () => request<SpaceType[]>('/admin/space-types'),
  availableSpaceTypes: () => request<SpaceType[]>('/admin/space-types?available=true'),
  createSpaceType: (body: SpaceTypeInput) =>
    request<SpaceType>('/admin/space-types', { method: 'POST', body }),
  updateSpaceType: (id: number, body: SpaceTypeInput) =>
    request<SpaceType>(`/admin/space-types/${id}`, { method: 'PUT', body }),
  removeSpaceType: (id: number) =>
    request<void>(`/admin/space-types/${id}`, { method: 'DELETE' }),

  /** Active campaigns only: what the owner can pick at checkout. */
  campaigns: () => request<Campaign[]>('/admin/campaigns'),
  allCampaigns: () => request<Campaign[]>('/admin/campaigns?include_inactive=true'),
  createCampaign: (body: CampaignInput) =>
    request<Campaign>('/admin/campaigns', { method: 'POST', body }),
  updateCampaign: (id: number, body: CampaignInput) =>
    request<Campaign>(`/admin/campaigns/${id}`, { method: 'PUT', body }),

  openSessions: () => request<OpenSession[]>('/admin/sessions/open'),
  startSession: (customerId: number, spaceTypeId: number) =>
    request<Session>('/admin/sessions', {
      method: 'POST',
      body: { customer_id: customerId, space_type_id: spaceTypeId },
    }),
  closeSession: (sessionId: number, campaignId: number | null) =>
    request<Bill>(`/admin/sessions/${sessionId}/close`, {
      method: 'POST',
      body: { campaign_id: campaignId },
    }),

  settings: () => request<Setting[]>('/admin/settings'),
  updateSetting: (key: string, value: number) =>
    request<Setting>(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),

  customerView: (token: string) =>
    request<CustomerView>(`/s/${encodeURIComponent(token)}`, { admin: false }),
}
