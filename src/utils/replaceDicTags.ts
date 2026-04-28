import wordsData from '../data/arabski_bagauddin_abuahmad_dictionary.json';

export function replaceDicTags(html: string): string {
  if (!html) return html;
  
  const dicTagRegex = /\{Dic\}(\d+)\{\/Dic\}/g;
  
  return html.replace(dicTagRegex, (match, lessonNumber) => {
    const lessonNum = parseInt(lessonNumber, 10);
    const lesson = wordsData.lessons.find(l => l.lesson === lessonNum);
    
    if (!lesson || !lesson.words.length) {
      return `<div class="text-center py-4 text-red-500">⚠️ Слова для урока ${lessonNum} не найдены</div>`;
    }
    
    const wordsJson = JSON.stringify(lesson.words);
    
    // Возвращаем контейнер, который будет заполнен скриптом
    return `<div class="dic-flashcard-container" data-lesson="${lessonNum}" data-words='${wordsJson}'></div>`;
  });
}