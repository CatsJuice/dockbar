import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'dock-wrapper': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      'dock-item': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      'dock-separator': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}
