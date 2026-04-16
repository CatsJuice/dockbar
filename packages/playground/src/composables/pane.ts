import { isClient } from '@vueuse/shared'
import { Pane } from 'tweakpane'
import type { FolderApi } from 'tweakpane'

// export const fps = useFps()

type PaneApi = Pane & Pick<FolderApi, 'addInput' | 'addFolder' | 'remove'>

let pane: PaneApi

function init(container: HTMLElement | undefined): PaneApi | undefined {
  if (!isClient || pane)
    return
  pane = new Pane({ title: 'Debug Pane', container }) as PaneApi
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
