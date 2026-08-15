import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { PRODUCTS } from '../data/products'
import { WORLDS } from '../data/worlds'
import { t } from '../lib/i18n'
import { usePageMeta } from '../lib/usePageMeta'

export function Shop() {
  usePageMeta(
    'Catalogue',
    'The full Patidar Doors catalogue — teak timbers, made-to-measure doors, plywood and WPC, all from our own yard and factory.',
  )
  const [params, setParams] = useSearchParams()
  // Normalised, not trusted: `?world=` is in a URL anyone can type or share,
  // and an unrecognised value used to select no chip and filter to nothing —
  // an empty grid with no explanation and no way back to the full list.
  const requested = params.get('world')
  const world = WORLDS.some((w) => w.id === requested) ? (requested as string) : 'all'
  const products = PRODUCTS.filter((p) => world === 'all' || p.world === world)

  return (
    /* One padded block again: the door wall was a full-bleed dark band that had
       to split this page in two, and it now lives on the home page — where it
       is a teaser that sends people *here*, rather than the thing waiting for
       them once they arrive. */
    <div className="shop page-pad">
      <div className="shop__head">
        <div className="kicker">Everything under one roof</div>
        <h1 className="shop__title">Catalogue</h1>
        <p className="shop__sub">
          Timbers, doors, ply and WPC — everything on this page is stocked or made by us. Doors are made to order in
          your exact size; sheet and timber prices are confirmed in store or on WhatsApp.
        </p>
      </div>

      <div className="shop__list">
        <div className="chips" role="group" aria-label={t('shop.filterLabel')}>
          <button
            type="button"
            className={`chip${world === 'all' ? ' chip--on' : ''}`}
            onClick={() => setParams({}, { replace: true })}
          >
            {t('shop.filterAll')}
          </button>
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`chip${world === w.id ? ' chip--on' : ''}`}
              onClick={() => setParams({ world: w.id }, { replace: true })}
            >
              {w.name}
            </button>
          ))}
        </div>

        {/* Reachable two ways: a range the client has unpublished entirely from
            /admin, and a shared link with a stale filter. Either way the answer
            is the store, not a blank grid. */}
        {products.length === 0 ? (
          <div className="empty-range">
            <h2 className="empty-range__title">{t('shop.noneInRange')}</h2>
            <p className="empty-range__body">{t('shop.noneInRangeBody')}</p>
            <button type="button" className="btn btn--dark" onClick={() => setParams({}, { replace: true })}>
              {t('shop.showAll')}
            </button>
          </div>
        ) : (
          <>
            {/* The cards are <h3>s, so without this the page went <h1> straight
                to <h3> and the level the grid sits at did not exist. It also
                says which filter is showing and how many came back, which the
                chips convey visually by which one is lit and not at all
                otherwise. Hidden because the chips already say it on screen. */}
            <h2 className="sr-only">
              {world === 'all'
                ? t('shop.resultsAll', { count: products.length })
                : t('shop.resultsWorld', {
                    count: products.length,
                    world: WORLDS.find((w) => w.id === world)?.name ?? '',
                  })}
            </h2>
            <div className="grid grid--3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
