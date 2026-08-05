import type { ProviderId } from '@/street-imagery/providers/registry'

export type StreetImageryPhotoSelection = {
  provider: ProviderId
  sequenceId: string
  photoId: string
}
