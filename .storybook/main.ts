import type { StorybookConfig } from '@storybook/react-vite'
import path from 'path'

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: '@storybook/react-vite',
  viteFinal: (config) => {
    // Override the library build's empty PostCSS — Storybook needs Tailwind
    config.css = {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      },
    }
    // Resolve @ alias to packages/core/src
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> || {}),
      '@': path.resolve(__dirname, '../packages/core/src'),
    }
    return config
  },
}

export default config
