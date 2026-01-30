// scripts/export-text.js
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function exportMarkdownFiles() {
  // Создаем папку для экспорта
  const exportDir = './text-exports';
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  // Ищем все .md файлы
  const files = await glob('./src/content/**/*.md');
  
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Парсим frontmatter
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (match) {
      const frontmatter = match[1];
      const markdownContent = match[2];
      
      // Извлекаем нужные поля
      const getField = (text, field) => {
        const regex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };
      
      const title = getField(frontmatter, 'title');
      const order = getField(frontmatter, 'order');
      const hasAudio = getField(frontmatter, 'hasAudio');
      
      // Формируем имя файла
      const safeTitle = title.replace(/[^\w\sа-яА-ЯёЁ]/gi, '').replace(/\s+/g, '_');
      const filename = `${String(order).padStart(2, '0')}_${safeTitle}.txt`;
      
      // Сохраняем
      fs.writeFileSync(
        path.join(exportDir, filename),
        markdownContent,
        'utf-8'
      );
      
      console.log(`Exported: ${filename}`);
    }
  }
}

exportMarkdownFiles();