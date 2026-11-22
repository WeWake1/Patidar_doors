/**
 * Home-page and FAQ copy.
 *
 * ⚠️ Claim discipline: nothing in this file may state a number, a term or a
 * guarantee the client has not confirmed. The warranty duration, the coverage
 * list and the pan-India service reach were all removed on 2026-08-08 for
 * exactly that reason — see PRODUCT.md § "Evidence on Hand" before adding any
 * of them back. The 30-working-day refund guarantee in Policies.tsx went the
 * same way on 2026-08-14, confirmed unverified by the client. One claim is
 * still unverified and tracked in PRODUCT.md rather than fixed:
 * "Screw-holding certified" in products.ts.
 *
 * The 24-hour callback below *is* confirmed (client, 2026-08-14) and is stated
 * in three places — this FAQ, the checkout intro and the order-confirmed steps.
 * Change it in all three or none.
 */
export interface Faq {
  q: string
  a: string
}

export const FAQS: Faq[] = [
  {
    q: 'Can I see the doors and materials in person?',
    a: 'Please do — that is what we are built for. Our store and factory carry every timber, door, ply and WPC line on this site. Walk in during working hours, touch the material, compare finishes side by side, and our team will help you shortlist. Everything you see online is a preview of what is on the floor.',
  },
  {
    q: 'How does the measurement visit work?',
    a: 'Once your order reaches us on WhatsApp, we call within 24 hours to schedule a free visit anywhere in Bengaluru. A fitter measures your frame to the millimetre, checks the wall and swing side, and confirms the final size with you on the spot. Production starts only after you approve the measurements — and you pay nothing until then.',
  },
  {
    q: 'When do I pay?',
    a: 'After the measurement visit, once you confirm the order. We collect 50% to begin production and the balance after installation is complete and you have inspected the door. No advance is taken online.',
  },
  {
    q: 'How long until my door is installed?',
    a: 'Made-to-measure production takes 10–14 working days after measurement. Delivery and installation are scheduled together — most orders are hung, aligned and finished within 3 weeks of ordering.',
  },
  {
    q: 'Is there a warranty?',
    a: 'Yes — every door we make is covered against manufacturing defects. Ask us for the exact term and what it covers before you order; the written warranty is issued with your final invoice, so you have it in hand either way.',
  },
  {
    q: 'Do you make non-standard sizes?',
    a: 'Yes — every door is cut to your exact frame. Set the height and width you need on the product page, to the quarter inch, and the price updates as you go. It climbs in steps rather than smoothly because a leaf is cut from a stock board: your size is rounded up to the smallest board that covers it, and you pay for that board. The final size is confirmed at the measurement visit, at the same rate.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Anytime before production begins — that is, any time up to your post-measurement confirmation — at no cost. Once a leaf is cut to your size it cannot be resold, so cancellations after production starts forfeit the 50% production payment.',
  },
  {
    q: 'Which areas do you serve?',
    a: 'Measurement, delivery and installation are handled by our own crews across Bengaluru, and the visit is free. Beyond the city we supply the material — timber, ply and made-to-measure doors can be freighted to you, but fitting is not included. Message us with your pincode and we will tell you what we can do before you order.',
  },
  {
    q: 'Do you supply frames and hardware too?',
    a: 'Yes. Frames (chaukhat), architraves, hinges, locks and handles can be added during the measurement visit. Doors ship with concealed hinges and the pull shown on the product, unless you choose otherwise.',
  },
]

/**
 * The payment sequence, shown on the home page in place of the testimonials
 * that used to sit there. Those three quotes were written by AI and attributed
 * to people who do not exist; they were removed on 2026-08-08.
 *
 * What replaced them is the one thing on this page that is both fully confirmed
 * and genuinely reassuring to a stranger deciding whether to drive to
 * Nagasandra: when money actually changes hands. Every step below comes from
 * PRODUCT.md § "Operating Context". Do not add a fourth step, a discount or a
 * deadline — the sequence is the whole point, and its credibility is that it is
 * plainly true.
 */
export interface PaymentStep {
  /** The amount, set large in gold. Kept short — it has to hold at 44px. */
  amount: string
  when: string
  body: string
}

export const PAYMENT_STEPS: PaymentStep[] = [
  {
    amount: '₹0',
    when: 'Today',
    body: 'Shortlist here or in the store and send it over. Nothing is collected on this website, and no card is asked for.',
  },
  {
    amount: '50%',
    when: 'After you approve the measurements',
    body: 'A fitter measures your frame, confirms the size and the price with you, and leaves. Production starts only once you say yes.',
  },
  {
    /* "Balance", not "The rest": it is the word the checkout summary already
       uses for this line, and a short one keeps the three amounts reading as
       one column rather than turning the last into a headline. */
    amount: 'Balance',
    when: 'After it is hung',
    body: 'Paid when the door is installed, aligned and you have inspected it — not before.',
  },
]

export interface ProcessStep {
  n: string
  title: string
  body: string
}

export const PROCESS: ProcessStep[] = [
  {
    n: '01',
    title: 'Browse, then visit',
    body: 'Shortlist online or walk into our store — see the timber, feel the finish, and book a free measurement visit. You pay nothing yet.',
  },
  {
    n: '02',
    title: 'We measure',
    body: 'A fitter checks your frame to the millimetre and confirms the final size and price with you.',
  },
  {
    n: '03',
    title: 'We make',
    body: 'Your leaf is cut, pressed, finished and quality-checked in our own factory. 10–14 working days.',
  },
  {
    n: '04',
    title: 'We install',
    body: 'Delivered by our crew, hung on our hinges, aligned, sealed — and the site left clean.',
  },
]
