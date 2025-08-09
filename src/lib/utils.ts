import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to convert string dates to Date objects
export function convertDatesToObjects(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(convertDatesToObjects)
  }

  if (typeof data === 'object') {
    const converted: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        // Check if it looks like a date string (ISO format)
        try {
          converted[key] = new Date(value)
        } catch {
          converted[key] = value
        }
      } else if (typeof value === 'object') {
        converted[key] = convertDatesToObjects(value)
      } else {
        converted[key] = value
      }
    }
    return converted
  }

  return data
}
