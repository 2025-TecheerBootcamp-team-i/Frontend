import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

export type PlayerTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  coverUrl?: string;
  audioUrl?: string;
  likeCount?: number;
  musicId?: number;
};

export type PlayerContextValue = {
  current: PlayerTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  queue: PlayerTrack[];
  history: PlayerTrack[];

  playList: (tracks: PlayerTrack[]) => void;
  playListShuffled: (tracks: PlayerTrack[]) => void;
  playTracks: (tracks: PlayerTrack[], opts?: { shuffle?: boolean }) => void;

  volume: number;
  setVolume: (v: number) => void;

  setTrackAndPlay: (track: PlayerTrack) => void;
  toggle: () => void;
  seek: (sec: number) => void;

  removeFromQueue: (trackId: string) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;

  shuffleQueue: () => void;
  seekBackward: (seconds?: number) => void;
  seekForward: (seconds?: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  repeatMode: "off" | "one";
  toggleRepeat: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

const shuffleCopy = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [history, setHistory] = useState<PlayerTrack[]>([]);

  const [repeatMode, setRepeatMode] = useState<"off" | "one">("off");
  const repeatModeRef = useRef<"off" | "one">("off");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef<PlayerTrack | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // ✅ 볼륨 상태 (0~1)
  const [volume, _setVolume] = useState(0.8);
  const setVolume = useCallback((v: number) => {
    const vol = Math.max(0, Math.min(1, v));
    _setVolume(vol);
    // ✅ 바로 반영 (슬라이더 드래그 시 즉시 적용)
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  // ✅ 오디오 초기화 & 이벤트 리스너 (1회)
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      // ✅ 메타데이터 로딩 후 duration 업데이트 (정석)
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const handleEnded = () => {
      const currentRepeatMode = repeatModeRef.current;
      const currentTrack = currentRef.current;

      if (currentRepeatMode === "one" && currentTrack) {
        const a = audioRef.current;
        if (!a) return;

        a.currentTime = 0;
        setProgress(0);

        const p = a.play();
        if (p) {
          p.catch((e) => {
            if (e?.name === "AbortError") return;
            console.error("[PlayerContext] repeat play failed:", e);
            setIsPlaying(false);
          });
        }
        return;
      }

      setQueue((q) => {
        if (q.length > 0) {
          const next = q[0];
          setCurrent(next);
          setProgress(0);
          return q.slice(1);
        }
        setIsPlaying(false);
        setProgress(0);
        return q;
      });
    };

    const handleError = () => {
      const a = audioRef.current;
      if (!a) {
        setIsPlaying(false);
        return;
      }

      const t = currentRef.current;
      const err = a.error;

      if (err) {
        let msg = "알 수 없는 오류";
        // ✅ TS/런타임 안정: MediaError 상수 대신 숫자 코드
        switch (err.code) {
          case 1:
            msg = "재생이 중단되었습니다";
            break;
          case 2:
            msg = "네트워크 오류로 인해 재생할 수 없습니다";
            break;
          case 3:
            msg = "오디오 파일 디코딩 오류";
            break;
          case 4:
            msg = "지원하지 않는 오디오 형식이거나 URL이 잘못되었습니다";
            break;
        }
        console.error(`[PlayerContext] audio error (code: ${err.code})`, {
          message: msg,
          audioSrc: a.src,
          expectedAudioUrl: t?.audioUrl || "(없음)",
          currentTrack: t?.title || "알 수 없음",
          trackId: t?.id || "알 수 없음",
        });
      } else {
        console.error("[PlayerContext] audio error: no error info", {
          audioSrc: a.src,
          expectedAudioUrl: t?.audioUrl || "(없음)",
          currentTrack: t?.title || "알 수 없음",
        });
      }

      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  // ✅ 볼륨 변경 시 오디오 볼륨 동기화 (항상 보장)
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
  }, [volume]);

  // ✅ current 변경 시 오디오 src만 동기화
  //    (주의) 여기서 setState를 "동기"로 때리면 린트가 싫어하므로 rAF로 미룸
  useEffect(() => {
    const a = audioRef.current;

    // helper: 린트 룰 피하면서 state 초기화
    const resetReactSide = () => {
      const id = requestAnimationFrame(() => {
        setProgress(0);
        setDuration(0);
      });
      return () => cancelAnimationFrame(id);
    };

    if (!a || !current) {
      if (a) {
        a.pause();
        a.src = "";
        a.load();
      }
      return resetReactSide();
    }

    const url = current.audioUrl?.trim() ?? "";
    const ok =
      url &&
      (url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("/"));

    if (!ok) {
      a.pause();
      a.src = "";
      a.load();

      const cleanup = resetReactSide();
      const id = requestAnimationFrame(() => setIsPlaying(false));
      return () => {
        cleanup?.();
        cancelAnimationFrame(id);
      };
    }

    // ✅ 외부 시스템(오디오)만 업데이트
    a.src = url;
    a.load();

    // ✅ 재생 상태 유지: 현재 isPlaying이면 play() 트리거는 아래 isPlaying effect가 담당
    // (여기서 play()까지 하면 effect 간 꼬일 수 있음)

    // 진행률은 새 곡이니까 0으로. (rAF로 미룸)
    return resetReactSide();
  }, [current]);

  // ✅ isPlaying 변경 시 play/pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current?.audioUrl) return;

    if (isPlaying) {
      const p = a.play();
      if (p) {
        p.catch((e) => {
          if (e?.name === "AbortError") return;
          console.error("[PlayerContext] play failed:", e);
          setIsPlaying(false);
        });
      }
    } else {
      a.pause();
    }
  }, [isPlaying, current]);

  const playList = useCallback((tracks: PlayerTrack[]) => {
    if (tracks.length === 0) return;
    setCurrent(tracks[0]);
    setIsPlaying(true);
    setProgress(0);
    setQueue(tracks.slice(1));
  }, []);

  const playListShuffled = useCallback(
    (tracks: PlayerTrack[]) => {
      if (tracks.length === 0) return;
      playList(shuffleCopy(tracks));
    },
    [playList]
  );

  const setTrackAndPlay = useCallback((track: PlayerTrack) => {
    setCurrent(track);
    setIsPlaying(true);
    setProgress(0);

    setHistory((prev) => {
      const next = [track, ...prev.filter((t) => t.id !== track.id)];
      return next.slice(0, 50);
    });
  }, []);

  const playTracks = useCallback((tracks: PlayerTrack[], opts?: { shuffle?: boolean }) => {
    if (tracks.length === 0) return;

    const list = opts?.shuffle ? shuffleCopy(tracks) : tracks;

    setCurrent(list[0]);
    setIsPlaying(true);
    setProgress(0);

    setQueue(list.slice(1));

    setHistory((prev) => {
      const first = list[0];
      const next = [first, ...prev.filter((t) => t.id !== first.id)];
      return next.slice(0, 50);
    });
  }, []);

  const toggle = useCallback(() => {
    if (!current?.audioUrl) return;
    setIsPlaying((v) => !v);
  }, [current]);

  const seek = useCallback(
    (sec: number) => {
      const a = audioRef.current;
      if (a && current?.audioUrl) {
        a.currentTime = sec;
        setProgress(sec);
      }
    },
    [current]
  );

  const removeFromQueue = useCallback((trackId: string) => {
    setQueue((q) => q.filter((t) => t.id !== trackId));
  }, []);

  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((q) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= q.length ||
        toIndex >= q.length
      )
        return q;

      const next = [...q];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const shuffleQueue = useCallback(() => {
    setQueue((q) => shuffleCopy(q));
  }, []);

  const seekBackward = useCallback(
    (seconds: number = 5) => {
      const a = audioRef.current;
      if (a && current?.audioUrl) {
        const newTime = Math.max(0, a.currentTime - seconds);
        a.currentTime = newTime;
        setProgress(newTime);
      }
    },
    [current]
  );

  const seekForward = useCallback(
    (seconds: number = 5) => {
      const a = audioRef.current;
      if (a && current?.audioUrl) {
        const newTime = Math.min(a.duration || duration, a.currentTime + seconds);
        a.currentTime = newTime;
        setProgress(newTime);
      }
    },
    [current, duration]
  );

  const nextTrack = useCallback(() => {
    setQueue((q) => {
      if (q.length > 0) {
        const next = q[0];
        setCurrent(next);
        setProgress(0);
        return q.slice(1);
      }
      return q;
    });
  }, []);

  const previousTrack = useCallback(() => {
    setHistory((h) => {
      if (h.length > 0) {
        const prev = h[0];
        setCurrent(prev);
        setProgress(0);
        if (current) setQueue((q) => [current, ...q]);
        return h.slice(1);
      }
      return h;
    });
  }, [current]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === "off" ? "one" : "off"));
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      isPlaying,
      progress,
      duration,
      queue,
      history,

      playList,
      playListShuffled,
      playTracks,

      volume,
      setVolume,

      setTrackAndPlay,
      toggle,
      seek,

      removeFromQueue,
      moveQueueItem,

      shuffleQueue,
      seekBackward,
      seekForward,
      nextTrack,
      previousTrack,
      repeatMode,
      toggleRepeat,
    }),
    [
      current,
      isPlaying,
      progress,
      duration,
      queue,
      history,
      playList,
      playListShuffled,
      playTracks,
      volume,
      setVolume,
      setTrackAndPlay,
      toggle,
      seek,
      removeFromQueue,
      moveQueueItem,
      shuffleQueue,
      seekBackward,
      seekForward,
      nextTrack,
      previousTrack,
      repeatMode,
      toggleRepeat,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
