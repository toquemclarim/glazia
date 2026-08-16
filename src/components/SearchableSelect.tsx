import { ChevronsUpDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type SearchOption = { value: string; label: string }

function fold(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function SearchableSelect({
  id,
  value,
  options,
  placeholder = 'Selecione…',
  disabled = false,
  required = false,
  emptyMessage = 'Nenhum resultado',
  onChange,
}: {
  id?: string
  value: string
  options: SearchOption[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  emptyMessage?: string
  onChange: (value: string) => void
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = fold(query.trim())
    if (!q) return options
    return options.filter(
      (o) => fold(o.label).includes(q) || fold(o.value).includes(q),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query, open])

  const pick = (next: string) => {
    onChange(next)
    setQuery('')
    setOpen(false)
  }

  const display = open ? query : (selected?.label ?? '')

  return (
    <div
      ref={rootRef}
      className={`search-select${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}
    >
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!open) setOpen(true)
        }}
        onFocus={() => {
          if (disabled) return
          setQuery('')
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            if (open && filtered[active]) {
              e.preventDefault()
              pick(filtered[active].value)
            }
          } else if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
          }
        }}
      />
      <ChevronsUpDown size={16} className="search-select-caret" aria-hidden />
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="search-select-required"
          value={value}
          required
          onChange={() => undefined}
        />
      )}
      {open && !disabled && (
        <ul id={listId} role="listbox" className="search-select-list">
          {filtered.length === 0 ? (
            <li className="search-select-empty">{emptyMessage}</li>
          ) : (
            filtered.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  className={`search-select-option${i === active ? ' active' : ''}${o.value === value ? ' selected' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
