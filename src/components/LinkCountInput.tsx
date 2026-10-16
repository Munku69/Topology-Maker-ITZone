import { useEffect, useState } from 'react'

interface LinkCountInputProps {
  value: number
  onChange: (value: number) => void
  ariaLabel?: string
}

export function LinkCountInput({ value, onChange, ariaLabel = 'Link count' }: LinkCountInputProps) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    if (!draft) {
      setDraft(String(value))
      return
    }
    const next = Math.min(64, Math.max(1, Number.parseInt(draft, 10)))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      aria-label={ariaLabel}
      onChange={(event) => {
        const nextDraft = event.target.value.replace(/\D/g, '')
        setDraft(nextDraft)
        if (!nextDraft) return
        const next = Number.parseInt(nextDraft, 10)
        if (next >= 1 && next <= 64) onChange(next)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
