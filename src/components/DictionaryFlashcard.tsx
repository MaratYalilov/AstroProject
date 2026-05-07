import React, { useState, useEffect, useRef, type CSSProperties } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  BarChart,
  Check,
  CheckCheck
} from 'lucide-react';

const STORAGE_KEY = 'arabic_dictionary_progress';
const DIRECTION_STORAGE_KEY = 'flashcard_direction';
type FlashcardDirection = 'ar-ru' | 'ru-ar';

const getStoredDirection = (): FlashcardDirection => {
  if (typeof window === 'undefined') {
    return 'ru-ar';
  }

  try {
    const savedDirection = window.localStorage.getItem(DIRECTION_STORAGE_KEY);
    return savedDirection === 'ar-ru' || savedDirection === 'ru-ar' ? savedDirection : 'ru-ar';
  } catch {
    return 'ru-ar';
  }
};

interface DictionaryFlashcardProps {
  words: Array<{ arabic: string; russian: string }>;
  lessonNumber: number;
}

export default function DictionaryFlashcard({ words: initialWords, lessonNumber }: DictionaryFlashcardProps) {
  const [words, setWords] = useState(initialWords);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studied, setStudied] = useState<Set<number>>(new Set());
  const [showStats, setShowStats] = useState(false);
  const [currentDirection, setCurrentDirection] = useState<FlashcardDirection>(() => getStoredDirection());
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  // Для свайпов
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [suppressClick, setSuppressClick] = useState(false);
  const swipeTimeoutRef = useRef<number | null>(null);
  const clickSuppressTimeoutRef = useRef<number | null>(null);
  const minSwipeDistance = 50;
  const maxDragOffset = 140;
  const swipeAnimationDuration = 180;

  // Загрузка прогресса и направления
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const all = JSON.parse(saved);
      setStudied(new Set(all[lessonNumber] || []));
    }
  }, [lessonNumber]);

  // Сохранение прогресса
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const all = saved ? JSON.parse(saved) : {};
    all[lessonNumber] = [...studied];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [studied, lessonNumber]);

  // Сохранение направления
  useEffect(() => {
    try {
      window.localStorage.setItem(DIRECTION_STORAGE_KEY, currentDirection);
    } catch {}
  }, [currentDirection]);

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) {
        window.clearTimeout(swipeTimeoutRef.current);
      }
      if (clickSuppressTimeoutRef.current) {
        window.clearTimeout(clickSuppressTimeoutRef.current);
      }
    };
  }, []);

  // Управление с клавиатуры
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const keysToPrevent = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Space'];
      if (keysToPrevent.includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.code) {
        case 'Escape':
          setShowStats(false);
          break;
        case 'ArrowLeft':
          prev();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          toggleStudied();
          break;
        case 'Space':
          e.preventDefault();
          flip();
          break;
        case 'KeyR':
            resetProgress();
          break;
        case 'KeyS':
          shuffleCards();
          break;
        case 'KeyT':
          showStatsHandler();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, studied, words, isFlipped, showStats]);

  if (!words.length) {
    return <div className="text-center py-8 text-gray-500">Нет слов для изучения</div>;
  }

  const currentWord = words[currentIndex];
  const progress = (studied.size / words.length) * 100;

  // Определяем, какая сторона показывает арабский текст
  const isArabicFront = currentDirection === 'ar-ru';
  const frontText = isArabicFront ? currentWord.arabic : currentWord.russian;
  const backText = isArabicFront ? currentWord.russian : currentWord.arabic;
  const frontHint = isArabicFront ? '👆 нажмите для перевода' : '👆 нажмите для перевода на арабский';
  const backHint = '👆 нажмите для возврата';

  // Функция озвучки
  const playAudio = (word: string) => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      setCurrentAudio(null);
    }
    
    const audioUrl = `/audio/arabic/${encodeURIComponent(word)}.mp3`;
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    
    audio.play().catch(() => {
      // Fallback на Web Speech API
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    });
    
    audio.onended = () => {
      setCurrentAudio(null);
    };
  };

  const next = () => {
    setCurrentIndex(i => (i + 1) % words.length);
    setIsFlipped(false);
  };

  const prev = () => {
    setCurrentIndex(i => (i - 1 + words.length) % words.length);
    setIsFlipped(false);
  };

  const flip = () => setIsFlipped(f => !f);

  const toggleStudied = () => {
    const newSet = new Set(studied);
    if (newSet.has(currentIndex)) {
      newSet.delete(currentIndex);
    } else {
      newSet.add(currentIndex);
    }
    setStudied(newSet);
  };

  const shuffleCards = () => {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const resetProgress = () => {
    setWords(initialWords);
    setStudied(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const showStatsHandler = () => {
    setShowStats(true);
  };

  const releaseSuppressedClickSoon = () => {
    if (clickSuppressTimeoutRef.current) {
      window.clearTimeout(clickSuppressTimeoutRef.current);
    }

    clickSuppressTimeoutRef.current = window.setTimeout(() => {
      setSuppressClick(false);
      clickSuppressTimeoutRef.current = null;
    }, 450);
  };

  // Обработчики свайпов
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSwipeAnimating) return;

    setTouchStart({
      x: e.changedTouches[0].screenX,
      y: e.changedTouches[0].screenY
    });
    setIsDragging(true);
    setSuppressClick(false);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || isSwipeAnimating) return;

    const deltaX = e.changedTouches[0].screenX - touchStart.x;
    const deltaY = e.changedTouches[0].screenY - touchStart.y;

    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (Math.abs(deltaX) > 8) {
      setSuppressClick(true);
    }

    const limitedOffset = Math.max(-maxDragOffset, Math.min(maxDragOffset, deltaX));
    setDragOffset(limitedOffset);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || isSwipeAnimating) return;

    const deltaX = e.changedTouches[0].screenX - touchStart.x;
    const deltaY = e.changedTouches[0].screenY - touchStart.y;
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= minSwipeDistance;

    setIsDragging(false);
    setTouchStart(null);
    
    if (!isHorizontalSwipe) {
      setDragOffset(0);
      if (Math.abs(deltaX) > 8) {
        releaseSuppressedClickSoon();
      }
      return;
    }

    const direction = deltaX > 0 ? 1 : -1;
    setSuppressClick(true);
    setIsSwipeAnimating(true);
    setDragOffset(direction * window.innerWidth);

    swipeTimeoutRef.current = window.setTimeout(() => {
      if (direction > 0) {
        prev();
      } else {
        next();
      }

      setDragOffset(0);
      setIsSwipeAnimating(false);
      releaseSuppressedClickSoon();
      swipeTimeoutRef.current = null;
    }, swipeAnimationDuration);
  };

  const handleCardClick = () => {
    if (suppressClick) {
      if (clickSuppressTimeoutRef.current) {
        window.clearTimeout(clickSuppressTimeoutRef.current);
        clickSuppressTimeoutRef.current = null;
      }
      setSuppressClick(false);
      return;
    }

    flip();
  };

  // Переключение направления
  const toggleDirection = () => {
    setCurrentDirection(prev => prev === 'ru-ar' ? 'ar-ru' : 'ru-ar');
    setIsFlipped(false);
  };

  const cardInnerStyle: CSSProperties = {
    transformStyle: 'preserve-3d',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
    willChange: 'transform'
  };

  const cardFaceStyle: CSSProperties = {
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transformStyle: 'preserve-3d',
    overflow: 'hidden'
  };

  const cardMotionStyle: CSSProperties = {
    perspective: '1000px',
    touchAction: 'pan-y',
    transform: `translateX(${dragOffset}px) rotate(${dragOffset / 28}deg)`,
    opacity: isSwipeAnimating ? 0.55 : 1,
    transition: isDragging ? 'none' : `transform ${swipeAnimationDuration}ms ease, opacity ${swipeAnimationDuration}ms ease`,
    willChange: 'transform, opacity'
  };

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-indigo-200 dark:border-indigo-800">
      {/* Переключатель направления */}
      <div className="flex justify-between items-center mb-4">
        <div className="dic-toggle-controls flex items-center gap-3">
          <span 
            className="text-sm"
            style={{ 
              fontWeight: currentDirection === 'ru-ar' ? 'bold' : 'normal',
              color: currentDirection === 'ru-ar' ? 'var(--primary-color)' : '#6b7280'
            }}
          >
            Русский → العربية
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={currentDirection === 'ar-ru'}
              onChange={toggleDirection}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700"></div>
            <div 
              className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"
              style={{ backgroundColor: currentDirection === 'ar-ru' ? 'var(--primary-color)' : undefined }}
            ></div>
          </label>
          <span 
            className="text-sm"
            style={{ 
              fontWeight: currentDirection === 'ar-ru' ? 'bold' : 'normal',
              color: currentDirection === 'ar-ru' ? 'var(--primary-color)' : '#6b7280'
            }}
          >
            العربية → Русский
          </span>
        </div>
      </div>

      {/* Прогресс */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        <div className="absolute left-0 top-0 h-full transition-all duration-300" 
        style={{ 
          width: `${progress}%`,
          backgroundColor:'var(--primary-color)'
        }} />
        <span className="absolute -top-6 right-0 text-xs text-gray-500 dark:text-gray-400">
          {studied.size} / {words.length}
        </span>
      </div>

{/* Карточка */}
<div 
  className="w-full h-64 cursor-pointer relative" 
  style={cardMotionStyle} 
  onClick={handleCardClick}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onTouchCancel={() => {
    setIsDragging(false);
    setTouchStart(null);
    setDragOffset(0);
  }}
>
  <div className="relative w-full h-full transition-transform duration-500" style={cardInnerStyle}>
    {/* Передняя сторона */}
    <div className="absolute inset-0 w-full h-full rounded-xl shadow-lg flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border-2
     border-indigo-200 dark:border-indigo-800/50"
         style={{
           ...cardFaceStyle,
           transform: 'rotateY(0deg) translateZ(1px)'
         }}>
      {isArabicFront && (
        <button 
          onClick={(e) => { e.stopPropagation(); playAudio(currentWord.arabic); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
          title="Прослушать"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        </button>
      )}
      <span className={`dic-card-word text-xl text-center font-medium break-words max-w-full px-2 ${isArabicFront ? 'arab' : ''}`}>
        {frontText}
      </span>
      <span className="absolute bottom-4 text-xs text-gray-400">
        {frontHint}
      </span>
    </div>
    
    {/* Задняя сторона */}
    <div className="absolute inset-0 w-full h-full rounded-xl shadow-lg flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 dark:border-green-900/50 border-2"
         style={{
           ...cardFaceStyle,
           transform: 'rotateY(180deg) translateZ(1px)'
         }}>
      {!isArabicFront && (
        <button 
          onClick={(e) => { e.stopPropagation(); playAudio(currentWord.arabic); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
          title="Прослушать"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        </button>
      )}
      <span className={`dic-card-word text-xl text-center font-medium break-words max-w-full px-2 ${isArabicFront ? '' : 'arab'}`}>
        {backText}
      </span>
      <span className="absolute bottom-4 text-xs text-gray-400">
        {backHint}
      </span>
    </div>
  </div>
</div>

      {/* Счётчик */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        {currentIndex + 1} / {words.length}
      </div>

      {/* Кнопки управления */}
      <div className="flex justify-center gap-2 mt-6">
        <button onClick={prev} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors" title="Предыдущее">
          <ChevronLeft size={18} />
        </button>

        <button 
          onClick={toggleStudied} 
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            studied.has(currentIndex) 
              ? 'text-white' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          style={{
            backgroundColor: studied.has(currentIndex) ? 'var(--primary-color)' : undefined
          }}
          title={studied.has(currentIndex) ? 'Отметить как невыученное' : 'Отметить как выученное'}
        >
          {studied.has(currentIndex) ? <CheckCheck size={18} /> : <Check size={18} />}
        </button>

        <button onClick={shuffleCards} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors" title="Перемешать">
          <Shuffle size={18} />
        </button>
        <button onClick={resetProgress} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors" title="Сбросить прогресс">
          <RotateCcw size={18} />
        </button>
        <button onClick={showStatsHandler} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors" title="Статистика">
          <BarChart size={18} />
        </button>
        <button onClick={next} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors" title="Следующее">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Подсказки клавиш */}
    <div className="dic-keyboard-shortcuts mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
      <kbd>←</kbd> <kbd>→</kbd> листать 
      <kbd>Space</kbd> переворот 
      <kbd>↑</kbd> <kbd>↓</kbd> выучено 
      <kbd>R</kbd> сброс 
      <kbd>S</kbd> перемешать 
      <kbd>T</kbd> статистика
    </div>

      {/* Модалка статистики */}
      {showStats && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 z-50 border border-gray-200 dark:border-gray-700 min-w-[250px]">
          <h4 className="text-lg font-bold mb-3">Статистика урока {lessonNumber}</h4>
          <p>Изучено: {studied.size}</p>
          <p>Осталось: {words.length - studied.size}</p>
          <p>Прогресс: {Math.round(progress)}%</p>
          <button onClick={() => setShowStats(false)} className="mt-4 w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}
