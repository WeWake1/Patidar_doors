import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import type { ArtId } from '../data/products'
import { getProduct, getTone } from '../data/products'
import { fmtINR } from '../lib/format'
import { DoorArt } from './DoorArt'

export function CartDrawer() {
  const cart = useCart()
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!cart.isOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cart.closeCart()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [cart.isOpen, cart])

  if (!cart.isOpen) return null

  return (
    <>
      <div className="drawer__overlay" onClick={cart.closeCart} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="drawer__head">
          <div className="drawer__title">Your cart</div>
          <button ref={closeRef} type="button" className="drawer__close" onClick={cart.closeCart} aria-label="Close cart">
            ✕
          </button>
        </div>

        <div className="drawer__body">
          {cart.lines.length === 0 ? (
            <div className="drawer__empty">
              <div className="drawer__empty-title">Your cart is empty</div>
              <p>Every great room starts at the door.</p>
              <button
                type="button"
                className="btn btn--dark"
                onClick={() => {
                  cart.closeCart()
                  navigate('/shop')
                }}
              >
                Browse doors
              </button>
            </div>
          ) : (
            cart.lines.map((l) => {
              const product = getProduct(l.productId)
              if (!product) return null
              return (
                <div key={l.key} className="drawer__line">
                  <div className="drawer__thumb">
                    <DoorArt art={l.art as ArtId} tone={getTone(product, l.toneId)} />
                  </div>
                  <div className="drawer__line-main">
                    <div className="drawer__line-name">{l.name}</div>
                    <div className="drawer__line-meta">
                      {l.sizeLabel} · {l.toneName}
                    </div>
                    <div className="drawer__line-meta">{fmtINR(l.unitPrice)} each</div>
                    <div className="drawer__line-controls">
                      <div className="qty">
                        <button type="button" onClick={() => cart.setQty(l.key, -1)} aria-label={`Decrease quantity of ${l.name}`}>
                          −
                        </button>
                        <span>{l.qty}</span>
                        <button type="button" onClick={() => cart.setQty(l.key, 1)} aria-label={`Increase quantity of ${l.name}`}>
                          +
                        </button>
                      </div>
                      <button type="button" className="drawer__remove" onClick={() => cart.remove(l.key)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="drawer__line-total">{fmtINR(l.lineTotal)}</div>
                </div>
              )
            })
          )}
        </div>

        {cart.lines.length > 0 && (
          <div className="drawer__foot">
            <div className="drawer__foot-row">
              <span>Measurement visit & installation</span>
              <span className="drawer__included">Included</span>
            </div>
            <div className="drawer__foot-row drawer__foot-row--total">
              <span>Subtotal</span>
              <span className="drawer__subtotal">{fmtINR(cart.subtotal)}</span>
            </div>
            <button
              type="button"
              className="btn btn--dark btn--block"
              onClick={() => {
                cart.closeCart()
                navigate('/checkout')
              }}
            >
              Proceed to checkout
            </button>
            <div className="drawer__note">Pay after the measurement visit · Cancel anytime before production</div>
          </div>
        )}
      </aside>
    </>
  )
}
