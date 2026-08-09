import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { config } from '../config'
import { t } from '../lib/i18n'

/**
 * A failed dynamic `import()` is not a bug — it is a **deploy**. Vercel serves
 * hashed chunk filenames, so any tab that was open across a redeploy asks for a
 * URL that no longer exists the moment it lazy-loads something (the admin, the
 * hero's beams, the stroke headline). The browser throws a plain TypeError and,
 * without a boundary, React unmounts the tree and the visitor gets a white
 * screen on a site whose whole job is to get them to drive to Nagasandra.
 *
 * It reads differently from a real crash and deserves different copy, so it is
 * detected rather than lumped in: the honest message is "reload", not "sorry".
 */
function isStaleChunk(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const s = `${error.name} ${error.message}`
  return (
    /ChunkLoadError/i.test(s) ||
    /Loading( CSS)? chunk \d+ failed/i.test(s) ||
    /Failed to fetch dynamically imported module/i.test(s) ||
    /error loading dynamically imported module/i.test(s) ||
    /'text\/html' is not a valid JavaScript MIME type/i.test(s)
  )
}

/** A hinge plate, hung a few degrees out of true. Drawn, one stroke weight. */
function BrokenHinge() {
  return (
    <svg className="crash__hinge" viewBox="0 0 96 120" width="96" height="120" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
        {/* fixed leaf, plumb to the frame */}
        <rect x="8.5" y="14.5" width="34" height="91" />
        <circle cx="25.5" cy="34" r="3" />
        <circle cx="25.5" cy="60" r="3" />
        <circle cx="25.5" cy="86" r="3" />
        {/* knuckle */}
        <rect x="42.5" y="26.5" width="10" height="67" rx="5" />
        {/* swinging leaf, off true — one screw left, the rest sheared */}
        <g transform="rotate(7 52 60)">
          <rect x="52.5" y="14.5" width="34" height="91" />
          <circle cx="69.5" cy="34" r="3" />
          <path d="M66.5 60h6M69.5 57v6" opacity="0.45" />
          <path d="M66.5 86h6M69.5 83v6" opacity="0.45" />
        </g>
      </g>
    </svg>
  )
}

function CrashScreen({ error, onReload }: { error: unknown; onReload: () => void }) {
  const stale = isStaleChunk(error)
  return (
    <div className="page-pad crash" role="alert">
      <div className="crash__mark">
        <BrokenHinge />
      </div>
      <h1 className="crash__title">{stale ? t('error.stale.title') : t('error.title')}</h1>
      <p className="crash__body">{stale ? t('error.stale.body') : t('error.body')}</p>

      <div className="crash__actions">
        <button type="button" className="btn btn--dark" onClick={onReload}>
          {t('error.reload')}
        </button>
        {!stale && (
          <Link to="/" className="btn btn--ghost">
            {t('error.home')}
          </Link>
        )}
      </div>

      {/* The store is the product — an errored page still knows how to get
          someone to it. The whole sentence is the link so the number keeps a
          thumb-sized target and a translator keeps its punctuation. */}
      <p className="crash__call">
        <a href={`tel:${config.phoneTel}`}>{t('error.callUs', { phone: config.phoneDisplay })}</a>
      </p>

      {import.meta.env.DEV && error instanceof Error && (
        <details className="crash__detail">
          <summary>{t('error.detail')}</summary>
          <pre>{error.stack ?? error.message}</pre>
        </details>
      )}
    </div>
  )
}

interface Props {
  children: ReactNode
  /**
   * Render this instead of the full crash screen. Used for decorative subtrees
   * (the hero's WebGL beams) where the right answer to a failure is for the
   * thing to simply not be there.
   */
  fallback?: ReactNode
  /** Named in the console so a report says which boundary caught it. */
  label?: string
}

interface State {
  error: unknown
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error-reporting service is wired up on this project, so the console is
    // the whole trail. Log the component stack too — without it a minified
    // production stack names nothing.
    console.error(`[${this.props.label ?? 'app'}] render failed`, error, info.componentStack)
  }

  render() {
    if (this.state.error === null) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return (
      <CrashScreen
        error={this.state.error}
        onReload={() => {
          // A stale chunk is only fixed by going back to the server for a fresh
          // index.html; clearing state and re-rendering would ask for the same
          // dead URL again.
          window.location.reload()
        }}
      />
    )
  }
}
