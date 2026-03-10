import type { Meta, StoryObj } from '@storybook/react'
import ThemeToggle from '../src/components/ui/theme-toggle'

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Default: Story = {}
