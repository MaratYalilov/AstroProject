import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReaderAyah } from '../../lib/hadith/quranReader';

export function useQuranAudio() {
  const player = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef('');
  const request = useRef(0);
  const [active, setActive] = useState('');
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const stop = useCallback(() => {
    request.current++;
    player.current?.pause();
    activeRef.current = ''; setActive(''); setPlaying(false); setLoading(false); setError('');
  }, []);
  useEffect(() => () => {
    request.current++;
    if (player.current) {
      player.current.onplaying = player.current.onpause = player.current.onended = player.current.onerror = null;
      player.current.pause(); player.current.removeAttribute('src'); player.current.load();
    }
  }, []);
  const toggle = useCallback((ayah: ReaderAyah) => {
    if (!player.current) {
      const audio = new Audio(); audio.preload = 'none';
      audio.onplaying = () => { setPlaying(true); setLoading(false); };
      audio.onpause = () => { setPlaying(false); setLoading(false); };
      audio.onended = () => { setPlaying(false); setLoading(false); };
      audio.onerror = () => { setPlaying(false); setLoading(false); setError('Не удалось загрузить аудио. Нажмите кнопку, чтобы повторить.'); };
      player.current = audio;
    }
    const audio = player.current;
    const token = ++request.current;
    if (activeRef.current === ayah.id && (!audio.paused || loading)) { audio.pause(); setLoading(false); return; }
    if (activeRef.current !== ayah.id) { audio.pause(); audio.src = ayah.audioSrc; }
    else if (audio.error) audio.load();
    activeRef.current = ayah.id; setActive(ayah.id); setError(''); setLoading(true);
    void audio.play().catch(() => {
      if (token !== request.current) return;
      setPlaying(false); setLoading(false); setError('Не удалось воспроизвести аудио. Нажмите кнопку, чтобы повторить.');
    });
  }, [loading]);
  return { state: { active, playing, loading, error, toggle }, stop };
}
