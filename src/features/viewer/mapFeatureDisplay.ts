/** Turn Mapillary sprite ids like `regulatory--no-stopping--g1` into readable labels. */
export const humanizeFeatureValue = (value: string): string => {
  const withoutVariant = value.replace(/--[a-z]\d+$/i, '')
  return withoutVariant
    .split('--')
    .filter((part) => part.length > 0)
    .map((part) => part.replaceAll('-', ' '))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' · ')
}
