'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, CircleAlert, XCircle } from 'lucide-react'
import { BADGE_TONE_CLASSES } from '../lib/tones'

function isHealthyStatus(status?: string) {
  return status === 'healthy' || status === 'ready'
}

function isUnhealthyStatus(status?: string) {
  return status === 'unhealthy' || status === 'not_ready'
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null

  if (isHealthyStatus(status)) {
    return (
      <Badge variant="outline" className={BADGE_TONE_CLASSES.green}>
        <CheckCircle2 className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  if (isUnhealthyStatus(status)) {
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={BADGE_TONE_CLASSES.yellow}>
      <CircleAlert className="h-3 w-3" />
      {status}
    </Badge>
  )
}
