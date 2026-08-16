import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { CartProvider } from './cart/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { DoorArtDefs } from './components/DoorArt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { ToastProvider } from './components/Toast'
import { WhatsAppFloat } from './components/WhatsAppFloat'
import { getWorld } from './data/worlds'
import { t } from './lib/i18n'
import { smoothScrollTo, useSmoothScroll } from './lib/smoothScroll'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'

/* Home and NotFound stay eager: Home is the landing route for nearly every
   visitor, so splitting it would only buy it a second round trip, and NotFound
   is both tiny and the fallback that WorldRoute and Product render inline.
   Everything else is split.

   This is a client-rendered site on Indian mobile data, so the first bundle IS
   the time to first paint — and it was carrying the whole catalogue: the
   pricing table and the configurator, the Door Wall's 3D drift, the checkout
   form and its order serialiser, all downloaded and parsed before the hero
   could draw. None of it is reachable from the home page without a tap first. */
const Shop = lazy(() => import('./pages/Shop').then((m) => ({ default: m.Shop })))
const Product = lazy(() => import('./pages/Product').then((m) => ({ default: m.Product })))
const WorldPage = lazy(() => import('./pages/WorldPage').then((m) => ({ default: m.WorldPage })))
const Visit = lazy(() => import('./pages/Visit').then((m) => ({ default: m.Visit })))
const Checkout = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })))
const OrderConfirmed = lazy(() => import('./pages/OrderConfirmed').then((m) => ({ default: m.OrderConfirmed })))
const Faq = lazy(() => import('./pages/Faq').then((m) => ({ default: m.Faq })))
const Policies = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Policies })))
const DevGallery = lazy(() => import('./pages/DevGallery').then((m) => ({ default: m.DevGallery })))
const TryAtHome = lazy(() => import('./pages/TryAtHome').then((m) => ({ default: m.TryAtHome })))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Immediate — going through Lenis (not a raw scrollTo) keeps its
    // internal target-scroll state in sync so the next wheel tick doesn't
    // snap back to wherever the previous page had scrolled to.
    smoothScrollTo(0, { immediate: true })
  }, [pathname])
  return null
}

/** Old product URLs (/door/:id) keep working. */
function LegacyDoorRedirect() {
  const { id } = useParams()
  return <Navigate to={`/product/${id}`} replace />
}

function WorldRoute({ id }: { id: string }) {
  const world = getWorld(id)
  if (!world) return <NotFound />
  return <WorldPage key={id} world={world} />
}

// The admin is a separate, auth-gated app — lazy-loaded so supabase-js and the
// cropper stay out of the public store bundle.
const AdminApp = lazy(() => import('./admin/AdminApp'))

/** The public storefront, with its nav/footer/cart chrome. */
function Storefront() {
  useSmoothScroll()
  // Keying the page boundary on the path means navigating away from a crashed
  // page clears it — the nav and footer survive the crash, so the visitor can
  // always walk out of it rather than being stuck until they reload.
  const { pathname } = useLocation()
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <ErrorBoundary key={pathname} label="page">
          {/* A route chunk is a few kB and normally lands before this ever
              paints, so the hold is deliberately not a spinner — it reserves
              the height the page would have taken and nothing else. Without the
              reserve <main> collapses to zero and the footer jumps up the
              screen, which is a layout shift paid on every navigation. */}
          <Suspense fallback={<div className="route-hold" aria-hidden="true" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/timbers" element={<WorldRoute id="timbers" />} />
              <Route path="/doors" element={<WorldRoute id="doors" />} />
              <Route path="/ply" element={<WorldRoute id="ply" />} />
              <Route path="/wpc" element={<WorldRoute id="wpc" />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<Product />} />
              <Route path="/try/:id" element={<TryAtHome />} />
              <Route path="/door/:id" element={<LegacyDoorRedirect />} />
              <Route path="/visit" element={<Visit />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmed" element={<OrderConfirmed />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/policies" element={<Policies />} />
              {import.meta.env.DEV && <Route path="/dev/gallery" element={<DevGallery />} />}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Outermost boundary. The page-level one inside <Storefront> catches
          almost everything and keeps the chrome; this one exists for the two
          things above it — the cart's stored state and the router itself. */}
      <ErrorBoundary label="root">
        <ToastProvider>
          <CartProvider>
            <DoorArtDefs />
            <Routes>
              <Route
                path="/admin/*"
                element={
                  <ErrorBoundary label="admin">
                    <Suspense fallback={<div className="ax-pad">{t('ax.loading')}</div>}>
                      <AdminApp />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route path="*" element={<Storefront />} />
            </Routes>
          </CartProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
