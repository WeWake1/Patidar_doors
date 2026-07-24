import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { CartProvider } from './cart/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { DoorArtDefs } from './components/DoorArt'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { ToastProvider } from './components/Toast'
import { WhatsAppFloat } from './components/WhatsAppFloat'
import { getWorld } from './data/worlds'
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
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
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
      <ToastProvider>
        <CartProvider>
          <DoorArtDefs />
          <Routes>
            <Route
              path="/admin/*"
              element={
                <Suspense fallback={<div className="ax-pad">Loading admin…</div>}>
                  <AdminApp />
                </Suspense>
              }
            />
            <Route path="*" element={<Storefront />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
