/**
 * The four category "worlds". Each gets its own themed page
 * (see [data-world] scopes in styles/worlds.css).
 */

import type { WorldId } from './products'

export interface World {
  id: WorldId
  name: string
  /** short display label for doors/chips */
  short: string
  tagline: string
  description: string
  /** ordered section headers on the world page; products map via Product.sub */
  subcategories: string[]
}

export const WORLDS: World[] = [
  {
    id: 'timbers',
    name: 'Timbers',
    short: 'TIMBERS',
    tagline: 'Straight from the saw line',
    description:
      'Burma teak to seasoned neem — logs bought whole, sawn in our own yard, and cut to your list. Walk the stacks, tap the grain, take home exactly the wood you chose.',
    subcategories: ['Teak', 'Honne', 'Sal', 'Hardwood & Neem'],
  },
  {
    id: 'doors',
    name: 'Doors',
    short: 'DOORS',
    tagline: 'Made to measure, made to last',
    description:
      'Solid teak heirlooms, veneer and laminate designers, membrane and primer lines — every leaf built in our factory and finished to your frame.',
    subcategories: [
      'Teak Doors',
      'Hardwood Doors',
      'Veneer Doors',
      'Laminate & Coated',
      'Membrane Doors',
      'Designer Studio',
      'Safety Doors',
    ],
  },
  {
    id: 'ply',
    name: 'Ply',
    short: 'PLY',
    tagline: 'Engineered flat. Guaranteed straight.',
    description:
      'From everyday commercial sheets to calibrated 710 marine grades and dead-straight blockboards — the panel range behind every wardrobe, kitchen and site we supply.',
    subcategories: ['Plywood', '710 Marine Grade', 'Calibrated', 'Blockboard'],
  },
  {
    id: 'wpc',
    name: 'WPC',
    short: 'WPC',
    tagline: 'Wood looks. Waterproof for life.',
    description:
      'Solid WPC boards and doors that never swell, never host termites, and never mind a wet bathroom. Six thicknesses, two densities, CNC and digital-veneer faces.',
    subcategories: ['WPC Sheets', 'WPC Doors'],
  },
]

export function getWorld(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id)
}
