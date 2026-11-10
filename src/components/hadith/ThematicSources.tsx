import { useEffect, useId, useState } from 'react';
import type { ThematicAyah } from '../../lib/hadith/quranTopicsReader';

type Tafsir = { title: string; paragraphs: string[] };
const clean = (value: string) => value.replace(/[\u2013\u2014]/g, '-');
export default function ThematicSources({ sources }: { sources: ThematicAyah['thematic']['sources'] }) {
  const [opened, setOpened] = useState('');
  const [texts, setTexts] = useState<Record<string, Tafsir>>({});
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const panelId = useId();
  useEffect(() => {
    setError('');
    if (!opened || texts[opened]) return;
    const controller = new AbortController();
    fetch(`/api/quran-tafsir.json?${new URLSearchParams({ source: opened })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Не удалось загрузить толкование.');
        return response.json() as Promise<Tafsir>;
      })
      .then(text => setTexts(previous => ({ ...previous, [opened]: text })))
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [opened, texts, retry]);
  const text = texts[opened];
  return <>
    <div className="reader-thematic-sources">Основание: {sources.map((source, index) => <span key={source.id}>{index > 0 && '; '}{source.inlineTafsir
      ? <button type="button" className="reader-tafsir-source" aria-expanded={opened === source.id} aria-controls={panelId} onClick={() => setOpened(previous => previous === source.id ? '' : source.id)}>{source.title}</button>
      : source.href ? <a href={source.href} target={source.href.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer">{source.title}</a> : source.title}</span>)}</div>
    {opened && <section id={panelId} className="reader-inline-tafsir" aria-label={sources.find(source => source.id === opened)?.title}>
      <div className="reader-inline-tafsir-heading"><span>{text ? clean(text.title) : sources.find(source => source.id === opened)?.title}</span><button type="button" onClick={() => setOpened('')}>Свернуть</button></div>
      {text ? <div lang="ar" dir="rtl" className="arab reader-inline-tafsir-text">{text.paragraphs.map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}</div>
        : error ? <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Повторить</button></p>
        : <p role="status">Загрузка толкования...</p>}
    </section>}
  </>;
}
