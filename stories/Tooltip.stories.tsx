import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../packages/ui/src/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../packages/ui/src/components/ui/tooltip'

const meta: Meta = {
  title: 'UI/Tooltip',
}

export default meta

export const Default: StoryObj = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This is a tooltip</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}
