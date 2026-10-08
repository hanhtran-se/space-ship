export function Brand({ tagline = false }: { tagline?: boolean }) {
  return (
    <span className="inline-flex flex-col leading-none">
      <span className="text-lg font-bold tracking-[0.18em]">SPACESHIP</span>
      {tagline && (
        <span className="mt-1.5 text-[11px] font-medium tracking-[0.14em] text-muted uppercase">
          Cafe &amp; Co-working Space
        </span>
      )}
    </span>
  )
}
