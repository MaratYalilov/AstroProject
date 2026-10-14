export const tajweedColorWords: Record<string, string> = {
  серым: 'silent', серый: 'silent', серую: 'silent', серая: 'silent',
  зелёным: 'ghunna', зелёный: 'ghunna', зелёной: 'ghunna', зелёная: 'ghunna',
  оранжевым: 'pause', оранжевый: 'pause',
  золотистым: 'short-light', золотистое: 'short-light',
  'светло-розовым': 'short-dark', 'светло-розовое': 'short-dark',
  'ярко-красным': 'madd-light', розовым: 'madd-dark',
  'тёмно-красным': 'lazim-light', красным: 'lazim-dark',
  'сине-фиолетовым': 'tafkhim-light', 'сине-фиолетовая': 'tafkhim-light',
  синим: 'tafkhim-dark', синяя: 'tafkhim-dark',
  голубым: 'qalqalah-light', голубой: 'qalqalah-light',
  бирюзовым: 'qalqalah-dark', бирюзовый: 'qalqalah-dark',
  белым: 'normal',
};

const colorWords = Object.keys(tajweedColorWords).sort((a, b) => b.length - a.length).join('|');
const arabicRun = '[\\p{Script_Extensions=Arabic}\\u200c\\u200d]+(?:[ \\t]+[\\p{Script_Extensions=Arabic}\\u200c\\u200d]+)*';
const wordBoundary = '[\\p{L}\\p{M}-]';
const textParts = new RegExp(`(${arabicRun}|(?<!${wordBoundary})(?:${colorWords})(?!${wordBoundary}))`, 'iu');

export function splitTajweedText(text: string) {
  return text.split(textParts).map(text => ({
    text,
    arabic: /\p{Script_Extensions=Arabic}/u.test(text),
    color: tajweedColorWords[text.toLowerCase()],
  }));
}
