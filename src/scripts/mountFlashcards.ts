// src/scripts/mountFlashcards.ts

export function mountFlashcards() {
  const containers = document.querySelectorAll('.dic-flashcard-container');
  
  containers.forEach(container => {
    // Пропускаем, если уже есть содержимое
    if (container.children.length > 0) {
      return;
    }
    
    const lessonNumber = parseInt(container.getAttribute('data-lesson') || '0', 10);
    const wordsJson = container.getAttribute('data-words');
    
    if (!wordsJson || !lessonNumber) return;
    
    try {
      const words = JSON.parse(wordsJson);
      container.innerHTML = renderFlashcardHTML(words, lessonNumber);
      attachEventHandlers(container as HTMLElement, words);
    } catch (err) {
      console.error('Ошибка монтирования карточек:', err);
      container.innerHTML = `<div style="padding:20px;background:red;color:white;">Ошибка загрузки карточек</div>`;
    }
  });
}

function renderFlashcardHTML(words: any[], lessonNumber: number): string {
  const currentWord = words[0];
  const savedDirection = localStorage.getItem('flashcard_direction') || 'ru-ar'; // 'ar-ru' или 'ru-ar'
  const isRuFirst = savedDirection === 'ru-ar';

  return `
  <div class="dic-flashcard-wrapper mb-12" data-lesson="${lessonNumber}">
    <!-- Свитчер направления -->
    <div class="dic-direction-toggle">
      <div class="dic-toggle-info">
        <p>Нажмите на карточку, чтобы увидеть перевод. Отмечайте изученные слова.</p>
      </div>
      
      <div class="dic-toggle-controls">
        <span class="dic-toggle-label">Переводите с русского</span>

        <label class="dic-toggle">
          <input 
            type="checkbox" 
            class="dic-toggle-input"
            ${savedDirection === 'ru-ar' ? 'checked' : ''}
          />
          <span class="dic-toggle-track">
            <span class="dic-toggle-thumb"></span>
          </span>
        </label>

        <span class="dic-toggle-label">العربية</span>
      </div>
    </div>  <!-- Закрываем dic-direction-toggle -->

    <!-- Прогресс бар -->
    <div class="dic-progress-container">
      <div class="dic-progress-fill" style="width: 0%"></div>
      <span class="dic-progress-text">0 / ${words.length}</span>
    </div>
    
    <!-- Карточка -->
<div class="dic-flashcard" data-idx="0" data-direction="${savedDirection}">
  <div class="dic-flashcard-inner">
    <div class="dic-flashcard-front">
      <span class="dic-flashcard-text">
        ${escapeHtml(isRuFirst ? currentWord.russian : currentWord.arabic)}
      </span>
      <span class="dic-flip-hint">👆 нажмите для перевода</span>
    </div>

    <div class="dic-flashcard-back">
      <span class="dic-flashcard-text">
        ${escapeHtml(isRuFirst ? currentWord.arabic : currentWord.russian)}
      </span>
      <span class="dic-flip-hint">👆 нажмите для возврата</span>
    </div>
  </div>
</div>
    
    <!-- Счётчик -->
    <div class="dic-counter">1 / ${words.length}</div>
    
    <!-- Кнопки управления -->
    <div class="dic-controls mt-6">
      <button class="dic-btn dic-prev" title="Предыдущее">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <button class="dic-btn dic-studied" title="Отметить выученным">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      
      <button class="dic-btn dic-shuffle" title="Перемешать">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 3 21 3 21 8"></polyline>
          <line x1="4" y1="20" x2="21" y2="3"></line>
          <polyline points="21 16 21 21 16 21"></polyline>
          <line x1="15" y1="15" x2="21" y2="21"></line>
          <line x1="4" y1="4" x2="9" y2="9"></line>
        </svg>
      </button>
      
      <button class="dic-btn dic-reset" title="Сбросить прогресс">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
      </button>
      
      <button class="dic-btn dic-stats" title="Статистика">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      </button>
      
      <button class="dic-btn dic-next" title="Следующее">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <!-- Кнопки управления -->
        <!-- Десктоп: клавиши -->
    <div class="dic-keyboard-shortcuts mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
      <kbd>←</kbd> <kbd>→</kbd> листать 
      <kbd>Space</kbd> переворот 
      <kbd>↑</kbd> <kbd>↓</kbd> выучено 
      <kbd>R</kbd> сброс 
      <kbd>S</kbd> перемешать 
      <kbd>T</kbd> статистика
    </div>

      <!-- Мобильные: свайпы -->
    <div class="dic-swipe-hint mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
      Тап — переворот  ← → Свайп — листать
    </div>
  </div>  <!-- Закрываем dic-flashcard-wrapper -->
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attachEventHandlers(container: HTMLElement, words: any[]) {
  let currentIndex = 0;
  let isFlipped = false;
  let studied = new Set<number>();
  let currentDirection: 'ar-ru' | 'ru-ar' = 'ru-ar';
  
  // Для свайпов
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  const minSwipeDistance = 50;
  
  const wrapper = container.querySelector('.dic-flashcard-wrapper') as HTMLElement;
  const inner = container.querySelector('.dic-flashcard-inner') as HTMLElement;
  const frontText = container.querySelector('.dic-flashcard-front .dic-flashcard-text') as HTMLElement;
  const backText = container.querySelector('.dic-flashcard-back .dic-flashcard-text') as HTMLElement;
  const frontHint = container.querySelector('.dic-flashcard-front .dic-flip-hint') as HTMLElement;
  const backHint = container.querySelector('.dic-flashcard-back .dic-flip-hint') as HTMLElement;
  const flashcard = container.querySelector('.dic-flashcard') as HTMLElement;
  const counter = container.querySelector('.dic-counter') as HTMLElement;
  const progressFill = container.querySelector('.dic-progress-fill') as HTMLElement;
  const progressText = container.querySelector('.dic-progress-text') as HTMLElement;
  const studiedBtn = container.querySelector('.dic-studied') as HTMLElement;
  
  if (!wrapper || !inner || !frontText || !backText || !counter || !progressFill || !progressText || !studiedBtn) {
    console.error('Не удалось найти элементы карточек');
    return;
  }
  
  const lessonNumber = parseInt(wrapper.getAttribute('data-lesson') || '0', 10);
  
  // Загрузка сохранённого направления
  const savedDirection = (localStorage.getItem('flashcard_direction') as 'ar-ru' | 'ru-ar') || 'ru-ar';
  currentDirection = savedDirection;
  
  function updateStudiedIcon() {
    if (studied.has(currentIndex)) {
      studiedBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 6 7 17 3 13"></polyline>
        <polyline points="21 10 12 19 7 14"></polyline>
      </svg>`;
      studiedBtn.classList.add('studied');
    } else {
      studiedBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
      studiedBtn.classList.remove('studied');
    }
  }
  
  // Загрузка прогресса
  const saved = localStorage.getItem('arabic_dictionary_progress');
  if (saved) {
    try {
      const all = JSON.parse(saved);
      studied = new Set(all[lessonNumber] || []);
    } catch (e) {
      console.error('Ошибка загрузки прогресса:', e);
    }
  }
  
  function saveProgress() {
    try {
      const saved = localStorage.getItem('arabic_dictionary_progress');
      const all = saved ? JSON.parse(saved) : {};
      all[lessonNumber] = [...studied];
      localStorage.setItem('arabic_dictionary_progress', JSON.stringify(all));
    } catch (e) {
      console.error('Ошибка сохранения прогресса:', e);
    }
  }
  
  const labels = container.querySelectorAll('.dic-toggle-label');
  
  function updateLabels() {
    labels.forEach((label, index) => {
      if (currentDirection === 'ar-ru') {
        label.classList.toggle('active', index === 1);
      } else {
        label.classList.toggle('active', index === 0);
      }
    });
  }
  
  function updateDirection(direction: 'ar-ru' | 'ru-ar') {
    currentDirection = direction;
    localStorage.setItem('flashcard_direction', direction);
    
    if (flashcard) {
      flashcard.setAttribute('data-direction', direction);
    }
    
    updateLabels();
    renderCard();
    
    // сброс переворота
    isFlipped = false;
    if (inner) inner.style.transform = 'rotateY(0deg)';
  }
  
  function renderCard() {
    const currentWord = words[currentIndex];
    const isArabicFront = currentDirection === 'ar-ru';
    
    if (frontText) {
      frontText.textContent = isArabicFront ? currentWord.arabic : currentWord.russian;
      frontText.classList.toggle('arab', isArabicFront);
    }
    
    if (backText) {
      backText.textContent = isArabicFront ? currentWord.russian : currentWord.arabic;
      backText.classList.toggle('arab', !isArabicFront);
    }
    
    if (frontHint) {
      frontHint.textContent = isArabicFront ? '👆 нажмите для перевода' : '👆 нажмите для перевода на арабский';
    }
    
    if (backHint) {
      backHint.textContent = '👆 нажмите для возврата';
    }
  }
  
  function updateUI() {
    if (counter) {
      counter.textContent = `${currentIndex + 1} / ${words.length}`;
    }
    
    const progress = (studied.size / words.length) * 100;
    
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${studied.size} / ${words.length}`;
    
    updateStudiedIcon();
    renderCard();
  }
  
  function flip() {
    isFlipped = !isFlipped;
    if (inner) inner.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  }
  
  function next() {
    currentIndex = (currentIndex + 1) % words.length;
    isFlipped = false;
    if (inner) inner.style.transform = 'rotateY(0deg)';
    updateUI();
  }
  
  function prev() {
    currentIndex = (currentIndex - 1 + words.length) % words.length;
    isFlipped = false;
    if (inner) inner.style.transform = 'rotateY(0deg)';
    updateUI();
  }
  
  function toggleStudied() {
    if (studied.has(currentIndex)) {
      studied.delete(currentIndex);
    } else {
      studied.add(currentIndex);
    }
    saveProgress();
    updateUI();
  }
  
  function shuffle() {
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    currentIndex = 0;
    isFlipped = false;
    if (inner) inner.style.transform = 'rotateY(0deg)';
    updateUI();
  }
  
  function resetProgress() {
    studied.clear();
    saveProgress();
    updateUI();
  }
  
  // Глобальная переменная для отслеживания открытой модалки
  let currentModal: HTMLElement | null = null;

  function showStats() {
    // Если модалка уже открыта — закрываем её
    if (currentModal) {
      const closeModal = (modalElement: HTMLElement) => {
        modalElement.classList.add('dic-stats-closing');
        setTimeout(() => {
          modalElement.remove();
          if (currentModal === modalElement) {
            currentModal = null;
          }
        }, 300);
      };
      closeModal(currentModal);
      return;
    }
    
    const progress = Math.round((studied.size / words.length) * 100);
    
    const modal = document.createElement('div');
    modal.className = 'dic-stats-modal';
    modal.innerHTML = `
      <div class="dic-stats-overlay"></div>
      <div class="dic-stats-content">
        <div class="dic-stats-header">
          <h3>📊 Статистика урока ${lessonNumber}</h3>
          <button class="dic-stats-close">&times;</button>
        </div>
        <div class="dic-stats-body">
          <div class="dic-stat-item">
            <span class="dic-stat-label">✅ Изучено:</span>
            <span class="dic-stat-value">${studied.size}</span>
          </div>
          <div class="dic-stat-item">
            <span class="dic-stat-label">📝 Осталось:</span>
            <span class="dic-stat-value">${words.length - studied.size}</span>
          </div>
          <div class="dic-stat-item">
            <span class="dic-stat-label">📈 Прогресс:</span>
            <span class="dic-stat-value">${progress}%</span>
          </div>
          <div class="dic-stats-progress">
            <div class="dic-stats-progress-bar" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="dic-stats-footer">
          <button class="dic-stats-btn">Закрыть</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    currentModal = modal;
    
    const closeCurrentModal = () => {
      if (currentModal) {
        currentModal.classList.add('dic-stats-closing');
        setTimeout(() => {
          if (currentModal) {
            currentModal.remove();
            currentModal = null;
          }
        }, 300);
      }
    };
    
    modal.querySelector('.dic-stats-close')?.addEventListener('click', closeCurrentModal);
    modal.querySelector('.dic-stats-btn')?.addEventListener('click', closeCurrentModal);
    modal.querySelector('.dic-stats-overlay')?.addEventListener('click', closeCurrentModal);
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentModal) {
        closeCurrentModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    setTimeout(() => modal.classList.add('dic-stats-visible'), 10);
  }
  
  function addSwipeFeedback(direction: 'left' | 'right') {
    if (!flashcard) return;
    
    flashcard.style.transition = 'transform 0.2s ease';
    flashcard.style.transform = direction === 'left' ? 'translateX(-20px)' : 'translateX(20px)';
    
    setTimeout(() => {
      flashcard.style.transform = '';
      setTimeout(() => {
        flashcard.style.transition = '';
      }, 200);
    }, 150);
  }
  
  // ========== УПРАВЛЕНИЕ С КЛАВИАТУРЫ ==========
  // Удаляем старый обработчик, чтобы не было дублирования
  if ((window as any)._keydownHandler) {
    document.removeEventListener('keydown', (window as any)._keydownHandler);
  }
  
  const handleKeyPress = (e: KeyboardEvent) => {
    const keysToPrevent = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Space'];
    if (keysToPrevent.includes(e.key)) {
      e.preventDefault();
    }
    
    switch (e.code) {
      case 'ArrowLeft':
        prev();
        addSwipeFeedback('right');
        break;
      case 'ArrowRight':
        next();
        addSwipeFeedback('left');
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        toggleStudied();
        if (studiedBtn) {
          studiedBtn.style.transform = 'scale(0.9)';
          setTimeout(() => {
            if (studiedBtn) studiedBtn.style.transform = '';
          }, 150);
        }
        break;
      case 'Space':
        e.preventDefault();
        flip();
        break;
      case 'KeyR':
        if (confirm('Сбросить прогресс изучения для этого урока?')) {
          resetProgress();
        }
        break;
      case 'KeyS':
        shuffle();
        break;
      case 'KeyT':
        showStats();
        break;
    }
  };
  
  (window as any)._keydownHandler = handleKeyPress;
  document.addEventListener('keydown', handleKeyPress);
  
  // Инициализация направления
  updateDirection(savedDirection);
  updateLabels();
  
  // Обработчик свитчера
  const toggleInput = container.querySelector('.dic-toggle-input') as HTMLInputElement;
  
  if (toggleInput) {
    toggleInput.checked = currentDirection === 'ru-ar';
    
    toggleInput.addEventListener('change', (e) => {
      e.stopPropagation();
      const newDirection = toggleInput.checked ? 'ru-ar' : 'ar-ru';
      updateDirection(newDirection);
      updateLabels();
    });
  }
  
  // Обработчики свайпов и кликов
  if (flashcard) {
    (flashcard as any).addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    });
    
    (flashcard as any).addEventListener('touchend', (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      if (Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (Math.abs(deltaX) < minSwipeDistance) return;
      
      if (deltaX > 0) {
        prev();
        addSwipeFeedback('right');
      } else {
        next();
        addSwipeFeedback('left');
      }
    });
    
    flashcard.addEventListener('click', flip);
  }
  
  container.querySelector('.dic-prev')?.addEventListener('click', prev);
  container.querySelector('.dic-next')?.addEventListener('click', next);
  studiedBtn?.addEventListener('click', toggleStudied);
  container.querySelector('.dic-shuffle')?.addEventListener('click', shuffle);
  container.querySelector('.dic-reset')?.addEventListener('click', resetProgress);
  container.querySelector('.dic-stats')?.addEventListener('click', showStats);
  
  updateUI();
}

// Защита от перерисовки при воспроизведении видео
let protectTimeout: number | null = null;

function safeProtect() {
  if (protectTimeout) clearTimeout(protectTimeout);
  protectTimeout = setTimeout(() => {
    mountFlashcards();
    protectTimeout = null;
  }, 100);
}

// Запуск и защита
if (typeof document !== 'undefined') {
  // Следим за событиями видео
  document.addEventListener('play', safeProtect, true);
  document.addEventListener('pause', safeProtect, true);
  document.addEventListener('loadedmetadata', safeProtect, true);
  document.addEventListener('seeked', safeProtect, true);
  
  // Наблюдаем за изменениями DOM
  const observer = new MutationObserver(() => {
    safeProtect();
  });
  
 const startObserver = () => {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};
  






  // Запуск монтирования
  const run = () => {
    setTimeout(() => {
      mountFlashcards();
      startObserver();
    }, 1000);
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  
  document.addEventListener('astro:page-load', () => {
    setTimeout(() => {
      mountFlashcards();
      startObserver();
    }, 1000);
  });
}
