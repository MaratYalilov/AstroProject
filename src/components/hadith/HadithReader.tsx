import React, { useEffect, useRef, useState } from 'react';
import { Library, BookOpen, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, Search, ArrowUp, ArrowDown, X, LoaderCircle, Settings } from 'lucide-react';
import type { ReaderCatalog, ReaderView, ReaderRecord, SearchResults, SearchGroup } from '../../lib/hadith/reader';
import { arabicGrade, gradingInfo, searchGradeOptions, gradeLabel, collectionMembership } from '../../lib/hadith/grading';
import { searchRanges } from '../../lib/hadith/searchText';
import { referenceUrl } from '../../lib/hadith/references';
import { collectionSymbols } from '../../lib/hadith/symbols';
import CollectionBookIcon from './CollectionBookIcon';
import QuranAyah from './QuranAyah';
import QuranTopicsIntro from './QuranTopicsIntro';
import { useQuranAudio } from './useQuranAudio';

type Chapter = { id: string; book_id: number; title_ru: string; title_ar: string; count: number; href: string };
const clean = (value: string) => value.replace(/[\u2013\u2014]/g, '-');
const base = '/hadith-sbornik';
async function api<T>(params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/hadith-reader.json?${new URLSearchParams(params)}`, { signal });
  if (!response.ok) throw new Error(response.status === 404 ? 'Раздел не найден.' : 'Не удалось загрузить данные. Повторите попытку.');
  return response.json();
}
function ordinaryClick(event: React.MouseEvent) { return !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0; }
function Highlight({ value, query }: { value: string; query: string }) {
  const parts: React.ReactNode[] = [];
  let offset = 0;
  for (const [start, end] of searchRanges(value, query)) {
    parts.push(value.slice(offset, start), <mark key={start}>{value.slice(start, end)}</mark>);
    offset = end;
  }
  parts.push(value.slice(offset));
  return <>{parts}</>;
}
function Hadith({ record, collectionTitle, collectionId, showArabic }: { record: ReaderRecord; collectionTitle: string; collectionId: string; showArabic: boolean }) {
  const { ru, ar } = gradingInfo(record.grading);
  const membership = collectionMembership(collectionId, record.book_id);
  return <article id={`hadith-${record.id}`} className="reader-hadith">
    <a href={record.href} className="reader-reference">{collectionTitle} · № {record.hadith_numbers.join(', ')}</a>
    {showArabic && <div className="arab reader-arabic" lang="ar" dir="rtl">{record.arabic.parts.map((part, i) => <span key={i} className={part.kind === 'isnad' ? 'reader-isnad' : undefined}>{clean(part.text)}{' '}</span>)}</div>}
    <h3 className="reader-label">Перевод</h3>
    <p className="reader-translation">{clean(record.russian.full_text)}</p>
    {!!record.russian.explanations?.length && <section className="reader-notes" aria-label="Примечания">
      <h3 className="reader-label">Примечания</h3>
      {record.russian.explanations.map((note, i) => <div key={i} className="reader-note">
        {note.title && <h4>{clean(note.title)}</h4>}
        <p>{clean(note.text)}</p>
        {note.references?.map(referenceUrl).filter(Boolean).map((url, j) => <a href={url} key={j} target={url.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer">Источник {j + 1}</a>)}
      </div>)}
    </section>}
    {!!(ru.length || ar.length) && <section className="reader-notes reader-grading-inline" aria-label="Оценка достоверности">
      <h3 className="reader-label">Оценка достоверности</h3>
      {ru.map(value => <p className="reader-grade" key={value}>{value}</p>)}
      {showArabic && ar.map(value => <p className="arab reader-grade-ar" data-grade={arabicGrade(value)} title={gradeLabel(arabicGrade(value))} lang="ar" dir="rtl" key={value}>{value}</p>)}
    </section>}
    {membership && <section className="reader-notes reader-grading-inline" aria-label="Оценка достоверности">
      <h3 className="reader-label">Оценка достоверности</h3>
      <p className="reader-grade" title="Принадлежность к сборнику, а не отдельная оценка достоверности записи.">{membership}</p>
    </section>}
  </article>;
}

export default function HadithReader({ catalog, initialView }: { catalog: ReaderCatalog; initialView: ReaderView }) {
  const [view, setView] = useState(initialView);
  const [sidebar, setSidebar] = useState(true);
  const [expanded, setExpanded] = useState(initialView.collection ?? '');
  const [openBook, setOpenBook] = useState<number | undefined>(initialView.book);
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({});
  const [chapterLoading, setChapterLoading] = useState('');
  const [chapterError, setChapterError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [currentOnly, setCurrentOnly] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultsOpen, setResultsOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [gradeFilter, setGradeFilter] = useState('');
  const [searchGroup, setSearchGroup] = useState<SearchGroup>('all');
  const [showDown, setShowDown] = useState(false);
  const [headingAbove, setHeadingAbove] = useState(false);
  const [translationSize, setTranslationSize] = useState(16);
  const [arabicSize, setArabicSize] = useState(24);
  const [showArabic, setShowArabic] = useState(true);
  const [alwaysTafsir, setAlwaysTafsir] = useState(false);
  const [temporaryArabicTarget, setTemporaryArabicTarget] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const chapterHeading = useRef<HTMLHeadingElement>(null);
  const treeScroller = useRef<HTMLElement>(null);
  const settingsPanel = useRef<HTMLDetailsElement>(null);
  const resultsScroller = useRef<HTMLElement>(null);
  const navRequest = useRef<AbortController | null>(null);
  const selectedCollection = catalog.find(c => c.id === view.collection);
  const hasChapter = !!view.chapter;
  const showRight = hasChapter && !!submitted && resultsOpen;
  const isQuran = view.collection === 'quran' || view.collection === 'quran-topics';
  const quranAudio = useQuranAudio();
  useEffect(() => { quranAudio.stop(); }, [view, quranAudio.stop]);

  useEffect(() => {
    const collapseSettings = (event: Event) => {
      const panel = settingsPanel.current;
      if (panel?.open && event.target instanceof Node && !panel.contains(event.target)) panel.open = false;
    };
    document.addEventListener('pointerdown', collapseSettings, true);
    document.addEventListener('focusin', collapseSettings);
    return () => {
      document.removeEventListener('pointerdown', collapseSettings, true);
      document.removeEventListener('focusin', collapseSettings);
    };
  }, []);

  async function navigate(path: string, push = true, revealArabic = false) {
    navRequest.current?.abort();
    const controller = new AbortController(); navRequest.current = controller;
    setLoading(true); setError('');
    try {
      const next = await api<ReaderView>({ action: 'read', path }, controller.signal);
      if (next.collection === 'quran' || next.collection === 'quran-topics') setGradeFilter('');
      setTemporaryArabicTarget(revealArabic ? next.target ?? '' : '');
      setView(next); setExpanded(next.collection ?? ''); setOpenBook(next.book);
      if (push) window.history.pushState({}, '', path);
      if (window.matchMedia('(max-width: 800px)').matches && next.chapter) setSidebar(false);
    } catch (err) { if (!controller.signal.aborted) setError((err as Error).message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function follow(event: React.MouseEvent<HTMLAnchorElement>, path: string, revealArabic = false) {
    if (!ordinaryClick(event)) return;
    event.preventDefault(); void navigate(path, true, revealArabic);
  }
  function jumpToAyah(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (!ordinaryClick(event)) return;
    const container = scroller.current;
    const target = document.getElementById(`quran-ayah-${id}`);
    if (!container || !target || !container.contains(target)) return;
    event.preventDefault();
    // Native fragment navigation fires popstate and reloads the chapter through our router.
    // Scroll this pane directly and update the fragment without another navigation.
    window.history.replaceState(window.history.state, '', `#quran-ayah-${id}`);
    const inset = parseFloat(window.getComputedStyle(container).scrollPaddingTop) || 0;
    container.scrollTo({ top: container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top - inset, behavior: 'instant' });
    checkDown();
  }
  useEffect(() => {
    const pop = () => { void navigate(window.location.pathname, false); };
    window.addEventListener('popstate', pop);
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setQuery(q); setSubmitted(q); }
    return () => { window.removeEventListener('popstate', pop); navRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!expanded || expanded === 'quran' || openBook === undefined) return;
    const key = `${expanded}/${openBook}`;
    if (chapters[key]) return;
    const controller = new AbortController();
    setChapterLoading(key); setChapterError('');
    api<Chapter[]>({ action: 'chapters', collection: expanded, book: String(openBook) }, controller.signal)
      .then(data => setChapters(prev => ({ ...prev, [key]: data })))
      .catch(err => { if (!controller.signal.aborted) setChapterError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setChapterLoading(''); });
    return () => controller.abort();
  }, [expanded, openBook, chapters]);
  useEffect(() => {
    const tree = treeScroller.current;
    const collectionRow = tree?.querySelector<HTMLElement>('.reader-collection-row[aria-expanded="true"]');
    if (!tree || !collectionRow) return;
    const updateOffset = () => tree.style.setProperty('--reader-collection-height', `${collectionRow.getBoundingClientRect().height}px`);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(collectionRow);
    return () => observer.disconnect();
  }, [sidebar, expanded]);
  useEffect(() => {
    if (!sidebar || expanded !== view.collection || openBook !== view.book || !view.chapter) return;
    const tree = treeScroller.current;
    const active = tree?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!tree || !active) return;
    const positionChapter = () => {
      // Leave enough trailing room to position even the final chapter near the upper third.
      tree.style.setProperty('--reader-tree-tail', `${Math.ceil(tree.clientHeight * 2 / 3)}px`);
      const offset = active.getBoundingClientRect().top - tree.getBoundingClientRect().top;
      tree.scrollTop = Math.max(0, tree.scrollTop + offset - tree.clientHeight / 3);
    };
    const frame = requestAnimationFrame(positionChapter);
    window.addEventListener('resize', positionChapter);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', positionChapter); };
  }, [sidebar, expanded, openBook, chapters, view.collection, view.book, view.chapter, view.target]);
  useEffect(() => {
    if (!submitted) return;
    const controller = new AbortController();
    setSearching(true); setSearchError('');
    api<SearchResults>({ action: 'search', q: submitted, scope: currentOnly ? view.collection ?? '' : '', page: String(page), grade: gradeFilter, group: searchGroup }, controller.signal)
      .then(setResults)
      .catch(err => { if (!controller.signal.aborted) setSearchError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    return () => controller.abort();
  }, [submitted, currentOnly, view.collection, page, searchAttempt, gradeFilter, searchGroup]);
  useEffect(() => {
    if (resultsScroller.current) resultsScroller.current.scrollTop = 0;
    if (!hasChapter && scroller.current) scroller.current.scrollTop = 0;
  }, [submitted, currentOnly, page, searchAttempt, gradeFilter, searchGroup]);
  function checkDown() {
    const el = scroller.current;
    setShowDown(!!el && el.scrollHeight - el.clientHeight - el.scrollTop > 80);
  }
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = 0;
    if (view.target) document.getElementById(`${isQuran ? 'quran-ayah' : 'hadith'}-${view.target}`)?.scrollIntoView({ block: 'start' });
    checkDown();
  }, [view]);
  useEffect(() => {
    const observer = new ResizeObserver(checkDown);
    if (content.current) observer.observe(content.current);
    if (scroller.current) observer.observe(scroller.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setHeadingAbove(false);
    const root = scroller.current;
    const heading = chapterHeading.current;
    if (!root || !heading || !hasChapter) return;
    const observer = new IntersectionObserver(([entry]) => {
      setHeadingAbove(entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? root.getBoundingClientRect().top));
    }, { root, threshold: [0, 1] });
    observer.observe(heading);
    return () => observer.disconnect();
  }, [view, hasChapter]);
  useEffect(checkDown, [results, sidebar, resultsOpen]);
  useEffect(() => {
    document.title = `${view.title} | Библиотека | HUTBA`;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = new URL(view.canonicalPath ?? window.location.pathname, canonical.href).href;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (view.noindex || new URLSearchParams(window.location.search).has('q')) {
      if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
      robots.content = 'noindex,follow';
    } else robots?.remove();
  }, [view]);
  function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setPage(1); setSubmitted(query.trim()); setResultsOpen(true); setGradeFilter(''); setSearchGroup('all');
    setSearchAttempt(value => value + 1);
  }
  function renderResults() {
    return <>
      <div className="reader-results-heading">
        <div><h2>Результаты поиска</h2><p>{submitted}</p></div>
        {hasChapter && <button className="reader-icon" aria-label="Закрыть результаты поиска" onClick={() => setResultsOpen(false)}><X size={18} /></button>}
      </div>
      {!(currentOnly && isQuran) && <label className="reader-grade-filter">
        <span>Достоверность хадисов</span>
        <select value={gradeFilter} onChange={event => { setGradeFilter(event.target.value); setPage(1); }}>
          <option value="">Все оценки</option>
          {searchGradeOptions.map(option => <option key={option.id} value={option.id}>{option.label}{results && !searching ? ` (${results.gradeCounts[option.id] ?? 0})` : ''}</option>)}
        </select>
        <small>Фильтр применяется к хадисам. «Из двух Сахихов» - по принадлежности к сборнику; оговорки сохранены в тексте.</small>
      </label>}
      {searching ? <p className="reader-status" role="status"><LoaderCircle className="reader-spin" size={16} /> Поиск…</p> : searchError ? <p role="alert" className="reader-status">{searchError}</p> : results && <>
        <div className="reader-search-groups" role="group" aria-label="Группы результатов">
          {([['all', 'Аяты и хадисы'], ['topic', 'Темы'], ['ayah', 'Аяты'], ['hadith', 'Хадисы']] as const).map(([id, title]) => <button key={id} aria-pressed={searchGroup === id} onClick={() => { setSearchGroup(id); setPage(1); }}>{title}{id !== 'all' ? ` (${results.counts[id]})` : ''}</button>)}
        </div>
        <p className="reader-status" role="status">Найдено в выбранной группе: {results.total}</p>
        {(searchGroup === 'all' || searchGroup === 'topic') && results.topics.length > 0 && <section className="reader-topic-results" aria-label="Найденные темы">
          <h3>Темы и описания указателя</h3>
          {results.topics.map(topic => <a className="reader-hit" href={topic.href} key={topic.id}>
            <span className="reader-hit-reference">{topic.title} · аятов: {topic.verseCount}</span>
            <p><Highlight value={topic.description} query={submitted} /></p>
            {topic.matched_field === 'alias' && <small>По поисковому варианту формулировки</small>}
            {!!topic.via_topic_ids.length && <small>По перекрёстной ссылке указателя</small>}
          </a>)}
          {searchGroup === 'all' && results.counts.topic > results.topics.length && <button onClick={() => { setSearchGroup('topic'); setPage(1); }}>Все темы ({results.counts.topic})</button>}
        </section>}
        {!results.total && <p className="reader-status">Попробуйте другое слово или номер аята либо хадиса.</p>}
        <div className="reader-hits">{results.hits.map(hit => <article className="reader-hit" key={`${hit.collection}:${hit.id}`}>
          <a href={hit.href} onClick={event => follow(event, hit.href, hit.language === 'ar')}>
          <span className="reader-hit-reference">{hit.collectionTitle} · {hit.kind === 'ayah' ? '' : '№ '}{hit.numbers}</span>
          {hit.membership && <span className="reader-membership">{hit.membership}</span>}
          {hit.grade && hit.grade !== 'ungraded' && <span className="reader-hit-grade" data-grade={hit.grade}>{gradeLabel(hit.grade)}</span>}
          <p className={hit.language === 'ar' ? 'arab reader-hit-arabic' : undefined} lang={hit.language} dir={hit.language === 'ar' ? 'rtl' : undefined}><Highlight value={hit.snippet} query={submitted} /></p>
          </a>
          {hit.kind === 'ayah' && <small className="reader-match-label">{hit.matched_field === 'address' ? 'Точный адрес аята' : hit.matched_field === 'translation' ? 'Совпадение в переводе' : hit.matched_field === 'arabic' ? 'Совпадение в арабском тексте' : 'По тематическому указателю'}</small>}
          {hit.reasons?.map(reason => <div className="reader-topic-reason" key={reason.item_id}>
            <a href={reason.href}><strong>{reason.title}: {reason.description}</strong></a>
            <p>{reason.explanation}</p>
            <small>{reason.basis_label}</small>
            {reason.key_phrase.text && <p>Ключевая цитата: «{clean(reason.key_phrase.text)}»</p>}
            {reason.qualification && <p>Оговорка: {reason.qualification}</p>}
            {reason.usage_note && <p>{reason.usage_note}</p>}
            {!!reason.context_verse_keys?.length && <p>Контекст: {reason.context_verse_keys.join(', ')}</p>}
            <small>Основание: {reason.sources.map(source => source.title).join('; ')}</small>
          </div>)}
          {!!hit.reasonCount && hit.reasonCount > (hit.reasons?.length ?? 0) && <small>Связей в указателе: {hit.reasonCount}. Остальные доступны при чтении аята.</small>}
        </article>)}</div>
        {results.total > 30 && <nav className="reader-pagination" aria-label="Страницы поиска">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Назад</button>
          <span>{page} / {Math.ceil(results.total / 30)}</span>
          <button disabled={page * 30 >= results.total} onClick={() => setPage(p => p + 1)}>Далее</button>
        </nav>}
      </>}
    </>;
  }
  return <div className={`hadith-reader ${sidebar ? 'with-sidebar' : ''} ${showRight ? 'with-results' : ''}`} style={{ '--reader-translation-size': `${translationSize}px`, '--reader-arabic-size': `${arabicSize}px` } as React.CSSProperties}>
    {sidebar && <aside className="reader-sidebar" aria-label="Оглавление библиотеки">
      <div className="reader-sidebar-top"><a href={base} onClick={e => follow(e, base)}><Library size={21} /><span>Библиотека</span></a><button className="reader-icon" aria-label="Скрыть оглавление" onClick={() => setSidebar(false)}><PanelLeftClose size={19} /></button></div>
      <nav className="reader-tree" ref={treeScroller}>
        {catalog.map(c => <div key={c.id} className="reader-collection">
          <button className="reader-tree-row reader-collection-row" aria-expanded={expanded === c.id} onClick={() => {
            if (expanded === c.id) { setExpanded(''); setOpenBook(undefined); }
            else { void navigate(c.href); }
          }}>{expanded === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}{(c.id === 'quran' || c.id === 'quran-topics') && <BookOpen className="reader-quran-icon" size={21} aria-hidden="true" />}{collectionSymbols[c.id] && <span className="reader-collection-symbol" aria-hidden="true" title={`Обозначение сборника: ${collectionSymbols[c.id]}`}><CollectionBookIcon symbol={collectionSymbols[c.id]} /></span>}<span>{c.title}</span></button>
          {expanded === c.id && <div className="reader-books">{c.books.map(book => {
            const key = `${c.id}/${book.id}`;
            const isOpen = openBook === book.id;
            return <div className="reader-book" key={book.id}>
              <button className={`reader-tree-row reader-book-row ${c.id === 'quran' && view.collection === 'quran' && view.book === book.id ? 'is-selected' : ''}`} aria-current={c.id === 'quran' && view.collection === 'quran' && view.book === book.id ? 'page' : undefined} aria-expanded={c.id === 'quran' ? undefined : isOpen} onClick={() => {
                if (c.id === 'quran') { void navigate(book.href); return; }
                if (isOpen) setOpenBook(undefined);
                else { void navigate(book.href); }
              }}>{c.id !== 'quran' && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}<span>{clean(book.title_ru)}</span>{c.id === 'quran' && <small className="reader-surah-count">{book.count}</small>}</button>
              {isOpen && c.id !== 'quran' && <div className="reader-chapters">
                {chapterLoading === key && <p className="reader-tree-status" role="status">Загрузка глав…</p>}
                {chapterError && <p className="reader-tree-status" role="alert">{chapterError} <button onClick={() => { setOpenBook(undefined); }}>Закрыть</button></p>}
                {chapters[key]?.map(chapter => { const href = chapter.href; return <a key={chapter.id} href={href} onClick={e => follow(e, href)} className={`reader-chapter-row ${view.collection === c.id && view.chapter === chapter.id ? 'is-selected' : ''}`} aria-current={view.collection === c.id && view.chapter === chapter.id ? 'page' : undefined}>
                  <span>{clean(chapter.title_ru || chapter.title_ar)}</span><small>{chapter.count}</small>
                </a>; })}
              </div>}
            </div>;
          })}</div>}
        </div>)}
      </nav>
      <details className="reader-settings" ref={settingsPanel}>
        <summary><Settings size={19} aria-hidden="true" /><span>Настройки</span><ChevronDown size={15} className="reader-settings-chevron" aria-hidden="true" /></summary>
        <div className="reader-settings-content">
          <label htmlFor="reader-show-arabic" className="reader-settings-toggle"><span>Показывать арабский текст</span><input id="reader-show-arabic" type="checkbox" role="switch" checked={showArabic} onChange={event => { setShowArabic(event.target.checked); setTemporaryArabicTarget(''); }} /></label>
          <label htmlFor="reader-always-tafsir" className="reader-settings-toggle"><span>Всегда показывать тафсир Саади</span><input id="reader-always-tafsir" type="checkbox" role="switch" checked={alwaysTafsir} onChange={event => setAlwaysTafsir(event.target.checked)} /></label>
          <label htmlFor="reader-translation-size">Размер перевода <span>{translationSize} px</span></label>
          <input id="reader-translation-size" type="range" min="12" max="24" value={translationSize} onChange={event => setTranslationSize(Number(event.target.value))} />
          <label htmlFor="reader-arabic-size">Размер арабского текста <span>{arabicSize} px</span></label>
          <input id="reader-arabic-size" type="range" min="20" max="40" value={arabicSize} onChange={event => setArabicSize(Number(event.target.value))} />
          <button type="button" onClick={() => { setTranslationSize(16); setArabicSize(24); }}>Сбросить размеры</button>
        </div>
      </details>
    </aside>}
    <section className="reader-main" aria-label={isQuran ? 'Чтение Корана' : 'Чтение хадисов'}>
      <div className="reader-toolbar">
        {!sidebar && <button className="reader-icon" aria-label="Показать оглавление" onClick={() => setSidebar(true)}><PanelLeftOpen size={19} /></button>}
        <div className="reader-toolbar-breadcrumbs">
          <span className="reader-toolbar-book">{selectedCollection?.title ?? 'Библиотека'}</span>
          {hasChapter && headingAbove && <><ChevronRight size={14} aria-hidden="true" /><span className="reader-toolbar-chapter" title={clean(view.title)}>{clean(view.title)}</span></>}
        </div>
        {hasChapter && submitted && !resultsOpen && <button className="reader-toolbar-search" onClick={() => setResultsOpen(true)}><Search size={16} /> Результаты</button>}
      </div>
      <div className="reader-scroll" ref={scroller} onScroll={checkDown} tabIndex={0} aria-label={hasChapter ? view.title : 'Результаты поиска'}>
        <div className={`reader-content${isQuran ? ' reader-content-quran' : ''}`} ref={content}>
          {loading && <p className="reader-status" role="status"><LoaderCircle className="reader-spin" size={16} /> Загрузка…</p>}
          {error && <p className="reader-status" role="alert">{error}</p>}
          {view.collection === 'quran-topics' && !view.book && !submitted && <QuranTopicsIntro />}
          {!hasChapter && view.collection === 'quran-topics' && view.book && !submitted && <header className="reader-chapter-heading"><h1>{view.title}</h1>{view.topicNote && <p className="reader-source">{clean(view.topicNote)}</p>}{view.topicLinks?.map(link => <p key={link.href}><a href={link.href} onClick={event => follow(event, link.href)}>См. {link.title}</a></p>)}</header>}
          {hasChapter && isQuran ? <>
            <header className="reader-chapter-heading">{view.topicTitle && <p className="reader-source">{view.topicTitle}</p>}<h1 ref={chapterHeading}>{view.title}</h1>{showArabic && view.arabic && <p className="arab" lang="ar" dir="rtl">{view.arabic}</p>}<p className="reader-source">Аятов: {view.ayahs?.length ?? 0}</p>{view.collection === 'quran-topics' && <div className="reader-topic-ayah-links">{view.ayahs?.map(ayah => 'thematic' in ayah && <a key={ayah.id} href={`#quran-ayah-${ayah.id}`} onClick={event => jumpToAyah(event, ayah.id)}>{ayah.thematic.referenceLabel}</a>)}</div>}</header>
            {showArabic && view.basmalaHtml && <div className="qcf-ayah reader-quran-arabic reader-basmala" lang="ar" dir="rtl" dangerouslySetInnerHTML={{ __html: view.basmalaHtml }} />}
            {view.ayahs?.map(ayah => <QuranAyah key={ayah.id} ayah={ayah} showArabic={showArabic || temporaryArabicTarget === ayah.id} alwaysTafsir={alwaysTafsir} audio={quranAudio.state} />)}
          </> : hasChapter ? <>
            <header className="reader-chapter-heading"><h1 ref={chapterHeading}>{view.title}</h1>{showArabic && view.arabic && <p className="arab" lang="ar" dir="rtl">{clean(view.arabic)}</p>}<p className="reader-source">Хадисов: {view.records.length}</p></header>
            {view.records.map(record => <Hadith key={record.id} record={record} collectionTitle={selectedCollection?.title ?? ''} collectionId={view.collection ?? ''} showArabic={showArabic || temporaryArabicTarget === record.id} />)}
            {!view.records.length && <p className="reader-status">В этой главе пока нет хадисов.</p>}
          </> : submitted ? renderResults() : null}
        </div>
      </div>
      <div className="reader-composer-area">
        {showDown && <button className="reader-down" aria-label="Прокрутить вниз" onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><ArrowDown size={20} /></button>}
        <form className="reader-composer" onSubmit={search} role="search">
          <label htmlFor="library-search" className="reader-sr-only">Поиск аятов и хадисов</label>
          <div className="reader-input-row"><Search size={19} aria-hidden="true" /><input id="library-search" type="search" value={query} maxLength={200} onChange={e => setQuery(e.target.value)} placeholder="Найти аят или хадис, например 2:255" autoComplete="off" /><button type="submit" disabled={!query.trim() || searching} aria-label="Найти в библиотеке">{searching ? <LoaderCircle className="reader-spin" size={19} /> : <ArrowUp size={20} />}</button></div>
          <div className="reader-scope" role="group" aria-label="Область поиска">
            <button type="button" aria-pressed={!currentOnly} onClick={() => { setCurrentOnly(false); setPage(1); }}>Вся библиотека</button>
            {view.collection && <button type="button" aria-pressed={currentOnly} onClick={() => { setCurrentOnly(true); setPage(1); if (isQuran) setGradeFilter(''); }}>{selectedCollection?.title}</button>}
          </div>
        </form>
      </div>
    </section>
    {showRight && <aside className="reader-results" ref={resultsScroller} aria-label="Результаты поиска">{renderResults()}</aside>}
  </div>;
}
