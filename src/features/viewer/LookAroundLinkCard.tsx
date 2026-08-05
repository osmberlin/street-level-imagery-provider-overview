import { hasAppleMapKitToken, LookAroundEmbed } from '@/features/viewer/LookAroundEmbed'
import { lookAroundDeepLink } from '@/street-imagery/providers/adapters/lookaround'

type LookAroundLinkCardProps = {
  lat: number
  lng: number
}

export const LookAroundLinkCard = ({ lat, lng }: LookAroundLinkCardProps) => {
  const href = lookAroundDeepLink(lat, lng)
  const canEmbed = hasAppleMapKitToken()

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: '#007AFF' }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Apple Look Around</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              No map dots — Apple does not publish a coverage listing API. Open Look Around at this
              click in Apple Maps
              {canEmbed ? ', or preview it here when a Maps token is configured' : ''}.
            </p>
          </div>

          {canEmbed ? <LookAroundEmbed lat={lat} lng={lng} /> : null}

          <a
            className="inline-flex items-center gap-1.5 rounded-md bg-[#007AFF] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0066D6]"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            Open Look Around at this location
            <svg
              aria-hidden
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
