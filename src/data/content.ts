export interface Faq {
  q: string
  a: string
}

export const FAQS: Faq[] = [
  {
    q: 'How does the measurement visit work?',
    a: 'Once you place an order, our team calls within 24 hours to schedule a free visit. A fitter measures your frame to the millimetre, checks the wall and swing side, and confirms the final size with you on the spot. Production starts only after you approve the measurements — and you pay nothing until then.',
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
    q: 'What does the 10-year warranty cover?',
    a: 'Warping beyond 3 mm, delamination, core defects and manufacturing faults in hardware we supply. It does not cover physical damage, water logging of the frame, or repainting of site-finished surfaces. The warranty card is issued digitally with your invoice.',
  },
  {
    q: 'Do you make non-standard sizes?',
    a: 'Yes — every door is cut to your exact frame. The configurator shows five common sizes for instant pricing; if your opening is different, pick the closest size and note the exact dimensions at checkout. Final pricing is confirmed after measurement, at the same per-area rate.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Anytime before production begins — that is, any time up to your post-measurement confirmation — at no cost. Once a leaf is cut to your size it cannot be resold, so cancellations after production starts forfeit the 50% production payment.',
  },
  {
    q: 'Which cities do you serve?',
    a: 'We deliver and install pan-India. Measurement visits are free in metro and tier-1 cities; for remote pincodes we confirm logistics on the scheduling call.',
  },
  {
    q: 'Do you supply frames and hardware too?',
    a: 'Yes. Frames (chaukhat), architraves, hinges, locks and handles can be added during the measurement visit. Doors ship with concealed hinges and the pull shown on the product, unless you choose otherwise.',
  },
]

export interface Testimonial {
  quote: string
  name: string
  place: string
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'The fitter measured on Tuesday, the door arrived in twelve days, and it shut with that soft click you only get from a door that actually fits.',
    name: 'Meera Krishnan',
    place: 'Bengaluru',
  },
  {
    quote:
      'I paid less than the local dealer quoted for plain laminate — and got the fluted sage door everyone asks about.',
    name: 'Arjun Shah',
    place: 'Ahmedabad',
  },
  {
    quote:
      'Three doors, one visit, zero sawdust in the house. They hung them, oiled the hinges and took the packing away.',
    name: 'Ritika & Dev Malhotra',
    place: 'Gurugram',
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
    title: 'Order online',
    body: 'Pick a design, size and finish. Your order books a free measurement visit — you pay nothing yet.',
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
