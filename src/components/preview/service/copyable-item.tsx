'use client'

import { Check, Copy } from 'lucide-react'

interface CopyableItemProps {
  text: string
  truncate?: boolean
}

export function CopyableItem({ text, truncate = false }: CopyableItemProps) {
  const textClass = truncate ? 'truncate' : ''

  return (
    <div
      className={`flex items-center justify-between bg-card rounded-2xl py-4 px-6 w-full`}
    >
      <span
        className={`text-foreground pr-4 leading-5 font-normal text-sm ${textClass}`}
      >
        {text}
      </span>
      <div className="flex-shrink-0">
        <Copy className="w-5 h-5 text-muted-foreground" />
      </div>
    </div>
  )
}
