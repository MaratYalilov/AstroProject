import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  BarChart,
  Check,
  CheckCheck
} from 'lucide-react';

const STORAGE_KEY = 'arabic_lesson_studied';

export default function FlashcardApp({ words: initialWords, lessonNumber }) {
  const [words, setWords] = useState(initialWords);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studied, setStudied] = useState(new Set());
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const all = JSON.parse(saved);
      setStudied(new Set(all[lessonNumber] || []));
    }
  }, [lessonNumber]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const all = saved ? JSON.parse(saved) : {};
    all[lessonNumber] = [...studied];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [studied, lessonNumber]);

  const currentWord = words[currentIndex];
  const progress = (studied.size / words.length) * 100;

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
    newSet.has(currentIndex)
      ? newSet.delete(currentIndex)
      : newSet.add(currentIndex);
    setStudied(newSet);
  };

  const shuffle = () => {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const reset = () => {
    setWords(initialWords);
    setStudied(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (!currentWord) {
    return <div className="text-center py-8 text-gray-500">Нет слов для изучения</div>;
  }

  return (
    <div className="flashcard-wrapper">
      {/* Прогресс */}
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        <span className="progress-text">
          {studied.size} / {words.length} слов изучено
        </span>
      </div>

      {/* Статистика */}
      {showStats && (
        <div className="stats-popup">
          <h4>Статистика</h4>
          <p>Изучено: {studied.size}</p>
          <p>Осталось: {words.length - studied.size}</p>
          <p>Прогресс: {Math.round(progress)}%</p>
          <button onClick={() => setShowStats(false)}>Закрыть</button>
        </div>
      )}

      {/* Карточка */}
      <div className="flashcard" onClick={flip}>
        <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <span className="arab flashcard-text">{currentWord.arabic}</span>
            <span className="flip-hint">нажми для перевода</span>
          </div>
          <div className="flashcard-back">
            <span className="flashcard-text">{currentWord.russian}</span>
            <span className="flip-hint">нажми для возврата</span>
          </div>
        </div>
      </div>

      {/* Счётчик */}
      <div className="counter">
        {currentIndex + 1} / {words.length}
      </div>

      {/* Кнопки */}
      <div className="controls">
        <button className="control-btn" onClick={prev} title="Предыдущее">
          <ChevronLeft size={20} />
        </button>

        <button
          className={`control-btn studied-btn ${studied.has(currentIndex) ? 'studied' : ''}`}
          onClick={toggleStudied}
          title={studied.has(currentIndex) ? 'Отметить как невыученное' : 'Отметить как выученное'}
        >
          {studied.has(currentIndex) ? <CheckCheck size={20} /> : <Check size={20} />}
        </button>

        <button className="control-btn" onClick={shuffle} title="Перемешать">
          <Shuffle size={20} />
        </button>

        <button className="control-btn" onClick={reset} title="Сбросить прогресс">
          <RotateCcw size={20} />
        </button>

        <button className="control-btn" onClick={() => setShowStats(true)} title="Статистика">
          <BarChart size={20} />
        </button>

        <button className="control-btn" onClick={next} title="Следующее">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}