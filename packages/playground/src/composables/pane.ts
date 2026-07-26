import { isClient } from '@vueuse/shared'
import { Pane } from 'tweakpane'
import type { FolderApi } from 'tweakpane'

// export const fps = useFps()

let pane: Pane

function init(container: HTMLElement | undefined): Pane | undefined {
  if (!isClient || pane)
    return
  pane = new Pane({ title: 'Debug Pane', container })
  return pane
}

export function usePane(container?: HTMLElement) {
  init(container)!

  const _folders: FolderApi[] = []

  function addFolder(...args: Parameters<typeof pane.addFolder>) {
    if (!pane)
      return
    const folder = pane.addFolder(...args)
    _folders.push(folder)
    return folder
  }

  onUnmounted(() => _folders.forEach(folder => pane.remove(folder)))

  return { pane, addFolder }
}
