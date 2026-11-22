import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/usePageMeta'

export function NotFound() {
  usePageMeta('Page not found')
  return (
    <div className="page-pad notfound">
      <div className="notfound__code">404</div>
      <h1 className="page-title">This door doesn’t exist.</h1>
      <p>The page you knocked on has moved or was never built. The catalogue is through here.</p>
      <Link to="/shop" className="btn btn--dark">
        Browse the catalogue
      </Link>
    </div>
  )
}
