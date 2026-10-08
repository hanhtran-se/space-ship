import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

/** Shared focus ring for anything clickable. */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

// The primary action is a solid dark fill so it reads as "press me"; when it
// can't be pressed it drops to a flat, pale outline that is clearly not the same thing.
const buttonVariants = {
  primary:
    'bg-accent-ink text-white shadow-sm hover:bg-ink active:bg-ink disabled:border disabled:border-line disabled:bg-surface disabled:text-muted/70 disabled:shadow-none',
  secondary:
    'border border-line bg-white text-ink hover:bg-surface active:bg-line/60 disabled:opacity-50',
  ghost: 'text-muted hover:bg-surface hover:text-ink active:bg-line/60 disabled:opacity-50',
}

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${focusRing} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hideLabel?: boolean }

export function Input({ label, hideLabel = false, className = '', ...props }: InputProps) {
  return (
    <label className="block">
      <span className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium'}>{label}</span>
      <input
        className={`h-11 w-full rounded-lg border border-line bg-white px-3 text-base transition placeholder:text-muted/70 hover:border-accent-strong focus:border-accent-ink/40 focus:ring-2 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted ${className}`}
        {...props}
      />
    </label>
  )
}

/** A small set of either/or options, shown side by side. */
export function Choice<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  name: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-3 text-center text-sm transition hover:border-accent-strong hover:bg-surface active:scale-[0.98] has-checked:border-accent-strong has-checked:bg-accent/40 has-checked:font-medium has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-ink"
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Inline message for a failed action or load. */
export function Notice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
    >
      <span>{children}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`shrink-0 cursor-pointer rounded font-medium underline underline-offset-2 hover:text-accent-ink active:opacity-70 ${focusRing}`}
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="py-14 text-center text-sm text-muted">
      {label}
    </p>
  )
}

const tagTones = {
  neutral: 'border-line text-muted',
  green: 'border-green-200 bg-green-50 text-green-700',
}

export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: keyof typeof tagTones
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${tagTones[tone]}`}
    >
      {children}
    </span>
  )
}

/** A bottom sheet on phones, a centered dialog from tablet width up. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink/30 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
          <h2 className="font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`grid size-9 cursor-pointer place-items-center rounded-lg text-xl text-muted transition hover:bg-surface hover:text-ink active:bg-line/60 ${focusRing}`}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
