import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MAX_QTY_PER_LINE, useCart } from '../cart/CartContext'
import type { ArtId } from '../data/products'
import { getProduct, getTone } from '../data/products'
import { config } from '../config'
import { fmtINR } from '../lib/format'
import { t } from '../lib/i18n'
import { useScrollLock } from '../lib/useScrollLock'
import { DoorArt } from './DoorArt'

export function CartDrawer() {
  const cart = useCart()
  const navigate = useNavigate()
  const closeRef = useRef<HTMLButtonElement>(null)

  useScrollLock(cart.isOpen)

  useEffect(() => {
    if (!cart.isOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cart.closeCart()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cart.isOpen, cart])

  if (!cart.isOpen) return null

  return (
    <>
      <div className="drawer__overlay" onClick={cart.closeCart} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t('cart.title')}>
        <div className="drawer__head">
          <div className="drawer__title">{t('cart.title')}</div>
          <button ref={closeRef} type="button" className="drawer__close" onClick={cart.closeCart} aria-label={t('cart.close')}>
            ✕
          </button>
        </div>

        <div className="drawer__body">
          {cart.lines.length === 0 ? (
            <div className="drawer__empty">
              <div className="drawer__empty-title">{t('cart.empty.title')}</div>
              <p>{t('cart.empty.body')}</p>
              <button
                type="button"
                className="btn btn--dark"
                onClick={() => {
                  cart.closeCart()
                  navigate('/shop')
                }}
              >
                {t('cart.browse')}
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
                    <div className="drawer__line-meta">{l.optsLabel}</div>
                    <div className="drawer__line-meta">{t('cart.each', { price: fmtINR(l.unitPrice) })}</div>
                    <div className="drawer__line-controls">
                      <div className="qty">
                        <button
                          type="button"
                          onClick={() => cart.setQty(l.key, -1)}
                          aria-label={t('cart.decrease', { name: l.name })}
                        >
                          −
                        </button>
                        <span>{l.qty}</span>
                        {/* Disabled rather than silently ignored at the ceiling
                            — a + that does nothing reads as a broken button. */}
                        <button
                          type="button"
                          onClick={() => cart.setQty(l.key, 1)}
                          disabled={l.qty >= MAX_QTY_PER_LINE}
                          aria-label={t('cart.increase', { name: l.name })}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="drawer__remove"
                        onClick={() => cart.remove(l.key)}
                        aria-label={t('cart.removeNamed', { name: l.name })}
                      >
                        {t('cart.remove')}
                      </button>
                    </div>
                    {l.qty >= MAX_QTY_PER_LINE && <div className="drawer__cap">{t('cart.maxQty')}</div>}
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
              <span>{t('cart.included', { city: config.serviceCity })}</span>
              <span className="drawer__included">{t('cart.includedValue')}</span>
            </div>
            <div className="drawer__foot-row drawer__foot-row--total">
              <span>{t('cart.subtotal')}</span>
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
              {t('cart.checkout')}
            </button>
            <div className="drawer__note">{t('cart.note')}</div>
          </div>
        )}
      </aside>
    </>
  )
}
