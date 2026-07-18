import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { CartProvider } from './cart/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { DoorArtDefs } from './components/DoorArt'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { ToastProvider } from './components/Toast'
import { WhatsAppFloat } from './components/WhatsAppFloat'
import { getWorld } from './data/worlds'
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
    window.scrollTo(0, 0)
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

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <DoorArtDefs />
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
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
