---
title: 'الوقف والابتداء — Остановка и начало чтения'
order: 1
---
<style>
  /* =========================================================
     ПЕРЕКЛЮЧАТЕЛЬ ТЕМ
     ========================================================= */
  .waqf-page {
    --waqf-accent: #2563eb;
    --waqf-accent-soft: rgba(37, 99, 235, 0.1);
    --waqf-border: rgba(0, 0, 0, 0.14);
    --waqf-muted: rgba(0, 0, 0, 0.68);
    --waqf-card: rgba(0, 0, 0, 0.04);
    --waqf-bg: #ffffff;
    --waqf-text: #000000;
    --waqf-good: #16803c;
    --waqf-warn: #b7791f;
    --waqf-bad: #c53030;
    --waqf-hero-gradient: radial-gradient(circle at 85% 15%, rgba(37, 99, 235, 0.1), transparent 35%);
    max-width: 1100px;
    margin: 0 auto;
    padding: 1rem 1rem 4rem;
    background: var(--waqf-bg);
    color: var(--waqf-text);
    transition: background 0.3s ease, color 0.3s ease;
  }
  /* Тёмная тема */
  .waqf-page.dark {
    --waqf-accent: #60a5fa;
    --waqf-accent-soft: rgba(96, 165, 250, 0.15);
    --waqf-border: rgba(255, 255, 255, 0.14);
    --waqf-muted: rgba(255, 255, 255, 0.68);
    --waqf-card: rgba(255, 255, 255, 0.06);
    --waqf-bg: #0f172a;
    --waqf-text: #f1f5f9;
    --waqf-good: #4ade80;
    --waqf-warn: #fbbf24;
    --waqf-bad: #f87171;
    --waqf-hero-gradient: radial-gradient(circle at 85% 15%, rgba(96, 165, 250, 0.15), transparent 35%);
  }
  /* Кнопка переключения темы */
  .theme-toggle {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    padding: 0.6rem 1rem;
    border: 1px solid var(--waqf-border);
    border-radius: 50px;
    background: var(--waqf-card);
    color: var(--waqf-text);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .theme-toggle:hover {
    transform: scale(1.05);
    border-color: var(--waqf-accent);
  }
  .theme-toggle .icon {
    display: inline-block;
    margin-right: 0.5rem;
  }
  /* =========================================================
     Арабский текст
     ========================================================= */
  .waqf-page .arab {
    font-size: clamp(1.6rem, 3.5vw, 1.8rem);
    line-height: clamp(1, 2, 2.5);
    direction: rtl !important;
    unicode-bidi: isolate;
    font-family:
      "AmiriLocal",
      "Scheherazade New",
      "Amiri",
      serif !important;
  }
  .waqf-page .arab-xl {
    font-size: clamp(2.1rem, 5vw, 3rem);
    line-height: 1.8;
  }
  .waqf-page .arab-lg {
    font-size: clamp(1.8rem, 4vw, 2.25rem);
    line-height: 1.8;
  }
  .waqf-page .arab-sm {
    font-size: clamp(1.35rem, 3vw, 1.6rem);
    line-height: 1.8;
  }
  /* =========================================================
     Hero
     ========================================================= */
  .waqf-hero {
    position: relative;
    overflow: hidden;
    margin-bottom: 2rem;
    padding: clamp(1.5rem, 4vw, 3rem);
    border: 1px solid var(--waqf-border);
    border-radius: 24px;
    background: var(--waqf-hero-gradient), var(--waqf-card);
  }
  .waqf-hero::before {
    content: "وَقْف";
    position: absolute;
    right: -1rem;
    top: -2.5rem;
    font-family:
      "AmiriLocal",
      "Scheherazade New",
      "Amiri",
      serif;
    font-size: clamp(7rem, 18vw, 12rem);
    line-height: 1;
    opacity: .045;
    pointer-events: none;
  }
  .waqf-hero-content {
    position: relative;
    z-index: 1;
  }
  .waqf-kicker {
    margin: 0 0 .5rem;
    color: var(--waqf-accent);
    font-size: .85rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .waqf-title {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.5rem);
    line-height: 1.1;
  }
  .waqf-subtitle {
    margin: .8rem 0 0;
    max-width: 800px;
    color: var(--waqf-muted);
    font-size: 1.05rem;
    line-height: 1.7;
  }
  /* =========================================================
     Общие блоки
     ========================================================= */
  .waqf-section {
    margin-top: 2.5rem;
  }
  .waqf-section-title {
    display: flex;
    align-items: baseline;
    gap: .75rem;
    margin: 0 0 1rem;
    font-size: clamp(1.4rem, 3vw, 2rem);
  }
  .waqf-section-title .arab {
    color: var(--waqf-accent);
    font-weight: 700;
  }
  .waqf-card {
    margin: 1rem 0;
    padding: 1.25rem;
    border: 1px solid var(--waqf-border);
    border-radius: 16px;
    background: var(--waqf-card);
  }
  .waqf-card p:last-child {
    margin-bottom: 0;
  }
  .waqf-definition {
    display: grid;
    grid-template-columns: minmax(140px, 220px) 1fr;
    gap: 1rem 1.5rem;
    align-items: start;
  }
  .waqf-term {
    font-weight: 700;
  }
  .waqf-term .arab {
    display: block;
    margin-bottom: .2rem;
    color: var(--waqf-accent);
  }
  .waqf-muted {
    color: var(--waqf-muted);
  }
  .waqf-note {
    margin: 1.25rem 0;
    padding: 1.15rem 1.25rem;
    border: 1px solid color-mix(in srgb, var(--waqf-warn) 35%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--waqf-warn) 8%, transparent);
  }
  .waqf-note strong {
    display: block;
    margin-bottom: .3rem;
  }
  
  /* =========================================================
     Типы الوقف
     ========================================================= */
  .waqf-types {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  .waqf-type {
    padding: 1.25rem;
    border: 1px solid var(--waqf-border);
    border-radius: 16px;
    background: var(--waqf-card);
  }
  .waqf-type-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    margin-bottom: .6rem;
    border-radius: 50%;
    background: var(--waqf-accent-soft);
    color: var(--waqf-accent);
    font-weight: 700;
  }
  .waqf-type h3 {
    margin: 0 0 .3rem;
  }
  .waqf-type h3 .arab {
    color: var(--waqf-accent);
  }
  .waqf-type p {
    margin-bottom: 0;
    line-height: 1.7;
  }
  /* =========================================================
     Примеры Корана
     ========================================================= */
  .quran-example {
    margin: 1.25rem 0;
    padding: 1.25rem 1.5rem;
    border-right: 4px solid var(--waqf-accent);
    border-radius: 12px;
    background: var(--waqf-accent-soft);
    text-align: right;
  }
  .quran-example .arab {
    display: block;
    text-align: right;
  }
  .quran-reference {
    margin-top: .4rem;
    color: var(--waqf-muted);
    font-size: .9rem;
    text-align: left;
  }
  /* =========================================================
     Таблицы
     ========================================================= */
  .waqf-table-wrap {
    margin: 1.25rem 0;
    overflow-x: auto;
    border: 1px solid var(--waqf-border);
    border-radius: 16px;
  }
  .waqf-table {
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
  }
  .waqf-table th,
  .waqf-table td {
    padding: .9rem 1rem;
    border-bottom: 1px solid var(--waqf-border);
    vertical-align: middle;
    text-align: left;
  }
  .waqf-table th {
    background: var(--waqf-card);
    font-size: .9rem;
    font-weight: 700;
  }
  .waqf-table tr:last-child td {
    border-bottom: 0;
  }
  .waqf-table .arab-cell {
    min-width: 120px;
    text-align: right;
  }
  .waqf-table .arab-cell .arab {
    display: block;
  }
  .waqf-result {
    font-weight: 700;
  }
  .waqf-result.good {
    color: var(--waqf-good);
  }
  .waqf-result.warn {
    color: var(--waqf-warn);
  }
  .waqf-result.bad {
    color: var(--waqf-bad);
  }
  /* =========================================================
     Специальные карточки
     ========================================================= */
  .waqf-special {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .waqf-special-card {
    padding: 1.25rem;
    border: 1px solid var(--waqf-border);
    border-radius: 16px;
    background: var(--waqf-card);
  }
  .waqf-special-card h3 {
    margin-top: 0;
  }
  .waqf-special-card .arab {
    display: block;
    margin: .5rem 0;
    text-align: center;
  }
  /* =========================================================
     Знаки الوقف
     ========================================================= */
  .waqf-signs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: .8rem;
  }
  .waqf-sign {
    display: flex;
    align-items: center;
    gap: .9rem;
    padding: 1rem;
    border: 1px solid var(--waqf-border);
    border-radius: 14px;
    background: var(--waqf-card);
  }
  .waqf-symbol {
    display: flex;
    flex: 0 0 3rem;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    border-radius: 10px;
    background: var(--waqf-accent-soft);
    color: var(--waqf-accent);
    font-size: 1.3rem;
    font-weight: 800;
  }
  .waqf-sign strong {
    display: block;
    margin-bottom: .15rem;
  }
  .waqf-sign span {
    color: var(--waqf-muted);
    font-size: .9rem;
    line-height: 1.4;
  }
  /* =========================================================
     Сравнение الروم والإشمام
     ========================================================= */
  .rom-ishmam {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .rom-ishmam-card {
    padding: 1.5rem;
    border: 1px solid var(--waqf-border);
    border-radius: 18px;
    background: var(--waqf-card);
  }
  .rom-ishmam-card h3 {
    margin-top: 0;
  }
  .rom-ishmam-card .arab {
    display: block;
    margin: .8rem 0;
    text-align: center;
  }
  .comparison-list {
    margin: 0;
    padding-left: 1.2rem;
    line-height: 1.7;
  }
  /* =========================================================
     Алгоритм
     ========================================================= */
  .waqf-steps {
    display: grid;
    gap: .8rem;
    counter-reset: steps;
  }
  .waqf-step {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 1rem;
    align-items: start;
    padding: 1rem;
    border: 1px solid var(--waqf-border);
    border-radius: 14px;
    background: var(--waqf-card);
    counter-increment: steps;
  }
  .waqf-step::before {
    content: counter(steps);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: var(--waqf-accent-soft);
    color: var(--waqf-accent);
    font-weight: 800;
  }
  .waqf-step p {
    margin: 0;
    line-height: 1.7;
  }
  /* =========================================================
     Сравнение واقف / ساكت
     ========================================================= */
  .comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  .comparison-grid .waqf-card {
    margin: 0;
  }
  /* =========================================================
     Мобильная версия
     ========================================================= */
  @media (max-width: 800px) {
    .waqf-types,
    .waqf-special,
    .waqf-signs,
    .comparison-grid {
      grid-template-columns: 1fr;
    }
    .rom-ishmam {
      grid-template-columns: 1fr;
    }
    .waqf-definition {
      grid-template-columns: 1fr;
      gap: .3rem;
    }
  }
  @media (max-width: 600px) {
    .waqf-page {
      padding-left: .75rem;
      padding-right: .75rem;
    }
    .waqf-hero {
      border-radius: 18px;
    }
    .waqf-card,
    .waqf-type,
    .rom-ishmam-card {
      padding: 1rem;
    }
    .quran-example {
      padding: 1rem;
    }
    .theme-toggle {
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
  }
</style>
<div class="waqf-page" id="waqfPage">
  <!-- Кнопка переключения темы -->
  <button class="theme-toggle" id="themeToggle" aria-label="Переключить тему">
    <span class="icon">🌙</span>
    <span class="label">Тёмная</span>
  </button>
  <!-- =====================================================
       HERO
       ===================================================== -->
  <header class="waqf-hero">
    <div class="waqf-hero-content">
      <p class="waqf-kicker">Таджвид · الوقف والابتداء</p>
      <h1 class="waqf-title">
        Остановка и начало чтения Корана
      </h1>
      <p class="waqf-subtitle">
        Правила الوقف والابتداء, виды остановок, изменение конечной
        огласовки, الروم والإشمام и основные знаки остановки в мусхафе.
      </p>
      <div class="arab arab-xl" style="margin-top: 1rem;">
        الْوَقْفُ وَالِابْتِدَاءُ
      </div>
    </div>
  </header>
  <!-- =====================================================
       1. ОПРЕДЕЛЕНИЯ
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>1.</span>
      Что такое الوقف والابتداء
    </h2>
    <div class="waqf-card">
      <div class="waqf-definition">
        <div class="waqf-term">
          <span class="arab arab-lg">الوقف</span>
          Остановка
        </div>
        <div>
          Временная остановка при чтении Корана на слове с намерением
          продолжить чтение.
        </div>
        <div class="waqf-term">
          <span class="arab arab-lg">الابتداء</span>
          Начало
        </div>
        <div>
          Начало чтения после остановки с такого места, которое
          соответствует смыслу и грамматике.
        </div>
        <div class="waqf-term">
          <span class="arab arab-lg">السكت</span>
          Сакт
        </div>
        <div>
          Очень короткая пауза <strong>без взятия дыхания</strong> в местах,
          предусмотренных конкретной передачей чтения.
        </div>
      </div>
      <!-- Сравнение الوقف и السكت -->
      <div style="margin-top: 1.5rem; border-top: 1px solid var(--waqf-border); padding-top: 1.5rem;">
        <h4 style="margin-top: 0;">Разница между الوقف и السكت</h4>
        <div class="comparison-grid">
          <div class="waqf-card" style="margin:0;">
            <strong style="color: var(--waqf-accent);">الوقف</strong>
            <ul style="margin:0.5rem 0 0; padding-left:1.2rem; line-height:1.7;">
              <li>Пауза <strong>с</strong> взятием дыхания</li>
              <li>Можно в любом месте (по правилам)</li>
              <li>Изменяет окончание слова</li>
            </ul>
          </div>
          <div class="waqf-card" style="margin:0;">
            <strong style="color: var(--waqf-accent);">السكت</strong>
            <ul style="margin:0.5rem 0 0; padding-left:1.2rem; line-height:1.7;">
              <li>Пауза <strong>без</strong> взятия дыхания</li>
              <li>Только в определённых местах (риваят)</li>
              <li>Окончание слова <strong>не</strong> меняется</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
  <!-- =====================================================
       2. ВИДЫ ОСТАНОВКИ
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>2.</span>
      Виды الوقف
    </h2>
    <div class="waqf-types">
      <article class="waqf-type">
        <div class="waqf-type-number">1</div>
        <h3>
          <span class="arab">الوقف الاضطراري</span>
          Вынужденная остановка
        </h3>
        <p>
          Остановка из-за нехватки дыхания, кашля, чихания,
          забывания или другой необходимости.
        </p>
        <p class="waqf-muted">
          <strong>Важно:</strong> После такой остановки нужно
          <strong>вернуться на несколько слов назад</strong>,
          чтобы не нарушить смысл и грамматику.
        </p>
      </article>
      <article class="waqf-type">
        <div class="waqf-type-number">2</div>
        <h3>
          <span class="arab">الوقف الانتظاري</span>
          Выжидательная остановка
        </h3>
        <p>
          Используется при изучении и передаче различных вариантов
          чтения. В обычном чтении Корана практически не применяется.
        </p>
      </article>
      <article class="waqf-type">
        <div class="waqf-type-number">3</div>
        <h3>
          <span class="arab">الوقف الاختباري</span>
          Проверочная остановка
        </h3>
        <p>
          Используется для объяснения написания слов и особенностей
          رسم المصحف.
        </p>
      </article>
      <article class="waqf-type">
        <div class="waqf-type-number">4</div>
        <h3>
          <span class="arab">الوقف الاختياري</span>
          Намеренная остановка
        </h3>
        <p>
          Остановка, которую чтец выбирает самостоятельно.
          Именно она имеет основные подразделения:
        </p>
        <div class="arab arab-lg" style="margin-top:.5rem;">
          تَامٌّ — كَافٍ — حَسَنٌ — قَبِيحٌ
        </div>
      </article>
    </div>
  </section>
  <!-- =====================================================
       3. ТАМ КАФ ХАСАН КАБИХ
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>3.</span>
      Четыре вида الوقف الاختياري
    </h2>
    <div class="waqf-card">
      <h3>
        <span class="arab arab-lg">الوقف التامّ</span>
        — полная остановка
      </h3>
      <p>
        Смысл завершён, и после остановки нет ни грамматической,
        ни существенной смысловой связи с последующим.
      </p>
      <div class="quran-example">
        <div class="arab arab-lg">
          وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ
        </div>
        <div class="quran-reference">
          Аль-Бакара, 2:5 (конец аята)
        </div>
      </div>
      <p>
        Такая остановка является хорошей и позволяет начать
        следующий смысловой фрагмент.
      </p>
      <p class="waqf-muted">
        <strong>Примечание:</strong> Не каждый конец аята является
        <span class="arab">وقفاً تامّاً</span>, так как смысл может
        продолжаться в следующем аяте.
      </p>
    </div>
    <div class="waqf-card">
      <h3>
        <span class="arab arab-lg">الوقف الكافي</span>
        — достаточная остановка
      </h3>
      <p>
        Смысл завершён, но с последующим имеется смысловая связь,
        хотя грамматической зависимости нет.
      </p>
      <p class="waqf-muted">
        Остановиться можно, и начать после неё также можно.
      </p>
    </div>
    <div class="waqf-card">
      <h3>
        <span class="arab arab-lg">الوقف الحسن</span>
        — хорошая остановка
      </h3>
      <p>
        Смысл в целом понятен, но между остановленным местом
        и последующим существует грамматическая или сильная
        смысловая связь.
      </p>
      <div class="waqf-note">
        <strong>Важно</strong>
        Не каждое место, где технически можно остановиться,
        является хорошим местом для нового начала. После
        <span class="arab">الوقف الحسن</span>
        нужно смотреть, можно ли грамматически и смыслово
        начинать с последующего слова.
      </div>
    </div>
    <div class="waqf-card">
      <h3>
        <span class="arab arab-lg">الوقف القبيح</span>
        — плохая остановка
      </h3>
      <p>
        Остановка там, где смысл ещё не завершён или отделение
        может привести к неправильному пониманию.
      </p>
      <div class="quran-example" style="border-color: var(--waqf-bad);">
        <div class="arab arab-lg">
          إِنَّ اللَّهَ غَفُورٌ رَحِيمٌ
        </div>
        <div class="quran-reference">
          Пример: остановка после <span class="arab">غَفُورٌ</span> без завершения смысла
        </div>
      </div>
      <p class="waqf-result bad">
        Без необходимости такой остановки следует избегать.
      </p>
    </div>
  </section>
  <!-- =====================================================
       4. ГЛАВНАЯ ТАБЛИЦА — ИЗМЕНЕНИЕ КОНЦА СЛОВА
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>4.</span>
      Правила изменения последней буквы при الوقف
    </h2>
    <div class="waqf-card">
      <p>
        При остановке конечная огласовка слова обычно перестаёт
        произноситься и последняя буква получает сукун.
        Однако существуют важные исключения.
      </p>
    </div>
    <div class="waqf-table-wrap">
      <table class="waqf-table">
        <thead>
          <tr>
            <th>Состояние при وصل</th>
            <th>Пример</th>
            <th>При الوقف</th>
            <th>Правило</th>
          </tr>
        </thead>
        <tbody>
          <!-- ФАТХА -->
          <tr>
            <td>
              <strong>Фатха</strong>
              <br>
              <span class="arab arab-sm">ـَ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">نَعْبُدُ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">نَعْبُدْ</span>
            </td>
            <td>
              Фатха заменяется сукуном.
            </td>
          </tr>
          <!-- ДАММА -->
          <tr>
            <td>
              <strong>Дамма</strong>
              <br>
              <span class="arab arab-sm">ـُ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">نَسْتَعِينُ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">نَسْتَعِينْ</span>
            </td>
            <td>
              Дамма заменяется сукуном.
            </td>
          </tr>
          <!-- КАСРА -->
          <tr>
            <td>
              <strong>Касра</strong>
              <br>
              <span class="arab arab-sm">ـِ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">الرَّحِيمِ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">الرَّحِيمْ</span>
            </td>
            <td>
              Касра заменяется сукуном.
            </td>
          </tr>
          <!-- ТАНВИН ДАММА -->
          <tr>
            <td>
              <strong>Танвин даммы</strong>
              <br>
              <span class="arab arab-sm">ـٌ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">عَلِيمٌ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">عَلِيمْ</span>
            </td>
            <td>
              Танвин исчезает, последняя буква получает сукун.
            </td>
          </tr>
          <!-- ТАНВИН КАСРА -->
          <tr>
            <td>
              <strong>Танвин касры</strong>
              <br>
              <span class="arab arab-sm">ـٍ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">عَلِيمٍ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">عَلِيمْ</span>
            </td>
            <td>
              Танвин исчезает, последняя буква получает сукун.
            </td>
          </tr>
          <!-- ТАНВИН ФАТХА -->
          <tr>
            <td>
              <strong>Танвин фатхи</strong>
              <br>
              <span class="arab arab-sm">ـً</span>
            </td>
            <td class="arab-cell">
              <span class="arab">عَلِيمًا</span>
            </td>
            <td class="arab-cell">
              <span class="arab">عَلِيمَا</span>
            </td>
            <td>
              Фатхатайн при الوقف заменяется алифом
              и читается как мадд на 2 хараката.
              <br><span class="waqf-muted">(Кроме случаев с هاء и همزة)</span>
            </td>
          </tr>
          <!-- ة -->
          <tr>
            <td>
              <strong>تاء مربوطة</strong>
              <br>
              <span class="arab arab-sm">ة</span>
            </td>
            <td class="arab-cell">
              <span class="arab">رَحْمَةٌ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">رَحْمَهْ</span>
            </td>
            <td>
              <span class="arab">ة</span>
              при остановке читается как
              <span class="arab">هْ</span>.
            </td>
          </tr>
          <!-- ت -->
          <tr>
            <td>
              <strong>تاء مفتوحة</strong>
              <br>
              <span class="arab arab-sm">ت</span>
            </td>
            <td class="arab-cell">
              <span class="arab">قَالَتْ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">قَالَتْ</span>
            </td>
            <td>
              <span class="arab">ت</span>
              остаётся ت.
            </td>
          </tr>
          <!-- ШАДДА -->
          <tr>
            <td>
              <strong>Шадда</strong>
              <br>
              <span class="arab arab-sm">ـّ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">وَتَبَّ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">وَتَبّْ</span>
            </td>
            <td>
              Шадда сохраняется, конечная буква получает сукун.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <!-- =====================================================
       5. ОСОБЫЕ КОНЕЧНЫЕ БУКВЫ
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>5.</span>
      Особые случаи: ة، ه، ء، ي، و، ا
    </h2>
    <div class="waqf-table-wrap">
      <table class="waqf-table">
        <thead>
          <tr>
            <th>Буква</th>
            <th>Пример при وصل</th>
            <th>При الوقف</th>
            <th>Пояснение</th>
          </tr>
        </thead>
        <tbody>
          <!-- ة -->
          <tr>
            <td class="arab-cell">
              <span class="arab arab-lg">ة</span>
            </td>
            <td class="arab-cell">
              <span class="arab">جَنَّةٍ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">جَنَّهْ</span>
            </td>
            <td>
              تاء مربوطة при остановке произносится как هاء с сукуном.
            </td>
          </tr>
          <!-- همزة -->
          <tr>
            <td class="arab-cell">
              <span class="arab arab-lg">ء</span>
            </td>
            <td class="arab-cell">
              <span class="arab">السَّمَاءُ</span>
            </td>
            <td class="arab-cell">
              <span class="arab">السَّمَاءْ</span>
            </td>
            <td>
              Гамза сохраняется; конечная огласовка снимается.
            </td>
          </tr>
          <!-- ياء -->
          <tr>
            <td class="arab-cell">
              <span class="arab arab-lg">ي</span>
            </td>
            <td class="arab-cell">
              <span class="arab">الَّذِي</span>
            </td>
            <td class="arab-cell">
              <span class="arab">الَّذِي</span>
            </td>
            <td>
              Конечная ياء сохраняется; звук мадда сохраняется.
            </td>
          </tr>
          <!-- واو -->
          <tr>
            <td class="arab-cell">
              <span class="arab arab-lg">و</span>
            </td>
            <td class="arab-cell">
              <span class="arab">آمَنُوا</span>
            </td>
            <td class="arab-cell">
              <span class="arab">آمَنُوا</span>
            </td>
            <td>
              Конечная واو الجماعة сохраняется.
            </td>
          </tr>
          <!-- ألف -->
          <tr>
            <td class="arab-cell">
              <span class="arab arab-lg">ا</span>
            </td>
            <td class="arab-cell">
              <span class="arab">قَالَا</span>
            </td>
            <td class="arab-cell">
              <span class="arab">قَالَا</span>
            </td>
            <td>
              Конечный алиф сохраняется и читается как мадд на 2 хараката.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <!-- =====================================================
       6. هاء الضمير
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>6.</span>
      هاء الضمير и صلة
    </h2>
    <div class="waqf-card">
      <p>
        При продолжении чтения местоимение
        <span class="arab">هُ / هِ</span>
        может иметь صلة. При остановке صلة не читается.
      </p>
      <div class="quran-example">
        <div class="arab arab-lg">
          إِنَّهُ كَانَ
        </div>
        <div class="arab arab-lg">
          إِنَّهْ
        </div>
        <div class="quran-reference">
          При وصل: صلة &nbsp;|&nbsp; при وقف: без صلة
        </div>
      </div>
      <div class="quran-example">
        <div class="arab arab-lg">
          بِهِ
        </div>
        <div class="arab arab-lg">
          بِهْ
        </div>
        <div class="quran-reference">
          При остановке дополнительное удлинение صلة исчезает.
        </div>
      </div>
      <p class="waqf-muted" style="margin-top: 0.5rem;">
        <strong>Важно:</strong> Если перед هاء стоит сукун, то صلة
        изначально отсутствует — при остановке ничего не меняется.
      </p>
    </div>
  </section>
  <!-- =====================================================
       7. السكون
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>7.</span>
      السكون — обычная остановка
    </h2>
    <div class="waqf-card">
      <p>
        Основной способ الوقف — остановка с сукуном.
        Последняя огласовка слова не произносится.
      </p>
      <div class="quran-example">
        <div class="arab arab-xl">
          نَعْبُدُ
        </div>
        <div class="arab arab-xl">
          نَعْبُدْ
        </div>
        <div class="quran-reference">
          ضمة → сукун
        </div>
      </div>
      <div class="quran-example">
        <div class="arab arab-xl">
          الرَّحِيمِ
        </div>
        <div class="arab arab-xl">
          الرَّحِيمْ
        </div>
        <div class="quran-reference">
          كسرة → сукун
        </div>
      </div>
    </div>
  </section>
  <!-- =====================================================
       8. الروم
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>8.</span>
      <span class="arab">الرَّوْم</span>
      — Раум
    </h2>
    <div class="rom-ishmam">
      <article class="rom-ishmam-card">
        <h3>
          <span class="arab arab-lg">الرَّوْم</span>
        </h3>
        <p>
          Это очень слабое произнесение части исходной огласовки
          при остановке. Звук слышен <strong>только</strong> тому,
          кто находится очень близко, но произносится значительно
          слабее обычного.
        </p>
        <div class="arab arab-xl">
          ـُ &nbsp;&nbsp; ـِ
        </div>
        <ul class="comparison-list">
          <li>Применяется к дамме.</li>
          <li>Применяется к касре.</li>
          <li>Не применяется к фатхе.</li>
          <li>Показывает исходную огласовку слова.</li>
          <li>Применяется только если буква не имеет сукуна изначально.</li>
        </ul>
      </article>
      <article class="rom-ishmam-card">
        <h3>
          <span class="arab arab-lg">الإشمام</span>
        </h3>
        <p>
          После произнесения последней буквы с сукуном губы принимают
          форму, напоминающую произнесение даммы, но самого звука
          даммы нет.
        </p>
        <div class="arab arab-xl">
          ضَمٌّ ← إِشْمَام
        </div>
        <ul class="comparison-list">
          <li>Слухом ишмам не слышен.</li>
          <li>Видно положение губ.</li>
          <li>Связан с даммой.</li>
          <li>Не применяется к фатхе и касре.</li>
        </ul>
      </article>
    </div>
    <div class="waqf-card">
      <h3>Разница между الرَّوْم и الإشمام</h3>
      <div class="waqf-table-wrap">
        <table class="waqf-table">
          <thead>
            <tr>
              <th></th>
              <th>
                <span class="arab">الرَّوْم</span>
              </th>
              <th>
                <span class="arab">الإشمام</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Слышен звук?</td>
              <td>Да, очень тихо</td>
              <td>Нет</td>
            </tr>
            <tr>
              <td>Движение губ?</td>
              <td>Да</td>
              <td>Да</td>
            </tr>
            <tr>
              <td>Дамма</td>
              <td>✓</td>
              <td>✓</td>
            </tr>
            <tr>
              <td>Касра</td>
              <td>✓</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Фатха</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
  <!-- =====================================================
       9. ЗНАКИ В МУСХАФЕ
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>9.</span>
      Знаки остановки в мусхафе
    </h2>
    <div class="waqf-signs">
      <div class="waqf-sign">
        <div class="waqf-symbol arab">م</div>
        <div>
          <strong>الوقف اللازم</strong>
          <span>
            Остановка необходима или настоятельно рекомендуется,
            чтобы не нарушить смысл.
          </span>
        </div>
      </div>
      <div class="waqf-sign">
        <div class="waqf-symbol arab">لا</div>
        <div>
          <strong>لا تقف</strong>
          <span>
            Обычно означает, что останавливаться здесь не следует.
            <br><span class="waqf-muted">(Исключение: при нехватке дыхания
            допускается вынужденная остановка)</span>
          </span>
        </div>
      </div>
      <div class="waqf-sign">
        <div class="waqf-symbol arab">ج</div>
        <div>
          <strong>الوقف الجائز</strong>
          <span>
            Остановиться можно, можно также продолжить.
          </span>
        </div>
      </div>
      <div class="waqf-sign">
        <div class="waqf-symbol arab">قِفْ</div>
        <div>
          <strong>الوقف أولى</strong>
          <span>
            Остановка предпочтительнее продолжения.
            <br><span class="waqf-muted">(Ранее обозначалось как قلى)</span>
          </span>
        </div>
      </div>
      <div class="waqf-sign">
        <div class="waqf-symbol arab">صِلْ</div>
        <div>
          <strong>الوصل أولى</strong>
          <span>
            Продолжение предпочтительнее остановки.
            <br><span class="waqf-muted">(Ранее обозначалось как صلى)</span>
          </span>
        </div>
      </div>
      <div class="waqf-sign">
        <div class="waqf-symbol arab">ۛ</div>
        <div>
          <strong>وقف المعانقة</strong>
          <span>
            Между двумя знаками можно остановиться только в одном месте.
          </span>
        </div>
      </div>
    </div>
  </section>
  <!-- =====================================================
       10. وقف المعانقة
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>10.</span>
      <span class="arab">وقف المعانقة</span>
    </h2>
    <div class="waqf-card">
      <p>
        Два знака остановки образуют пару. Если остановился на первом,
        на втором останавливаться уже нельзя. И наоборот.
      </p>
      <div class="quran-example">
        <div class="arab arab-lg">
          ... ۛ ... ۛ ...
        </div>
        <div class="quran-reference">
          Остановка допускается на одном из двух мест, но не на обоих.
        </div>
      </div>
    </div>
  </section>
  <!-- =====================================================
       11. السكت عند حفص
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>11.</span>
      <span class="arab">السكت</span>
      в رواية حفص
    </h2>
    <div class="waqf-card">
      <p>
        В распространённой передаче Хафса от ‘Асима имеются известные
        места с краткой паузой без взятия дыхания.
        <span class="waqf-muted">(В других риваятах этих мест может не быть.)</span>
      </p>
      <div class="waqf-special">
        <article class="waqf-special-card">
          <h3>1</h3>
          <div class="arab arab-lg">
            عِوَجًا ۜ قَيِّمًا
          </div>
          <p class="waqf-muted">
            Аль-Кахф, 18:1
          </p>
        </article>
        <article class="waqf-special-card">
          <h3>2</h3>
          <div class="arab arab-lg">
            مَرْقَدِنَا ۜ هَٰذَا
          </div>
          <p class="waqf-muted">
            Ясин, 36:52
          </p>
        </article>
        <article class="waqf-special-card">
          <h3>3</h3>
          <div class="arab arab-lg">
            مَنْ ۜ رَاقٍ
          </div>
          <p class="waqf-muted">
            Аль-Кияма, 75:27
          </p>
        </article>
        <article class="waqf-special-card">
          <h3>4</h3>
          <div class="arab arab-lg">
            بَلْ ۜ رَانَ
          </div>
          <p class="waqf-muted">
            Аль-Мутаффифин, 83:14
          </p>
        </article>
        <article class="waqf-special-card">
          <h3>Особый случай</h3>
          <div class="arab arab-lg">
            مَالِيَهْ ۜ هَلَكَ
          </div>
          <p class="waqf-muted">
            Аль-Хакка, 69:28–29 (два аята)
          </p>
        </article>
      </div>
    </div>
  </section>
  <!-- =====================================================
       12. ВЫНУЖДЕННАЯ ОСТАНОВКА
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>12.</span>
      Если закончился воздух
    </h2>
    <div class="waqf-card">
      <p>
        Если дыхание закончилось до подходящего места, не следует
        пытаться любой ценой продолжать чтение.
      </p>
      <div class="waqf-steps">
        <div class="waqf-step">
          <p>
            <strong>Остановись</strong> — это
            <span class="arab">وقف اضطراري</span>.
            <span class="waqf-muted">(Даже если стоит знак لا)</span>
          </p>
        </div>
        <div class="waqf-step">
          <p>
            <strong>Возьми дыхание.</strong>
          </p>
        </div>
        <div class="waqf-step">
          <p>
            <strong>Вернись назад</strong> на несколько слов,
            если остановка нарушила смысловую или грамматическую конструкцию.
          </p>
        </div>
        <div class="waqf-step">
          <p>
            <strong>Начни с подходящего места</strong>, чтобы смысл
            оставался правильным.
          </p>
        </div>
      </div>
    </div>
  </section>
  <!-- =====================================================
       13. ПРАКТИЧЕСКИЙ АЛГОРИТМ
       ===================================================== -->
  <section class="waqf-section">
    <h2 class="waqf-section-title">
      <span>13.</span>
      Практический алгоритм чтения
    </h2>
    <div class="waqf-steps">
      <div class="waqf-step">
        <p>
          Посмотри на <strong>знак الوقف</strong> в мусхафе.
        </p>
      </div>
      <div class="waqf-step">
        <p>
          Определи, завершён ли смысл в данном месте.
        </p>
      </div>
      <div class="waqf-step">
        <p>
          Если останавливаешься, посмотри на последнюю букву слова.
        </p>
      </div>
      <div class="waqf-step">
        <p>
          Примени правило изменения окончания:
          сукун, замена танвина, ة → هْ и т. д.
        </p>
      </div>
      <div class="waqf-step">
        <p>
          Если используется специальный способ остановки,
          проверь возможность <span class="arab">الرَّوْم</span>
          или <span class="arab">الإشمام</span>.
        </p>
      </div>
      <div class="waqf-step">
        <p>
          После дыхания выбери правильное место для
          <span class="arab">الابتداء</span>.
        </p>
      </div>
    </div>
  </section>
  <!-- =====================================================
     14. ИТОГОВАЯ ШПАРГАЛКА
     ===================================================== -->
<section class="waqf-section">
  <h2 class="waqf-section-title">
    <span>14.</span>
    Краткая шпаргалка
  </h2>
  <div class="waqf-card">
    <div class="arab arab-xl" style="text-align:center;">
      تَامٌّ — كَافٍ — حَسَنٌ — قَبِيحٌ
    </div>
    <p style="text-align:center;">
      Четыре вида намеренной остановки
    </p>
  </div>
  <div class="waqf-card">
    <div class="arab arab-xl" style="text-align:center;">
      السُّكُونُ — الرَّوْمُ — الإِشْمَامُ
    </div>
    <p style="text-align:center;">
      Основные способы остановки
    </p>
  </div>
  <div class="waqf-table-wrap">
    <table class="waqf-table">
      <thead>
        <tr>
          <th>Что видим в конце слова</th>
          <th>Что делаем при وقف</th>
          <th>Пример</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="arab">ـَ</span>
            <br>
            Фатха
          </td>
          <td>
            Сукун <span class="arab">ـْ</span>
          </td>
          <td class="arab-cell">
            <span class="arab">نَعْبُدُ → نَعْبُدْ</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ـُ</span>
            <br>
            Дамма
          </td>
          <td>
            Сукун
          </td>
          <td class="arab-cell">
            <span class="arab">نَسْتَعِينُ → نَسْتَعِينْ</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ـِ</span>
            <br>
            Касра
          </td>
          <td>
            Сукун
          </td>
          <td class="arab-cell">
            <span class="arab">الرَّحِيمِ → الرَّحِيمْ</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ـٌ</span>
            <br>
            Танвин даммы
          </td>
          <td>
            Сукун
          </td>
          <td class="arab-cell">
            <span class="arab">عَلِيمٌ → عَلِيمْ</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ـٍ</span>
            <br>
            Танвин касры
          </td>
          <td>
            Сукун
          </td>
          <td class="arab-cell">
            <span class="arab">عَلِيمٍ → عَلِيمْ</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ـً</span>
            <br>
            Танвин фатхи
          </td>
          <td>
            Алиф + мадд 2 хараката
            <br>
            <span class="waqf-muted">(кроме случаев с ه и ء)</span>
          </td>
          <td class="arab-cell">
            <span class="arab">عَلِيمًا → عَلِيمَا</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ة</span>
            <br>
            Та марбута
          </td>
          <td>
            <span class="arab">هْ</span>
          </td>
          <td class="arab-cell">
            <span class="arab">رَحْمَةٌ → رَحْمَهْ</span>
          </td>
        </tr>
        <tr>
          <td>
            Шадда
          </td>
          <td>
            Шадда сохраняется + сукун
          </td>
          <td class="arab-cell">
            <span class="arab">وَتَبَّ → وَتَبّْ</span>
          </td>
        </tr>
        <!-- ===== ОСОБЫЕ СЛУЧАИ С БУКВАМИ МАДДА ===== -->
        <tr style="border-top: 2px solid var(--waqf-border);">
          <td colspan="3" style="text-align:center; font-weight:700; background: var(--waqf-accent-soft);">
            حروف المدّ — Буквы мадда
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ا</span>
            <br>
            <strong>Алиф</strong>
            <br>
            <span class="waqf-muted">(алиф мадд)</span>
          </td>
          <td>
            <strong>Сохраняется</strong> как мадд
            <br>
            Читается на <strong>2 хараката</strong>
          </td>
          <td class="arab-cell">
            <span class="arab">قَالَا → قَالَا</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">و</span>
            <br>
            <strong>Вав мадд</strong>
            <br>
            <span class="waqf-muted">(после даммы)</span>
          </td>
          <td>
            <strong>Сохраняется</strong> как мадд
            <br>
            Читается на <strong>2 хараката</strong>
          </td>
          <td class="arab-cell">
            <span class="arab">يَدْعُو → يَدْعُو</span>
            <br>
            <span class="arab">آمَنُوا → آمَنُوا</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ي</span>
            <br>
            <strong>Йа мадд</strong>
            <br>
            <span class="waqf-muted">(после касры)</span>
          </td>
          <td>
            <strong>Сохраняется</strong> как мадд
            <br>
            Читается на <strong>2 хараката</strong>
          </td>
          <td class="arab-cell">
            <span class="arab">الَّذِي → الَّذِي</span>
            <br>
            <span class="arab">فِي → فِي</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ى</span>
            <br>
            <strong>Алиф максура</strong>
            <br>
            <span class="waqf-muted">(йа сагира)</span>
          </td>
          <td>
            <strong>Сохраняется</strong> как мадд
            <br>
            Читается на <strong>2 хараката</strong>
            <br>
            <span class="waqf-muted">(произносится как алиф)</span>
          </td>
          <td class="arab-cell">
            <span class="arab">هُدَى → هُدَى</span>
            <br>
            <span class="arab">مُوسَى → مُوسَى</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">و</span>
            <br>
            <strong>Вав с сукуном</strong>
            <br>
            <span class="waqf-muted">(не мадд)</span>
          </td>
          <td>
            <strong>Сохраняется</strong> с сукуном
            <br>
            Не удлиняется
          </td>
          <td class="arab-cell">
            <span class="arab">يَوْمَ → يَوْمْ</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="arab">ي</span>
            <br>
            <strong>Йа с сукуном</strong>
            <br>
            <span class="waqf-muted">(не мадд)</span>
          </td>
          <td>
            <strong>Сохраняется</strong> с сукуном
            <br>
            Не удлиняется
          </td>
          <td class="arab-cell">
            <span class="arab">بَيْتِ → بَيْتْ</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
  <!-- =====================================================
       ИТОГ
       ===================================================== -->
  <section class="waqf-section">
    <div class="waqf-hero">
      <div class="waqf-hero-content">
        <div class="arab arab-xl" style="text-align:center;">
          وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
        </div>
        <p style="text-align:center; margin-bottom:0;">
          Чтение Корана с правильной остановкой и правильным началом —
          важная часть сохранения смысла и правильного таджвида.
        </p>
        <p style="text-align:center; margin-top: 1rem; font-size: 0.85rem; color: var(--waqf-muted);">
          Основные правила взяты из книг по таджвиду:
          «Тухфат аль-атфаль», «Аль-Мукаддима аль-Джазарийя»
        </p>
      </div>
    </div>
  </section>
</div>
<script>
  (function() {
    const page = document.getElementById('waqfPage');
    const toggleBtn = document.getElementById('themeToggle');
    const iconSpan = toggleBtn.querySelector('.icon');
    const labelSpan = toggleBtn.querySelector('.label');
    // Проверяем сохранённую тему
    const savedTheme = localStorage.getItem('waqfTheme');
    if (savedTheme === 'dark') {
      page.classList.add('dark');
      iconSpan.textContent = '☀️';
      labelSpan.textContent = 'Светлая';
    }
    toggleBtn.addEventListener('click', function() {
      page.classList.toggle('dark');
      const isDark = page.classList.contains('dark');
      localStorage.setItem('waqfTheme', isDark ? 'dark' : 'light');
      if (isDark) {
        iconSpan.textContent = '☀️';
        labelSpan.textContent = 'Светлая';
      } else {
        iconSpan.textContent = '🌙';
        labelSpan.textContent = 'Тёмная';
      }
    });
    // Адаптация для мобильных устройств
    if (window.innerWidth <= 600) {
      toggleBtn.style.fontSize = '0.75rem';
      toggleBtn.style.padding = '0.3rem 0.6rem';
    }
  })();
</script>