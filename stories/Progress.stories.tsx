import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from '../src/components/ui/progress'

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
}

export default meta
type Story = StoryObj<typeof Progress>

export const Default: Story = {
  args: { value: 60 },
}

export const Empty: Story = {
  args: { value: 0 },
}

export const Full: Story = {
  args: { value: 100 },
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[400px]">
      <Progress value={0} />
      <Progress value={25} />
      <Progress value={50} />
      <Progress value={75} />
      <Progress value={100} />
    </div>
  ),
}
