import { useSyncExternalStore } from 'react'
import type { CatalogueStatus, Product } from './products'
import { catalogueStatus, getCatalogue, subscribeCatalogue } from './products'

/**
 * The catalogue, re-rendering the component when the live one lands.
 *
 * Anything that lists or looks up products in a component reads this rather
 * than a module constant — the catalogue is no longer fixed at build time (see
 * `liveCatalog.ts`), and a component holding the snapshot would show the
 * client's shop as it was the last time the site was deployed.
 */
export function useCatalog(): Product[] {
  return useSyncExternalStore(subscribeCatalogue, getCatalogue, getCatalogue)
}

/**
 * Whether the live catalogue is still on its way.
 *
 * Only routes that turn "no such product" into a 404 need this: a product the
 * client added after the last deploy is genuinely absent from the snapshot,
 * and answering NotFound before the live read lands would 404 the link they
 * just sent a customer.
 */
export function useCatalogStatus(): CatalogueStatus {
  return useSyncExternalStore(subscribeCatalogue, catalogueStatus, catalogueStatus)
}
