import type { StreetImageryLocale } from '@osm-editor-kit/street-imagery'

/** Every text of the app, per language. Texts with values are plain functions. */
export type AppMessages = {
  app: {
    title: string
    intro: string
    sourceOnGitHub: string
    showNavigation: string
    hideNavigation: string
    resizePanel: string
    language: string
  }
  providers: {
    heading: string
    openerHint: string
    unavailableInBrowser: string
    checksOnClick: string
    zoomIn: (minZoom: number) => string
    inView: string
  }
  filters: {
    heading: string
    flat: string
    panorama: string
    signs: string
    signGroup: { bike: string; speed: string; access: string; other: string }
    from: string
    to: string
    lastYears: (years: number) => string
    allDates: string
  }
  style: {
    heading: string
    mode: { photoType: string; age: string }
    category: Record<string, string>
  }
  streetViews: { label: string; hint: string; needsMapillary: string }
  opener: {
    openIn: (service: string) => string
    pickHint: string
    shiftHint: string
    clickMapToOpenIn: string
    useMapCenter: string
    cancel: string
  }
  viewer: {
    titleFeature: string
    titlePhotos: string
    loadingFeature: string
    featureError: string
    lookingForPhotos: string
    suggestionsError: string
    noStreetViewKey: string
    noPhotos: string
    noSuggestedPhotos: string
    nearbyPhotos: (count: number, withLookAround: boolean) => string
    previousOnStreet: string
    nextOnStreet: string
    pano: string
    flat: string
    unknownType: string
    license: string
    loadingViewer: string
    loadingPreview: string
    loadingImage: string
    previewUnavailable: string
    noPreview: string
    streetViewNotInApp: string
    streetsideNotInApp: string
    imageUnavailable: string
    noImage: string
    photoAlt: string
    zoomIn: string
    zoomOut: string
    resetZoom: string
  }
  lookAround: {
    intro: (canEmbed: boolean) => string
    open: string
    loading: string
    noImagery: string
    error: string
    openInAppleMaps: string
  }
}

const en: AppMessages = {
  app: {
    title: 'Street-Level Imagery Provider Overview',
    intro:
      'Explore and compare street-level imagery from multiple open and commercial providers on one map. Toggle providers and switch visualization styles to see coverage at a glance.',
    sourceOnGitHub: 'Source on GitHub',
    showNavigation: 'Show navigation',
    hideNavigation: 'Hide navigation',
    resizePanel: 'Resize left panel',
    language: 'Language',
  },
  providers: {
    heading: 'Providers',
    openerHint:
      'The pointer opens a place there: click it, then click the map. Shift+click opens the map center right away.',
    unavailableInBrowser:
      'Not available here: the provider does not allow requests from other websites (CORS).',
    checksOnClick: 'Checks coverage on click',
    zoomIn: (minZoom) => `Zoom in to see data (z${minZoom}+)`,
    inView: 'In view',
  },
  filters: {
    heading: 'Filters',
    flat: 'Flat',
    panorama: 'Panorama',
    signs: 'Mapillary signs',
    signGroup: { bike: 'Bike', speed: 'Speed', access: 'Access & oneway', other: 'Other' },
    from: 'From',
    to: 'To',
    lastYears: (years) => `Last ${years} years`,
    allDates: 'All dates',
  },
  style: {
    heading: 'Map style',
    mode: { photoType: 'Photo type', age: 'Age' },
    category: {
      panorama: 'Panorama',
      flat: 'Flat',
      unknown: 'Unknown',
      current: '≤ 2 years',
      '2y4y': '2–4 years',
      older4y: '> 4 years',
      feature: 'Feature',
    },
  },
  streetViews: {
    label: 'Street views',
    hint: 'Show clickable streets. Click a street or a spot to get the best photos looking along it or in each direction.',
    needsMapillary: 'Needs the Mapillary provider.',
  },
  opener: {
    openIn: (service) => `Open in ${service}`,
    pickHint: 'click, then click the map.',
    shiftHint: 'Shift+click opens the map center right away.',
    clickMapToOpenIn: 'Click the map to open that place in',
    useMapCenter: 'Use map center',
    cancel: 'Cancel (Esc)',
  },
  viewer: {
    titleFeature: 'Mapillary feature',
    titlePhotos: 'Photos here',
    loadingFeature: 'Loading the feature and its photos…',
    featureError: 'Could not load this feature from Mapillary.',
    lookingForPhotos: 'Looking for photos…',
    suggestionsError: 'Could not load Mapillary photos for the suggested views.',
    noStreetViewKey: 'Set GOOGLE_MAPS_API_KEY in src/config.ts to check Google Street View.',
    noPhotos:
      'No photos from the enabled providers here. Try another spot, more providers, or wider filters.',
    noSuggestedPhotos: 'No Mapillary photo looks in any of the suggested directions.',
    nearbyPhotos: (count, withLookAround) =>
      `All photos near the click (${count}${withLookAround ? ' + Look Around' : ''})`,
    previousOnStreet: 'Previous photo along the street (Alt + ←)',
    nextOnStreet: 'Next photo along the street (Alt + →)',
    pano: '360°',
    flat: 'Flat',
    unknownType: 'Unknown type',
    license: 'CC BY-SA',
    loadingViewer: 'Loading viewer…',
    loadingPreview: 'Loading preview…',
    loadingImage: 'Loading image…',
    previewUnavailable: 'Preview unavailable',
    noPreview: 'No preview for this provider',
    streetViewNotInApp:
      'Google Street View imagery cannot be shown in-app — open Google Maps for the full panorama.',
    streetsideNotInApp:
      'Streetside cubemap tiles need provider stitching — open Bing Maps for the full panorama.',
    imageUnavailable: 'Image unavailable',
    noImage: 'No image for this photo',
    photoAlt: 'Street-level photo',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetZoom: 'Reset zoom',
  },
  lookAround: {
    intro: (canEmbed) =>
      `No map dots — Apple does not publish a coverage listing API. Open Look Around at this click in Apple Maps${canEmbed ? ', or preview it here when a Maps token is configured' : ''}.`,
    open: 'Open Look Around at this location',
    loading: 'Loading Look Around preview…',
    noImagery: 'No Look Around imagery at this location (or unsupported browser).',
    error: 'Could not load MapKit Look Around preview.',
    openInAppleMaps: 'Open in Apple Maps',
  },
}

const de: AppMessages = {
  app: {
    title: 'Straßenfotos: Anbieter im Überblick',
    intro:
      'Straßenfotos mehrerer offener und kommerzieller Anbieter auf einer Karte ansehen und vergleichen. Anbieter ein- und ausschalten und den Kartenstil wechseln, um die Abdeckung auf einen Blick zu sehen.',
    sourceOnGitHub: 'Quellcode auf GitHub',
    showNavigation: 'Navigation einblenden',
    hideNavigation: 'Navigation ausblenden',
    resizePanel: 'Breite der linken Spalte ändern',
    language: 'Sprache',
  },
  providers: {
    heading: 'Anbieter',
    openerHint:
      'Der Zeiger öffnet einen Ort beim Anbieter: erst ihn anklicken, dann die Karte. Umschalt+Klick öffnet sofort die Kartenmitte.',
    unavailableInBrowser:
      'Hier nicht verfügbar: Der Anbieter erlaubt keine Anfragen von anderen Websites (CORS).',
    checksOnClick: 'Prüft die Abdeckung beim Klick',
    zoomIn: (minZoom) => `Für Daten näher heranzoomen (z${minZoom}+)`,
    inView: 'Im Ausschnitt',
  },
  filters: {
    heading: 'Filter',
    flat: 'Normal',
    panorama: 'Panorama',
    signs: 'Mapillary-Verkehrszeichen',
    signGroup: {
      bike: 'Rad',
      speed: 'Tempo',
      access: 'Zufahrt & Einbahn',
      other: 'Sonstige',
    },
    from: 'Von',
    to: 'Bis',
    lastYears: (years) => `Letzte ${years} Jahre`,
    allDates: 'Alle Daten',
  },
  style: {
    heading: 'Kartenstil',
    mode: { photoType: 'Fototyp', age: 'Alter' },
    category: {
      panorama: 'Panorama',
      flat: 'Normal',
      unknown: 'Unbekannt',
      current: '≤ 2 Jahre',
      '2y4y': '2–4 Jahre',
      older4y: '> 4 Jahre',
      feature: 'Objekt',
    },
  },
  streetViews: {
    label: 'Straßenblicke',
    hint: 'Klickbare Straßen einblenden. Ein Klick auf eine Straße oder einen Ort zeigt die besten Fotos, die entlang der Straße oder in jede Richtung schauen.',
    needsMapillary: 'Braucht den Anbieter Mapillary.',
  },
  opener: {
    openIn: (service) => `In ${service} öffnen`,
    pickHint: 'erst anklicken, dann die Karte.',
    shiftHint: 'Umschalt+Klick öffnet sofort die Kartenmitte.',
    clickMapToOpenIn: 'Karte anklicken, um den Ort zu öffnen in',
    useMapCenter: 'Kartenmitte nehmen',
    cancel: 'Abbrechen (Esc)',
  },
  viewer: {
    titleFeature: 'Mapillary-Objekt',
    titlePhotos: 'Fotos hier',
    loadingFeature: 'Objekt und Fotos werden geladen…',
    featureError: 'Das Objekt konnte nicht von Mapillary geladen werden.',
    lookingForPhotos: 'Fotos werden gesucht…',
    suggestionsError:
      'Die Mapillary-Fotos für die vorgeschlagenen Blicke konnten nicht geladen werden.',
    noStreetViewKey:
      'GOOGLE_MAPS_API_KEY in src/config.ts setzen, um Google Street View zu prüfen.',
    noPhotos:
      'Hier gibt es keine Fotos der aktiven Anbieter. Anderen Ort, mehr Anbieter oder weitere Filter probieren.',
    noSuggestedPhotos: 'Kein Mapillary-Foto schaut in eine der vorgeschlagenen Richtungen.',
    nearbyPhotos: (count, withLookAround) =>
      `Alle Fotos nahe dem Klick (${count}${withLookAround ? ' + Look Around' : ''})`,
    previousOnStreet: 'Vorheriges Foto entlang der Straße (Alt + ←)',
    nextOnStreet: 'Nächstes Foto entlang der Straße (Alt + →)',
    pano: '360°',
    flat: 'Normal',
    unknownType: 'Typ unbekannt',
    license: 'CC BY-SA',
    loadingViewer: 'Ansicht wird geladen…',
    loadingPreview: 'Vorschau wird geladen…',
    loadingImage: 'Bild wird geladen…',
    previewUnavailable: 'Vorschau nicht verfügbar',
    noPreview: 'Keine Vorschau für diesen Anbieter',
    streetViewNotInApp:
      'Google-Street-View-Bilder lassen sich hier nicht zeigen — für das ganze Panorama Google Maps öffnen.',
    streetsideNotInApp:
      'Streetside-Kacheln müsste der Anbieter zusammensetzen — für das ganze Panorama Bing Maps öffnen.',
    imageUnavailable: 'Bild nicht verfügbar',
    noImage: 'Kein Bild zu diesem Foto',
    photoAlt: 'Straßenfoto',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    resetZoom: 'Zoom zurücksetzen',
  },
  lookAround: {
    intro: (canEmbed) =>
      `Keine Punkte auf der Karte — Apple veröffentlicht keine Abdeckung. Look Around an dieser Stelle in Apple Karten öffnen${canEmbed ? ' oder hier ansehen, wenn ein Maps-Token eingerichtet ist' : ''}.`,
    open: 'Look Around an diesem Ort öffnen',
    loading: 'Look-Around-Vorschau wird geladen…',
    noImagery: 'Keine Look-Around-Bilder an diesem Ort (oder Browser nicht unterstützt).',
    error: 'Die Look-Around-Vorschau konnte nicht geladen werden.',
    openInAppleMaps: 'In Apple Karten öffnen',
  },
}

export const APP_MESSAGES: Record<StreetImageryLocale, AppMessages> = { en, de }
