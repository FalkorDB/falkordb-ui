import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from '../src/components/ui/switch'
import { Label } from '../src/components/ui/label'

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
}

export default meta
type Story = StoryObj<typeof Switch>

export const Default: Story = {}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
}
