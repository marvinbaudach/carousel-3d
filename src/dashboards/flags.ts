// Country → flag emoji lookup, shared by every country-facing renderer.
// Kept in its own module (no chart/draw imports) so both `charts/shared.ts`
// (ranked lists, bars) and `draw.ts` (legends) can pull `withFlag` without an
// import cycle. Keyed by the German names the panels use plus the English World
// Bank names the live military/homicide feeds return, so ranked rows, bar rows
// AND legends all carry a flag automatically without hand-editing each panel.
import { t as tr } from '../i18n';

const COUNTRY_FLAGS: Record<string, string> = {
  USA: '🇺🇸', China: '🇨🇳', Russland: '🇷🇺', Deutschland: '🇩🇪', Indien: '🇮🇳',
  Japan: '🇯🇵', Schweiz: '🇨🇭', Frankreich: '🇫🇷', Italien: '🇮🇹', Spanien: '🇪🇸',
  Griechenland: '🇬🇷', Großbritannien: '🇬🇧', Schweden: '🇸🇪', Österreich: '🇦🇹',
  Belgien: '🇧🇪', Dänemark: '🇩🇰', Irland: '🇮🇪', Niederlande: '🇳🇱', Portugal: '🇵🇹',
  Norwegen: '🇳🇴', Nordkorea: '🇰🇵', Südkorea: '🇰🇷', Pakistan: '🇵🇰', Iran: '🇮🇷',
  Vietnam: '🇻🇳', Ägypten: '🇪🇬', 'El Salvador': '🇸🇻', Kuba: '🇨🇺', Ruanda: '🇷🇼',
  Türkei: '🇹🇷', Brasilien: '🇧🇷', Nauru: '🇳🇷', Kuwait: '🇰🇼', Mexiko: '🇲🇽',
  Monaco: '🇲🇨', Singapur: '🇸🇬', Nigeria: '🇳🇬', Tschad: '🇹🇩', Lesotho: '🇱🇸',
  Jamaika: '🇯🇲', Südafrika: '🇿🇦', Honduras: '🇭🇳', Südsudan: '🇸🇸', Somalia: '🇸🇴',
  Venezuela: '🇻🇪', Syrien: '🇸🇾', Libyen: '🇱🇾', Argentinien: '🇦🇷', Sudan: '🇸🇩',
  Ecuador: '🇪🇨', Serbien: '🇷🇸', Paraguay: '🇵🇾', Ukraine: '🇺🇦', Irak: '🇮🇶',
  Afghanistan: '🇦🇫', Jemen: '🇾🇪', Gaza: '🇵🇸', Estland: '🇪🇪', 'Saudi-Arabien': '🇸🇦',
  Israel: '🇮🇱', Polen: '🇵🇱', Australien: '🇦🇺',
  Rumänien: '🇷🇴', Slowakei: '🇸🇰', Kroatien: '🇭🇷', Ungarn: '🇭🇺', 'EU-27': '🇪🇺',
  Äthiopien: '🇪🇹', Bangladesch: '🇧🇩', Kambodscha: '🇰🇭', Kanada: '🇨🇦', Laos: '🇱🇦',
  Myanmar: '🇲🇲', Oman: '🇴🇲', Tschechien: '🇨🇿', Litauen: '🇱🇹', Belarus: '🇧🇾',
  Bulgarien: '🇧🇬', Moldau: '🇲🇩', Marokko: '🇲🇦',
  Katar: '🇶🇦', Chile: '🇨🇱', Neuseeland: '🇳🇿',
  'United States': '🇺🇸', 'Russian Federation': '🇷🇺', Germany: '🇩🇪', India: '🇮🇳',
  'Saudi Arabia': '🇸🇦', 'United Kingdom': '🇬🇧', France: '🇫🇷', 'Korea, Rep.': '🇰🇷',
  Italy: '🇮🇹', Australia: '🇦🇺', Poland: '🇵🇱', Jamaica: '🇯🇲', 'South Africa': '🇿🇦',
  Brazil: '🇧🇷', Mexico: '🇲🇽',
  Madagaskar: '🇲🇬', Malawi: '🇲🇼', 'Zentralafr. Republik': '🇨🇫', Burundi: '🇧🇮',
  Mosambik: '🇲🇿', 'DR Kongo': '🇨🇩', Sambia: '🇿🇲',
  VAE: '🇦🇪', Mali: '🇲🇱', Niger: '🇳🇪', Algerien: '🇩🇿', Indonesien: '🇮🇩',
  Eswatini: '🇸🇿', Guyana: '🇬🇾', Uruguay: '🇺🇾',
};

const HAS_FLAG = /\p{Regional_Indicator}/u;

/** Country name with its flag appended, when we know one and it carries none
    yet. Trailing descriptors ("· seit 2011", "(Stadt)") are ignored for the
    lookup, so "Syrien · seit 2011" still resolves to the Syrian flag. */
export function withFlag(name: string): string {
  // The flag is looked up on the German (or World Bank English) source name
  // before translation, then appended to the translated label.
  if (HAS_FLAG.test(name)) return tr(name);
  const key = name.replace(/\s*[·(].*$/u, '').trim();
  const flag = COUNTRY_FLAGS[key];
  return flag ? `${tr(name)} ${flag}` : tr(name);
}
