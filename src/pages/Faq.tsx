import { Link } from 'react-router-dom'
import { FAQS } from '../data/content'
import { usePageMeta } from '../lib/usePageMeta'

export function Faq() {
  usePageMeta('FAQ', 'Measurement visits, payment, warranty, delivery timelines and cancellation — answered.')
  return (
    <div className="page-pad faqpage">
      <div className="kicker">Good to know</div>
      <h1 className="page-title">Questions, answered.</h1>
      <p className="faqpage__sub">
        Everything about ordering a made-to-measure door. Can’t find your answer?{' '}
        <Link to="/policies">Read our policies</Link> or message us on WhatsApp.
      </p>
      <div className="faqpage__list">
        {FAQS.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
