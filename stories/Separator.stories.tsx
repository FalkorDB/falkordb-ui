import type { Meta, StoryObj } from '@storybook/react'
import { Separator } from '../src/components/ui/separator'

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
}

export default meta
type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  render: () => (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-foreground">FalkorDB UI</h4>
      <p className="text-sm text-muted-foreground">A shared component library.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm text-foreground">
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
        <Separator orientation="vertical" />
        <div>Changelog</div>
      </div>
    </div>
  ),
}
