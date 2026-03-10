import type { Meta, StoryObj } from '@storybook/react'
import { Sidebar, SidebarIcon } from '../src/components/layout/sidebar'
import { Home, Settings, Users, HelpCircle } from 'lucide-react'

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  decorators: [
    (Story) => (
      <div className="relative h-[500px] w-full bg-background">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Sidebar>

export const Default: Story = {
  args: {
    topItems: (
      <>
        <SidebarIcon icon={Home} label="Home" active />
        <SidebarIcon icon={Users} label="Users" />
        <SidebarIcon icon={Settings} label="Settings" />
      </>
    ),
    bottomItems: (
      <SidebarIcon icon={HelpCircle} label="Help" />
    ),
  },
}
