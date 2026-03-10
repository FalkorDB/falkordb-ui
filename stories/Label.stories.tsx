import type { Meta, StoryObj } from '@storybook/react'
import { Label } from '../src/components/ui/label'
import { Input } from '../src/components/ui/input'

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
}

export default meta
type Story = StoryObj<typeof Label>

export const Default: Story = {
  args: { children: 'Label text' },
}

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
}
