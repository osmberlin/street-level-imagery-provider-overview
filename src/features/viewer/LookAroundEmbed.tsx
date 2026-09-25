import { lookAroundDeepLink } from '@osm-editor-kit/street-imagery'
import { useEffect, useRef, useState } from 'react'
import { getAppleMapKitToken, loadMapKitJs } from '@/features/viewer/mapkitLoader'

type LookAroundEmbedProps = {
  lat: number
  lng: number
}

type EmbedStatus = 'loading' | 'ready' | 'error' | 'no-imagery'

type LookAroundInstance = {
  destroy: () => void
  addEventListener: (type: string, listener: () => void) => void
}

export const LookAroundEmbed = ({ lat, lng }: LookAroundEmbedProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<EmbedStatus>('loading')
  const deepLink = lookAroundDeepLink(lat, lng)

  useEffect(
    function mountLookAroundPreview() {
      const token = getAppleMapKitToken()
      const container = containerRef.current
      if (!token || !container) {
        setStatus('error')
        return
      }

      let cancelled = false
      let lookAround: LookAroundInstance | null = null

      const run = async () => {
        setStatus('loading')
        try {
          const mapkit = await loadMapKitJs(token)
          if (cancelled) {
            return
          }

          const coordinate = new mapkit.Coordinate(lat, lng)
          const geocoder = new mapkit.Geocoder({ language: 'en-US' })
          const place = await new Promise<unknown>((resolve, reject) => {
            geocoder.reverseLookup(coordinate, (error, data) => {
              if (error) {
                reject(error)
                return
              }
              const first = data.results?.[0]
              if (!first) {
                reject(new Error('No place found for coordinate'))
                return
              }
              resolve(first)
            })
          })

          if (cancelled) {
            return
          }

          container.replaceChildren()
          lookAround = new mapkit.LookAroundPreview(container, place, {
            showsDialogControl: true,
          })

          lookAround.addEventListener('load', () => {
            if (!cancelled) {
              setStatus('ready')
            }
          })
          lookAround.addEventListener('error', () => {
            if (!cancelled) {
              setStatus('no-imagery')
            }
          })
        } catch {
          if (!cancelled) {
            setStatus('error')
          }
        }
      }

      void run()

      return () => {
        cancelled = true
        lookAround?.destroy()
        lookAround = null
        container.replaceChildren()
      }
    },
    [lat, lng],
  )

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="aspect-video overflow-hidden rounded-md bg-slate-200"
        hidden={status === 'no-imagery' || status === 'error'}
      />
      {status === 'loading' ? (
        <p className="text-xs text-slate-500">Loading Look Around preview…</p>
      ) : null}
      {status === 'no-imagery' || status === 'error' ? (
        <p className="text-xs text-slate-500">
          {status === 'no-imagery'
            ? 'No Look Around imagery at this location (or unsupported browser).'
            : 'Could not load MapKit Look Around preview.'}{' '}
          <a
            className="font-medium text-[#007AFF] underline underline-offset-2"
            href={deepLink}
            rel="noreferrer"
            target="_blank"
          >
            Open in Apple Maps
          </a>
        </p>
      ) : null}
    </div>
  )
}

export const hasAppleMapKitToken = (): boolean => getAppleMapKitToken() != null
