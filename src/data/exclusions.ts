/**
 * Popular-with-Korean-travellers cities removed from the random draw.
 * Edit this list freely — matching is done on city name (EN/KO) and id.
 * Whole countries are never excluded; only cities.
 */
export interface ExcludedCity {
  name: string
  nameKo: string
}

export const EXCLUDED_CITIES: ExcludedCity[] = [
  { name: 'Tokyo', nameKo: '도쿄' },
  { name: 'Osaka', nameKo: '오사카' },
  { name: 'Fukuoka', nameKo: '후쿠오카' },
  { name: 'Sapporo', nameKo: '삿포로' },
  { name: 'Paris', nameKo: '파리' },
  { name: 'London', nameKo: '런던' },
  { name: 'Rome', nameKo: '로마' },
  { name: 'New York', nameKo: '뉴욕' },
  { name: 'Bangkok', nameKo: '방콕' },
  { name: 'Da Nang', nameKo: '다낭' },
  { name: 'Bali', nameKo: '발리' },
  { name: 'Singapore', nameKo: '싱가포르' },
  { name: 'Taipei', nameKo: '타이베이' },
  { name: 'Hong Kong', nameKo: '홍콩' },
]

/** Any destination carrying one of these tags is also skipped */
export const EXCLUDED_TAGS: string[] = ['mass-tourism-kr']
