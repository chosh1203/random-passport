import type { ContinentId } from './types'

export const CONTINENTS: Record<ContinentId, { ko: string; en: string; color: string }> = {
  asia: { ko: '아시아', en: 'Asia', color: '#3987e5' },
  europe: { ko: '유럽', en: 'Europe', color: '#d95926' },
  africa: { ko: '아프리카', en: 'Africa', color: '#199e70' },
  'north-america': { ko: '북아메리카', en: 'North America', color: '#c98500' },
  'south-america': { ko: '남아메리카', en: 'South America', color: '#d55181' },
  oceania: { ko: '오세아니아', en: 'Oceania', color: '#9085e9' },
}

export const CONTINENT_COUNT = Object.keys(CONTINENTS).length
