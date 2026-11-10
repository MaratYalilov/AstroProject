import { useEffect, useId, useState } from 'react';
import { Play, Pause, LoaderCircle, BookOpen, Copy, Check } from 'lucide-react';
import type { ReaderAyah } from '../../lib/hadith/quranReader';

export interface QuranAudioState { active: string; playing: boolean; loading: boolean; error: string; toggle: (ayah: ReaderAyah) => void }
const clean = (value: string) => value.replace(/[\u2013\u2014]/g, '-');

export default function QuranAyah({ ayah, showArabic, alwaysTafsir, audio }: { ayah: ReaderAyah; showArabic: boolean; alwaysTafsir: boolean; audio: QuranAudioState }) {
  const [open, setOpen] = useState(alwaysTafsir);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const tafsirId = useId();
  useEffect(() => setOpen(alwaysTafsir), [alwaysTafsir]);
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(() => setCopyState('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);
  const active = audio.active === ayah.id;
  const playLabel = `${active && audio.playing ? 'Приостановить' : 'Прослушать'} аят`;
  const copyLabel = copyState === 'copied' ? 'Аят скопирован' : copyState === 'error' ? 'Не удалось скопировать. Повторить' : 'Копировать аят и перевод';
  async function copyAyah() {
    try {
      await navigator.clipboard.writeText(`${ayah.arabic}\n\n${ayah.translation}`);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }
  return <article className="reader-hadith reader-ayah" id={`quran-ayah-${ayah.id}`}>
    {showArabic && <div className="qcf-ayah reader-quran-arabic" lang="ar" dir="rtl" dangerouslySetInnerHTML={{ __html: ayah.arabicHtml }} />}
    <p className="reader-translation"><span className="reader-ayah-number">{ayah.ayah}.</span>{' '}{clean(ayah.translation)}</p>
    <div className="reader-ayah-actions">
      <button type="button" className="reader-ayah-action" title="Тафсир Саади" aria-label="Тафсир Саади" aria-expanded={open} aria-controls={tafsirId} onClick={() => setOpen(value => !value)}><BookOpen size={17} aria-hidden="true" /></button>
      <button type="button" className="reader-ayah-action" title={playLabel} aria-label={`${playLabel} ${ayah.surah}:${ayah.ayah}`} onClick={() => audio.toggle(ayah)}>
        {active && audio.loading ? <LoaderCircle className="reader-spin" size={17} aria-hidden="true" /> : active && audio.playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
      </button>
      <button type="button" className="reader-ayah-action" title={copyLabel} aria-label={copyLabel} onClick={copyAyah}>{copyState === 'copied' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}</button>
      <span className="sr-only" role="status">{copyState === 'copied' ? 'Аят скопирован' : copyState === 'error' ? 'Не удалось скопировать аят' : ''}</span>
    </div>
    {active && audio.error && <p className="reader-audio-error" role="alert">{audio.error}</p>}
    {!!ayah.relatedTopics?.total && <details className="reader-related-topics">
      <summary>Связанные темы ({ayah.relatedTopics.total})</summary>
      {ayah.relatedTopics.items.map(topic => <p key={topic.item_id}><a href={topic.href}>{topic.title}: {topic.description}</a></p>)}
      <a href={`/quran/index?q=${ayah.surah}:${ayah.ayah}`}>Все связи аята в указателе</a>
    </details>}
    {open && <section id={tafsirId} className="reader-tafsir" aria-label={`Тафсир Саади к аяту ${ayah.surah}:${ayah.ayah}`}>
      {ayah.tafsir ? clean(ayah.tafsir).split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>) : <p className="reader-source">В локальной базе нет отдельного русского толкования этого аята.</p>}
    </section>}
  </article>;
}
