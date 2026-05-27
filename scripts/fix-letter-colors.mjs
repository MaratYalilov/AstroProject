import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lessonsDir = join(__dirname, '..', 'src', 'content', 'lessons', 'quran', 'muallim-sani');

// 6 букв, которые не соединяются слева
const nonJoiningLetters = ['ا', 'ر', 'ز', 'و', 'د', 'ذ'];

// Правила для соединяемых букв (по образцу 04_mim.json)
const joiningRules = {
  fatha: { color: '#667f35', form: 'initial' },    // зелёный → начальная
  kasra: { color: '#943634', form: 'middle' },      // бордо → срединная
  damma: { color: '#9333ea', form: 'final' },       // баклажан → конечная
};

// Правила для несоединяемых слева букв (по образцу 002-ra.json)
const nonJoiningRules = {
  fatha: { color: '#3b82f6', form: 'isolated' },    // синий → отдельная
  kasra: { color: '#943634', form: 'final' },       // бордо → конечная
  damma: { color: '#9333ea', form: 'final' },       // баклажан → конечная
};

function getVowelType(arabic) {
  if (arabic.includes('ُ')) return 'damma';
  if (arabic.includes('ِ')) return 'kasra';
  if (arabic.includes('َ')) return 'fatha';
  return null;
}

function getLetterBase(arabic) {
  // Извлекаем букву из арабского написания (убираем огласовки и соединительные тире)
  const cleaned = arabic.replace(/[َُِـ\-]/g, '').trim();
  return cleaned;
}

/**
 * Формирует правильное арабское написание для буквы с огласовкой
 * Для соединяемых букв:
 *   fatha → буква + َ + ـ  (начальная форма: مَـ)
 *   kasra → ـ + буква + ِ + ـ  (срединная форма: ـمِـ)
 *   damma → ـ + буква + ُ  (конечная форма: ـمُ)
 * Для несоединяемых слева:
 *   fatha → буква + َ  (отдельная форма: رَ)
 *   kasra → ـ + буква + ِ  (конечная форма: ـرِ)
 *   damma → ـ + буква + ُ  (конечная форма: ـرُ)
 */
function buildArabicForm(letter, vowelType, isNonJoining) {
  if (isNonJoining) {
    switch (vowelType) {
      case 'fatha': return `${letter}َ`;       // отдельная: رَ
      case 'kasra': return `ـ${letter}ِ`;      // конечная: ـرِ
      case 'damma': return `ـ${letter}ُ`;      // конечная: ـرُ
    }
  } else {
    switch (vowelType) {
      case 'fatha': return `${letter}َـ`;      // начальная: مَـ
      case 'kasra': return `ـ${letter}ِـ`;     // срединная: ـمِـ
      case 'damma': return `ـ${letter}ُ`;      // конечная: ـمُ
    }
  }
  return letter;
}

function fixFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  let changed = false;
  
  for (const block of data.blocks) {
    if (block.type === 'letter-lesson' && block.pronunciation && block.pronunciation.items) {
      // Определяем букву из первого элемента letters
      const letter = block.letters?.[0]?.arabic || '';
      const isNonJoining = nonJoiningLetters.includes(letter);
      const rules = isNonJoining ? nonJoiningRules : joiningRules;
      
      for (const item of block.pronunciation.items) {
        const vowelType = getVowelType(item.arabic);
        if (vowelType && rules[vowelType]) {
          const newColor = rules[vowelType].color;
          const newArabic = buildArabicForm(letter, vowelType, isNonJoining);
          
          if (item.color !== newColor || item.arabic !== newArabic) {
            console.log(`  ${filePath}: "${item.arabic}" → "${newArabic}" color ${item.color} → ${newColor} (${vowelType}, ${isNonJoining ? 'non-joining' : 'joining'})`);
            item.color = newColor;
            item.arabic = newArabic;
            changed = true;
          }
        }
      }
    }
  }
  
  if (changed) {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`✓ Updated: ${filePath}`);
  } else {
    console.log(`- No changes: ${filePath}`);
  }
  
  return changed;
}

// Получаем все JSON-файлы в директории
const files = readdirSync(lessonsDir)
  .filter(f => f.endsWith('.json') && f !== 'AlphabetLetter.json' && f !== '000-alifba.json');

console.log(`Found ${files.length} lesson files to process...`);
console.log('');

let updatedCount = 0;

for (const file of files) {
  const filePath = join(lessonsDir, file);
  console.log(`Processing: ${file}`);
  const updated = fixFile(filePath);
  if (updated) updatedCount++;
  console.log('');
}

console.log(`\nDone! Updated ${updatedCount} out of ${files.length} files.`);
