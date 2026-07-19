import { defineField, defineType } from 'sanity'

/**
 * One catalog product. Mirrors the site's Product shape
 * (doorswala/src/data/products.ts) — scripts/fetch-catalog.mjs converts
 * published documents into the site bundle.
 */
export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'photos', title: 'Photos' },
    { name: 'pricing', title: 'Pricing' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'basics',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Link name (slug)',
      description: 'Auto-generate from the name. This becomes the product page URL — don’t change it after sharing links.',
      type: 'slug',
      group: 'basics',
      options: { source: 'name', maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'world',
      title: 'Range',
      type: 'string',
      group: 'basics',
      options: {
        list: [
          { title: 'Timbers', value: 'timbers' },
          { title: 'Doors', value: 'doors' },
          { title: 'Ply', value: 'ply' },
          { title: 'WPC', value: 'wpc' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'sub',
      title: 'Section',
      description:
        'Which section of the range page it appears under (e.g. "Teak Doors", "Membrane Doors"). Type a new name to create a new section.',
      type: 'string',
      group: 'basics',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'tag',
      title: 'One-line description',
      description: 'Shown on the product card. Keep it under ~10 words.',
      type: 'string',
      group: 'basics',
      validation: (r) => r.required().max(90),
    }),
    defineField({
      name: 'story',
      title: 'Longer description',
      description: 'Shown on the product page. 1–3 sentences.',
      type: 'text',
      rows: 3,
      group: 'basics',
    }),
    defineField({
      name: 'specs',
      title: 'Spec points',
      description: '3–5 short bullet points (grade, sizes, finish…).',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'basics',
      validation: (r) => r.max(6),
    }),
    defineField({
      name: 'cover',
      title: 'Main photo',
      description:
        'For doors: a straight-on, full-door PORTRAIT photo (camera facing the closed door). This photo gets the “door opens on hover” effect on the site. Angled or room shots belong in the gallery below.',
      type: 'image',
      options: { hotspot: true },
      group: 'photos',
    }),
    defineField({
      name: 'gallery',
      title: 'More photos',
      description: 'Angled shots, room shots, close-ups — shown on the product page.',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      group: 'photos',
    }),
    defineField({
      name: 'swatch',
      title: 'Colour swatch (no photo yet)',
      description:
        'Only used when there is no main photo: the site draws a material swatch (timber planks / ply sheets / WPC board) in these colours.',
      type: 'object',
      group: 'photos',
      fields: [
        defineField({
          name: 'material',
          title: 'Material drawing',
          type: 'string',
          options: {
            list: [
              { title: 'Timber planks', value: 'timber' },
              { title: 'Ply sheet stack', value: 'ply' },
              { title: 'WPC board', value: 'wpc' },
            ],
            layout: 'radio',
          },
        }),
        defineField({ name: 'base', title: 'Main colour (hex, e.g. #8A6845)', type: 'string' }),
        defineField({ name: 'dark', title: 'Shadow colour (hex)', type: 'string' }),
        defineField({ name: 'light', title: 'Highlight colour (hex)', type: 'string' }),
      ],
    }),
    defineField({
      name: 'purchasable',
      title: 'Sell online with a fixed price?',
      description:
        'OFF (recommended): the site shows “Enquire on WhatsApp”. ON: shows the price and lets visitors add it to the cart — only for made-to-measure doors with a confirmed base price.',
      type: 'boolean',
      group: 'pricing',
      initialValue: false,
    }),
    defineField({
      name: 'price',
      title: 'Base price (₹, for an 8′×3′ door leaf, installed)',
      type: 'number',
      group: 'pricing',
      hidden: ({ document }) => !document?.purchasable,
      validation: (r) =>
        r.custom((value, ctx) => {
          const doc = ctx.document as { purchasable?: boolean } | undefined
          if (doc?.purchasable && (value === undefined || value <= 0)) return 'A price is required when selling online'
          return true
        }),
    }),
    defineField({
      name: 'priceUnit',
      title: 'Priced per',
      type: 'string',
      group: 'pricing',
      options: {
        list: [
          { title: 'Door leaf', value: 'leaf' },
          { title: 'Cubic foot', value: 'cft' },
          { title: 'Square foot', value: 'sqft' },
          { title: 'Sheet', value: 'sheet' },
        ],
      },
      initialValue: 'leaf',
    }),
    defineField({
      name: 'order',
      title: 'Sort order',
      description: 'Lower numbers appear first within a section. Leave blank for alphabetical.',
      type: 'number',
      group: 'basics',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'sub', media: 'cover' },
  },
})
