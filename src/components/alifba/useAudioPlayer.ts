import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";

export type PlaybackStatus = "idle" | "playing" | "paused" | "completed";

export type AudioItem = {
  audio: string;
};

type UseAudioPlayerOptions = {
  items: AudioItem[];
  sequenceGapMs?: number;
  rate?: number;
};

export function useAudioPlayer({
  items,
  sequenceGapMs = 2000,
  rate = 1,
}: UseAudioPlayerOptions) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const howlsRef = useRef<Record<string, Howl>>({});
  const playlistTokenRef = useRef(0);
  const currentHowlIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // preload: false — см. ReadingExercises: массовая преподгрузка
    // html5-audio вызывает переинициализацию аудиоустройств Windows.
    items.forEach((item) => {
      if (!howlsRef.current[item.audio]) {
        howlsRef.current[item.audio] = new Howl({
          src: [item.audio],
          preload: false,
          html5: true,
        });
      }
    });

    return () => {
      Object.values(howlsRef.current).forEach((howl) => howl.unload());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.audio).join(",")]);

  useEffect(() => {
    Object.values(howlsRef.current).forEach((howl) => {
      howl.rate(rate);
    });
  }, [rate]);

  const stopAll = ({ markCompleted = false } = {}) => {
    playlistTokenRef.current += 1;
    Object.values(howlsRef.current).forEach((howl) => howl.stop());
    currentHowlIdRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveIndex(null);
    setStatus(markCompleted ? "completed" : "idle");
  };

  const getHowl = (audio: string) => {
    if (!howlsRef.current[audio]) {
      howlsRef.current[audio] = new Howl({
        src: [audio],
        preload: true,
        html5: true,
        rate,
      });
    }
    return howlsRef.current[audio];
  };

  const playAt = (
    index: number,
    token = playlistTokenRef.current,
    { playlist = false }: { playlist?: boolean } = {},
  ) => {
    const item = items[index];
    if (!item) return;

    Object.values(howlsRef.current).forEach((howl) => howl.stop());
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const howl = getHowl(item.audio);
    howl.off("end");
    howl.rate(rate);

    setActiveIndex(index);
    setStatus("playing");

    const id = howl.play();
    currentHowlIdRef.current = id;

    howl.once("end", () => {
      if (currentHowlIdRef.current === id) {
        currentHowlIdRef.current = null;
      }

      if (playlistTokenRef.current !== token) return;

      if (!playlist) {
        setActiveIndex(null);
        setStatus("idle");
        return;
      }

      const nextIndex = index + 1;
      if (nextIndex < items.length) {
        timeoutRef.current = setTimeout(
          () => playAt(nextIndex, token, { playlist: true }),
          sequenceGapMs,
        );
      } else {
        setActiveIndex(null);
        setStatus("completed");
      }
    });
  };

  const handleCardClick = (index: number) => {
    playlistTokenRef.current += 1;
    playAt(index, playlistTokenRef.current, { playlist: false });
  };

  const handlePlayAll = () => {
    if (status === "playing") {
      Object.values(howlsRef.current).forEach((howl) => howl.pause());
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("paused");
      return;
    }

    playlistTokenRef.current += 1;
    const startIndex =
      status === "paused" && activeIndex !== null ? activeIndex : activeIndex ?? 0;
    playAt(startIndex, playlistTokenRef.current, { playlist: true });
  };

  const handleReplay = () => {
    playlistTokenRef.current += 1;
    playAt(activeIndex ?? 0, playlistTokenRef.current, {
      playlist: status === "playing",
    });
  };

  return {
    activeIndex,
    status,
    setStatus,
    stopAll,
    handleCardClick,
    handlePlayAll,
    handleReplay,
    playlistTokenRef,
    currentHowlIdRef,
    timeoutRef,
    howlsRef,
  };
}
