export type Lang = 'js' | 'ts' | 'vue' | 'html' | 'yarn' | 'npm' | 'pnpm' | 'react'
export interface Code {
  lang: Lang
  code: string
  title?: string
}
