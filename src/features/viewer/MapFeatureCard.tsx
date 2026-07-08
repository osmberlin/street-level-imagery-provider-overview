import type { NormalizedMapFeature } from '@/features/providers/model'
import { providerById } from '@/features/providers/registry'
import { mapFeatureExternalLink } from '@/features/viewer/externalLinks'
import { formatFeatureDate, humanizeFeatureValue } from '@/features/viewer/mapFeatureDisplay'

type MapFeatureCardProps = {
  feature: NormalizedMapFeature
}

export const MapFeatureCard = ({ feature }: MapFeatureCardProps) => {
  const meta = providerById[feature.providerId]

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            <h3 className="truncate text-sm font-semibold text-slate-900">{meta.label}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-800">{humanizeFeatureValue(feature.value)}</p>
          <dl className="mt-3 space-y-1 text-xs text-slate-600">
            <div className="flex justify-between gap-3">
              <dt>First seen</dt>
              <dd className="font-medium text-slate-700">
                {formatFeatureDate(feature.firstSeenAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Last seen</dt>
              <dd className="font-medium text-slate-700">
                {formatFeatureDate(feature.lastSeenAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <a
        className="mt-4 inline-flex text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
        href={mapFeatureExternalLink(feature)}
        rel="noreferrer"
        target="_blank"
      >
        Open in Mapillary
      </a>
    </article>
  )
}
