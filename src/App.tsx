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
import { Checkout } from './pages/Checkout'
import { DevGallery } from './pages/DevGallery'
import { Faq } from './pages/Faq'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { OrderConfirmed } from './pages/OrderConfirmed'
import { Policies } from './pages/Policies'
import { Product } from './pages/Product'
import { Shop } from './pages/Shop'
import { Visit } from './pages/Visit'
import { WorldPage } from './pages/WorldPage'

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/timbers" element={<WorldRoute id="timbers" />} />
            <Route path="/doors" element={<WorldRoute id="doors" />} />
            <Route path="/ply" element={<WorldRoute id="ply" />} />
            <Route path="/wpc" element={<WorldRoute id="wpc" />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/door/:id" element={<LegacyDoorRedirect />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmed" element={<OrderConfirmed />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/policies" element={<Policies />} />
            {import.meta.env.DEV && <Route path="/dev/gallery" element={<DevGallery />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
