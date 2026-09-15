import { useCallback, useEffect, useState } from 'react'
import { t } from '../lib/i18n'

/**
 * "Are there unsaved changes?" as state the save bar can show, plus the
 * browser-level guard: a closed tab, a reload and a typed URL are how a form
 * full of a morning's cataloguing actually gets lost. The in-app guard (the
 * Back link) reads `dirty` and asks through `confirmLeave`.
 */
export function useDirty() {
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const touch = useCallback(() => setDirty(true), [])
  const clean = useCallback(() => setDirty(false), [])
  const confirmLeave = useCallback(() => !dirty || window.confirm(t('ax.unsaved')), [dirty])
  return { dirty, touch, clean, confirmLeave }
}
