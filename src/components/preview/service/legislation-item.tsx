'use client'

import { CopyableItem } from './copyable-item'

interface LegislationItemProps {
  text: string
}

export function LegislationItem({ text }: LegislationItemProps) {
  return <CopyableItem text={text} />
}
