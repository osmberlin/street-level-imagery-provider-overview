/** App-start timestamp used for stable age thresholds across map paint + JS counting. */
export const APP_START_NOW = Date.now()

const yearsAgoMs = (years: number, now: number): number => {
  const date = new Date(now)
  date.setFullYear(date.getFullYear() - years)
  return date.getTime()
}

export const AGE_THRESHOLD_4Y_MS = yearsAgoMs(4, APP_START_NOW)
export const AGE_THRESHOLD_2Y_MS = yearsAgoMs(2, APP_START_NOW)

export type AgeBucketId = 'current' | '2y4y' | 'older4y' | 'unknown'

export const ageBucketId = (capturedAt: number | null, now: number): AgeBucketId => {
  if (capturedAt == null) {
    return 'unknown'
  }

  if (capturedAt < yearsAgoMs(4, now)) {
    return 'older4y'
  }

  if (capturedAt < yearsAgoMs(2, now)) {
    return '2y4y'
  }

  return 'current'
}
