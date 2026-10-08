import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import storefront from '../../assets/storefront-tall.jpg'
import { Brand } from '../../components/Brand'
import { Button, Input, Notice } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth-context'
import { errorText } from '../../lib/format'

export default function LoginPage() {
  const { signedIn, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (signedIn) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(username, password)
    } catch (err) {
      const wrongCredentials = err instanceof ApiError && err.status === 401
      setError(wrongCredentials ? 'Wrong username or password.' : errorText(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <Brand tagline />
          <h1 className="mt-12 text-2xl font-semibold tracking-tight">Owner sign in</h1>
          <p className="mt-1 text-sm text-muted">Manage check-ins, customers and prices.</p>

          <div className="mt-8 space-y-4">
            <Input
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="mt-4">
              <Notice>{error}</Notice>
            </div>
          )}

          <Button type="submit" variant="primary" disabled={submitting} className="mt-6 w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </main>

      <div className="hidden p-3 md:block">
        <img
          src={storefront}
          alt="The storefront with outdoor seating"
          className="h-full max-h-[calc(100dvh-1.5rem)] w-full rounded-2xl object-cover"
        />
      </div>
    </div>
  )
}
