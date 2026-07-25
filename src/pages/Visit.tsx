import { config, whatsappLink } from '../config'
import { usePageMeta } from '../lib/usePageMeta'

export function Visit() {
  usePageMeta('Visit the store', `Visit ${config.brand} — see every timber, door, ply and WPC line in person.`)
  return (
    <div className="page-pad visit">
      <div className="kicker">The real showroom</div>
      <h1 className="page-title">Come see it in person.</h1>
      <p className="visit__lead">
        Websites are previews. The store is the real thing — walk the timber stacks, swing the doors, stack the ply,
        and talk to people who cut wood for a living.
      </p>

      <div className="visit__grid">
        <div className="visit__card">
          <div className="visit__head">Address</div>
          <p>{config.storeAddress}</p>
          <a className="btn btn--dark" href={config.mapsUrl} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        </div>
        <div className="visit__card">
          <div className="visit__head">Hours</div>
          <p>{config.hours}</p>
          <div className="visit__head">Phone</div>
          <p>
            <a className="visit__tel" href={`tel:${config.phoneTel}`}>
              {config.phoneDisplay}
            </a>
          </p>
          <a className="btn btn--dark" href={`tel:${config.phoneTel}`}>
            Call the store
          </a>
        </div>
        <div className="visit__card">
          <div className="visit__head">Before you come</div>
          <p>
            Send your shortlist or measurements on WhatsApp and we’ll have the material pulled out and ready when you
            arrive.
          </p>
          <a
            className="btn btn--wa"
            href={whatsappLink(`Hi ${config.brand}! I'm planning to visit the store.`)}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp us
          </a>
        </div>
      </div>
    </div>
  )
}
