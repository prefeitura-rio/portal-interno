'use client'

import { MarkdownViewer } from '@/components/blocks/editor-md'
import { Copy } from 'lucide-react'

interface LegislationItemProps {
  text: string
}

export function LegislationItem({ text }: LegislationItemProps) {
  return (
    <div className="flex items-center justify-between bg-card rounded-2xl py-1.5 px-1.5 w-full">
      <div className="flex-1 pr-4">
        <MarkdownViewer
          content={text}
          className="text-foreground leading-5 font-normal text-sm bg-transparent border-0 p-0"
        />
      </div>
    </div>
  )
}
