export type HeimdallTone =
  | 'gray'
  | 'green'
  | 'yellow'
  | 'red'
  | 'orange'
  | 'blue'

export const SUMMARY_TONE_CLASSES: Record<
  HeimdallTone,
  {
    panel: string
    iconBox: string
    icon: string
    value: string
    label: string
  }
> = {
  gray: {
    panel:
      'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800/40',
    iconBox: 'bg-gray-100 dark:bg-gray-900/40',
    icon: 'text-gray-600 dark:text-gray-400',
    value: 'text-gray-700 dark:text-gray-300',
    label: 'text-gray-600 dark:text-gray-400',
  },
  green: {
    panel:
      'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30',
    iconBox: 'bg-green-100 dark:bg-green-900/40',
    icon: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-400',
    label: 'text-green-600 dark:text-green-500',
  },
  yellow: {
    panel:
      'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900/30',
    iconBox: 'bg-yellow-100 dark:bg-yellow-900/40',
    icon: 'text-yellow-600 dark:text-yellow-400',
    value: 'text-yellow-700 dark:text-yellow-400',
    label: 'text-yellow-600 dark:text-yellow-500',
  },
  red: {
    panel: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30',
    iconBox: 'bg-red-100 dark:bg-red-900/40',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
    label: 'text-red-600 dark:text-red-500',
  },
  orange: {
    panel:
      'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30',
    iconBox: 'bg-orange-100 dark:bg-orange-900/40',
    icon: 'text-orange-600 dark:text-orange-400',
    value: 'text-orange-700 dark:text-orange-400',
    label: 'text-orange-600 dark:text-orange-500',
  },
  blue: {
    panel:
      'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30',
    iconBox: 'bg-blue-100 dark:bg-blue-900/40',
    icon: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-400',
    label: 'text-blue-600 dark:text-blue-500',
  },
}

/** Outline badge tint (status chips, Sistema, HTTP methods). */
export const BADGE_TONE_CLASSES: Record<HeimdallTone, string> = {
  gray: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800/40 dark:bg-gray-950/20 dark:text-gray-300',
  green:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-400',
  yellow:
    'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/30 dark:bg-yellow-950/20 dark:text-yellow-400',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400',
  orange:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-400',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400',
}

export const METHOD_BADGE_CLASS: Record<string, string> = {
  GET: BADGE_TONE_CLASSES.blue,
  POST: BADGE_TONE_CLASSES.green,
  PUT: BADGE_TONE_CLASSES.orange,
  PATCH: BADGE_TONE_CLASSES.orange,
}

export const SYSTEM_BADGE_CLASS = BADGE_TONE_CLASSES.blue
