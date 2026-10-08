import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { Brand } from '../../components/Brand'
import { Button, focusRing } from '../../components/ui'
import { useAuth } from '../../lib/auth-context'

const sections = [
  { to: '/', label: 'Seated', end: true },
  { to: '/customers', label: 'Customers', end: false },
  { to: '/prices', label: 'Prices', end: false },
  { to: '/campaigns', label: 'Campaigns', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export default function AdminLayout() {
  const { signedIn, signOut } = useAuth()
  if (!signedIn) return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-3 sm:px-6">
          <Link to="/" className={`rounded ${focusRing}`} aria-label="SpaceShip home">
            <Brand />
          </Link>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <nav aria-label="Sections" className="mx-auto max-w-5xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1">
            {sections.map((section) => (
              <li key={section.to}>
                <NavLink
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    `inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition active:opacity-70 ${focusRing} ${
                      isActive
                        ? 'border-accent-strong text-ink'
                        : 'border-transparent text-muted hover:border-line hover:text-ink'
                    }`
                  }
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
