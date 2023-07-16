import hljsVuePlugin from '@highlightjs/vue-plugin'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import vue from 'vue-highlight.js/lib/languages/vue'
import { type UserModule } from '~/types'

// https://github.com/antfu/vite-plugin-pwa#automatic-reload-when-new-content-available
export const install: UserModule = ({ isClient, app }) => {
  if (!isClient)
    return
  app.use(hljsVuePlugin)
  hljs.registerLanguage('js', javascript)
  hljs.registerLanguage('ts', typescript)
  hljs.registerLanguage('vue', vue)
}
