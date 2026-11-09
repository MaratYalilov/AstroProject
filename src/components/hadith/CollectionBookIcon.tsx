import { collectionIconPresets } from '../../lib/hadith/symbols';

export default function CollectionBookIcon({ symbol }: { symbol: string }) {
  const preset = Object.values(collectionIconPresets).find(icon => icon.symbol === symbol);
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M6 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <text x="13" y="12.5" textAnchor="middle" fill="currentColor" lang="ar" style={{ fontFamily: '"AmiriLocal", "Amiri", serif', fontSize: preset?.fontSize ?? 18, fontWeight: 400 }}>{symbol}</text>
  </svg>;
}
