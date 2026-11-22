import { useCallback, useEffect, useState } from 'react'
import type { FrameType, HardwareSet, PriceBook } from '../data/pricing'
import { formatFtIn } from '../data/pricing'
import { fmtINR } from '../lib/format'
import { t } from '../lib/i18n'
import { getPriceBook, humanError, savePriceBook } from './api'
import { Card, Field, Notice, RupeeInput, Switch } from './ui'
import { useDirty } from './useDirty'

/**
 * The price book — everything that is the same for every door, entered once.
 *
 * Frames and hardware are lists the owner adds rows to; fitting, the size
 * limits, the stock-board ladder and rounding are single settings. Each door's
 * editor only ticks which frames and hardware apply to it, so a hinge price
 * is typed here and nowhere else.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '')

function uniqueId(base: string, taken: { id: string }[]): string {
  const root = slug(base) || 'item'
  let id = root
  let n = 2
  while (taken.some((x) => x.id === id)) id = `${root}-${n++}`
  return id
}

export function PriceBookPage() {
  const [book, setBook] = useState<PriceBook | null>(null)
  const [savedOnce, setSavedOnce] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { dirty, touch, clean } = useDirty()

  const load = useCallback(async () => {
    setLoadErr(null)
    try {
      const { book, saved } = await getPriceBook()
      setBook(book)
      setSavedOnce(saved)
    } catch (e) {
      setLoadErr(humanError(e))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (patch: Partial<PriceBook>) => {
    touch()
    setOk(null)
    setBook((b) => (b ? { ...b, ...patch } : b))
  }

  async function save() {
    if (!book) return
    setErr(null)
    setOk(null)
    const blankFrame = book.frames.find((f) => !f.name.trim())
    const blankHw = book.hardware.find((h) => !h.name.trim())
    if (blankFrame || blankHw) return setErr('Every frame type and hardware set needs a name — or remove the empty row.')
    if (book.limits.height.min >= book.limits.height.max || book.limits.width.min >= book.limits.width.max)
      return setErr('The smallest size has to be smaller than the largest.')
    setSaving(true)
    try {
      await savePriceBook({
        ...book,
        frames: book.frames.map((f) => ({ ...f, name: f.name.trim(), note: f.note?.trim() || undefined })),
        hardware: book.hardware.map((h) => ({ ...h, name: h.name.trim(), note: h.note?.trim() || undefined })),
      })
      clean()
      setSavedOnce(true)
      setOk('Saved. Every door quotes with these numbers now.')
    } catch (e) {
      setErr(t('ax.saveFailed', { detail: humanError(e) }))
    } finally {
      setSaving(false)
    }
  }

  if (loadErr) {
    return (
      <div className="ax-page">
        <Notice kind="fault" role="alert">
          {t('ax.loadFailed', { detail: loadErr })}
        </Notice>
        <button type="button" className="ax-btn ax-btn--primary" onClick={load}>
          {t('ax.retry')}
        </button>
      </div>
    )
  }
  if (!book) return <div className="ax-page ax-muted">{t('ax.loading')}</div>

  const setFrame = (i: number, patch: Partial<FrameType>) =>
    set({ frames: book.frames.map((f, j) => (j === i ? { ...f, ...patch } : f)) })
  const setHw = (i: number, patch: Partial<HardwareSet>) =>
    set({ hardware: book.hardware.map((h, j) => (j === i ? { ...h, ...patch } : h)) })

  return (
    <div className="ax-page ax-page--book">
      <header className="ax-page__head">
        <div>
          <h1 className="ax-title">Price book</h1>
          <p className="ax-page__sub">
            The numbers every door shares. Each door's own rate lives on that door.
            {!savedOnce && ' These are the starting placeholders — replace them with the shop’s rates.'}
          </p>
        </div>
      </header>

      {err && (
        <Notice kind="fault" role="alert">
          {err}
        </Notice>
      )}
      {ok && !dirty && (
        <Notice kind="ok" role="status">
          {ok}
        </Notice>
      )}

      <div className="ax-page__grid">
        <Card
          title="Frames — chaukhat"
          sub="Priced per running foot around the door. A 3-side frame on a 7′ × 3′ door is 17 rft; a 4-side, 20."
          aside={
            <button
              type="button"
              className="ax-btn"
              onClick={() => set({ frames: [...book.frames, { id: uniqueId('frame', book.frames), name: '', ratePerRft: 0 }] })}
            >
              + Frame type
            </button>
          }
        >
          {book.frames.length === 0 && <p className="ax-hint">No frame types — doors are sold as leaf only.</p>}
          <div className="ax-rows">
            {book.frames.map((f, i) => (
              <div key={f.id} className="ax-rowline">
                <input
                  value={f.name}
                  placeholder="Teak 4″ × 2½″"
                  aria-label="Frame type"
                  maxLength={60}
                  onChange={(e) => setFrame(i, { name: e.target.value })}
                />
                <input
                  value={f.note ?? ''}
                  placeholder="note (optional)"
                  aria-label="Note"
                  maxLength={40}
                  className="ax-rowline__note"
                  onChange={(e) => setFrame(i, { note: e.target.value || undefined })}
                />
                <RupeeInput
                  value={f.ratePerRft || null}
                  onChange={(v) => setFrame(i, { ratePerRft: v ?? 0 })}
                  suffix="per rft"
                  step={10}
                  ariaLabel="Rate per running foot"
                />
                <button
                  type="button"
                  className="ax-ib"
                  aria-label={`Remove ${f.name || 'frame type'}`}
                  onClick={() => set({ frames: book.frames.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <Field label="Matching design carried onto the frame" hint="Flat, per door. Leave at 0 and the choice isn't offered." className="ax-field--inline">
            <RupeeInput value={book.frameDesignExtra || null} onChange={(v) => set({ frameDesignExtra: v ?? 0 })} step={100} />
          </Field>
        </Card>

        <Card
          title="Hardware"
          sub="Sets a customer can add. “None — you fit your own” is always offered first."
          aside={
            <button
              type="button"
              className="ax-btn"
              onClick={() => set({ hardware: [...book.hardware, { id: uniqueId('hardware', book.hardware), name: '', price: 0 }] })}
            >
              + Hardware set
            </button>
          }
        >
          {book.hardware.length === 0 && <p className="ax-hint">No hardware sets — the customer fits their own.</p>}
          <div className="ax-rows">
            {book.hardware.map((h, i) => (
              <div key={h.id} className="ax-rowline">
                <input
                  value={h.name}
                  placeholder="Aldrop + hinges"
                  aria-label="Hardware set"
                  maxLength={60}
                  onChange={(e) => setHw(i, { name: e.target.value })}
                />
                <input
                  value={h.note ?? ''}
                  placeholder="note (optional)"
                  aria-label="Note"
                  maxLength={40}
                  className="ax-rowline__note"
                  onChange={(e) => setHw(i, { note: e.target.value || undefined })}
                />
                <RupeeInput value={h.price || null} onChange={(v) => setHw(i, { price: v ?? 0 })} suffix="per door" step={50} ariaLabel="Price" />
                <button
                  type="button"
                  className="ax-ib"
                  aria-label={`Remove ${h.name || 'hardware set'}`}
                  onClick={() => set({ hardware: book.hardware.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Fitting" sub="Measurement visit and hanging, if charged separately from the leaf.">
          <Field label="Per door" hint="Shown as its own line. 0 = included in the rate." className="ax-field--inline">
            <RupeeInput value={book.fitting || null} onChange={(v) => set({ fitting: v ?? 0 })} step={100} />
          </Field>
        </Card>

        <Card title="Sizes" sub="What the sliders on the site allow, in inches.">
          <div className="ax-limits">
            <Field label="Height">
              <span className="ax-range">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={book.limits.height.min}
                  aria-label="Smallest height"
                  onChange={(e) => set({ limits: { ...book.limits, height: { ...book.limits.height, min: Number(e.target.value) || 0 } } })}
                />
                <span className="ax-range__to">to</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={book.limits.height.max}
                  aria-label="Largest height"
                  onChange={(e) => set({ limits: { ...book.limits, height: { ...book.limits.height, max: Number(e.target.value) || 0 } } })}
                />
                <span className="ax-range__ft">
                  {formatFtIn(book.limits.height.min)} – {formatFtIn(book.limits.height.max)}
                </span>
              </span>
            </Field>
            <Field label="Width">
              <span className="ax-range">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={book.limits.width.min}
                  aria-label="Smallest width"
                  onChange={(e) => set({ limits: { ...book.limits, width: { ...book.limits.width, min: Number(e.target.value) || 0 } } })}
                />
                <span className="ax-range__to">to</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={book.limits.width.max}
                  aria-label="Largest width"
                  onChange={(e) => set({ limits: { ...book.limits, width: { ...book.limits.width, max: Number(e.target.value) || 0 } } })}
                />
                <span className="ax-range__ft">
                  {formatFtIn(book.limits.width.min)} – {formatFtIn(book.limits.width.max)}
                </span>
              </span>
            </Field>
          </div>

          <div className="ax-boards">
            <Switch
              checked={book.boards.enabled}
              onChange={(v) => set({ boards: { ...book.boards, enabled: v } })}
              label="Bill on stock board sizes"
            />
            <p className="ax-hint">
              {book.boards.enabled
                ? 'A chosen size is rounded up to the smallest board that covers it, and that board is what the customer pays for — so a 79″ door costs what an 81″ board costs.'
                : 'Off — the customer pays for the exact size they choose.'}
            </p>
            {book.boards.enabled && (
              <div className="ax-boards__lists">
                <InchList
                  label="Board heights"
                  values={book.boards.heights}
                  onChange={(heights) => set({ boards: { ...book.boards, heights } })}
                />
                <InchList
                  label="Board widths"
                  values={book.boards.widths}
                  onChange={(widths) => set({ boards: { ...book.boards, widths } })}
                />
              </div>
            )}
          </div>
        </Card>

        <Card title="Rounding" sub="Every line of a quote is rounded to this, so the breakdown reads in round numbers.">
          <Field label="Round each line to" className="ax-field--inline">
            <select value={book.roundTo} onChange={(e) => set({ roundTo: Number(e.target.value) || 1 })}>
              {[1, 10, 50, 100, 500].map((n) => (
                <option key={n} value={n}>
                  {fmtINR(n)}
                </option>
              ))}
            </select>
          </Field>
        </Card>
      </div>

      <div className="ax-savebar">
        <span className={`ax-savebar__state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : savedOnce ? 'Saved' : 'Not saved yet — using the placeholders'}</span>
        <button type="button" className="ax-btn ax-btn--primary" disabled={saving || !dirty} onClick={save}>
          {saving ? 'Saving…' : 'Save price book'}
        </button>
      </div>
    </div>
  )
}

/** A row of inch values with an add box — the stock-board ladder in each direction. */
function InchList({ label, values, onChange }: { label: string; values: number[]; onChange: (v: number[]) => void }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const n = Number(draft)
    if (!Number.isFinite(n) || n <= 0) return
    onChange([...new Set([...values, n])].sort((a, b) => a - b))
    setDraft('')
  }
  return (
    <div className="ax-inches">
      <span className="ax-field__label">{label}</span>
      <div className="ax-inches__row">
        {values.map((v) => (
          <span key={v} className="ax-tag ax-tag--plain ax-inches__tag">
            {v}″
            <button type="button" aria-label={`Remove ${v} inches`} onClick={() => onChange(values.filter((x) => x !== v))}>
              ✕
            </button>
          </span>
        ))}
        <span className="ax-inches__add">
          <input
            type="number"
            min={1}
            step={1}
            placeholder="add"
            aria-label={`Add to ${label.toLowerCase()}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button type="button" className="ax-btn ax-btn--sm" onClick={add}>
            Add
          </button>
        </span>
      </div>
    </div>
  )
}
