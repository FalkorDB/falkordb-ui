import * as React from 'react'

// Temporary type definitions until the full toast component is added
export type ToastProps = React.ComponentPropsWithoutRef<'div'> & {
  variant?: 'default' | 'destructive'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type ToastActionElement = React.ReactElement
