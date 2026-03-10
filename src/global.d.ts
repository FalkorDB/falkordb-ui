import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'falkordb-canvas': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'node-mode'?: string
        ref?: React.Ref<any>
      }, HTMLElement>
    }
  }
}
