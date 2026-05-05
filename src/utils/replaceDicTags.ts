import wordsData from '../data/arabski_bagauddin_abuahmad_dictionary.json';

export function replaceDicTags(html: string): string {
  if (!html) return html;
  
  const dicTagRegex = /\{Dic\}(\d+)\{\/Dic\}/g;
  
  return html.replace(dicTagRegex, (match, lessonNumber) => {
    const lessonNum = parseInt(lessonNumber, 10);
    const lesson = wordsData.lessons.find(l => l.lesson === lessonNum);
    
    if (!lesson || !lesson.words.length) {
      return `<div class="dic-error-placeholder">⚠️ Слова для урока ${lessonNum} не найдены</div>`;
    }
    
    const wordsJson = JSON.stringify(lesson.words)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    
    // Возвращаем маркер, который будет заменён на React-компонент
    return `<div class="dic-flashcard-marker" data-lesson="${lessonNum}" data-words='${wordsJson}'></div>`;
  });
}