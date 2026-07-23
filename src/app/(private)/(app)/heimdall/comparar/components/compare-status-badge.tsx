'use client'

import { Badge } from '@/components/ui/badge'
import type { CompareStatus } from '@/lib/heimdall-compare'
import { BADGE_TONE_CLASSES, type HeimdallTone } from '../../lib/tones'

const STATUS_TONE: Record<CompareStatus, HeimdallTone> = {
  MATCH: 'green',
  MISMATCH: 'red',
  ONLY_PROD: 'orange',
  ONLY_STAGING: 'yellow',
}

const STATUS_LABEL: Record<CompareStatus, string> = {
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  ONLY_PROD: 'ONLY_PROD',
  ONLY_STAGING: 'ONLY_STAGING',
}

export function CompareStatusBadge({ status }: { status: CompareStatus }) {
  return (
    <Badge
      variant="outline"
      className={BADGE_TONE_CLASSES[STATUS_TONE[status]]}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}
