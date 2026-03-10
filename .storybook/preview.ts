import type { Preview } from '@storybook/react'
import React from 'react'
import '../src/theme/tokens.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', icon: 'moon', title: 'Dark' },
          { value: 'light', icon: 'sun', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark'
      React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
      }, [theme])
      return React.createElement('div', { 'data-theme': theme }, React.createElement(Story))
    },
  ],
}

export default preview
