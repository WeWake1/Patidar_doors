import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CartProvider } from './cart/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { DoorArtDefs } from './components/DoorArt'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { ToastProvider } from './components/Toast'
import { WhatsAppFloat } from './components/WhatsAppFloat'
import { Checkout } from './pages/Checkout'
import { Faq } from './pages/Faq'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { OrderConfirmed } from './pages/OrderConfirmed'
import { Policies } from './pages/Policies'
import { Product } from './pages/Product'
import { Shop } from './pages/Shop'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
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
              <Route path="/shop" element={<Shop />} />
              <Route path="/door/:id" element={<Product />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmed" element={<OrderConfirmed />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/policies" element={<Policies />} />
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
