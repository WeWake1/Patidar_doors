import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool, type StructureResolver } from 'sanity/structure'
import { schemaTypes } from './schemas'

/**
 * Patidar Doors admin studio.
 * Project id/dataset come from studio/.env (SANITY_STUDIO_PROJECT_ID,
 * SANITY_STUDIO_DATASET) — see docs/cms-setup.md in the site repo.
 */

const WORLDS = [
  { id: 'timbers', title: 'Timbers' },
  { id: 'doors', title: 'Doors' },
  { id: 'ply', title: 'Ply' },
  { id: 'wpc', title: 'WPC' },
]

const structure: StructureResolver = (S) =>
  S.list()
    .title('Catalogue')
    .items([
      ...WORLDS.map((w) =>
        S.listItem()
          .title(w.title)
          .child(
            S.documentList()
              .title(w.title)
              .filter('_type == "product" && world == $world')
              .params({ world: w.id })
              .defaultOrdering([
                { field: 'sub', direction: 'asc' },
                { field: 'order', direction: 'asc' },
                { field: 'name', direction: 'asc' },
              ]),
          ),
      ),
      S.divider(),
      S.documentTypeListItem('product').title('All products'),
    ])

export default defineConfig({
  name: 'patidar-doors',
  title: 'Patidar Doors',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'MISSING_PROJECT_ID',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
})
