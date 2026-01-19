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
};

export type PlayerContextValue = {
    current: PlayerTrack | null;
    isPlaying: boolean;
    progress: number;
    duration: number;
    queue: PlayerTrack[];
    history: PlayerTrack[];

    // ✅ 재생 유틸
    playList: (tracks: PlayerTrack[]) => void;
    playListShuffled: (tracks: PlayerTrack[]) => void;
  
    // ✅ 범용 재생 (ChartTop100이 쓰는 방식)
    playTracks: (tracks: PlayerTrack[], opts?: { shuffle?: boolean }) => void;
  
    // ✅ 볼륨
    volume: number;
    setVolume: (v: number) => void;
  
    // ✅ 액션
    setTrackAndPlay: (track: PlayerTrack) => void;
    toggle: () => void;
    seek: (sec: number) => void;
  
    // ✅ 추가: 큐 편집
    removeFromQueue: (trackId: string) => void;
    moveQueueItem: (fromIndex: number, toIndex: number) => void;
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
  
    // ✅ 실제 오디오 요소
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // ✅ 현재 트랙을 ref로도 저장 (에러 핸들러에서 최신 값 참조용)
    const currentRef = useRef<PlayerTrack | null>(null);
  
    // ✅ current 변경 시 ref도 업데이트
    useEffect(() => {
      currentRef.current = current;
    }, [current]);

    // ✅ 볼륨 상태 (0~1)
    const [volume, _setVolume] = useState(0.8);
    const setVolume = useCallback((v: number) => {
      const vol = Math.max(0, Math.min(1, v));
      _setVolume(vol);
      if (audioRef.current) {
        audioRef.current.volume = vol;
      }
    }, []);

    // ✅ 오디오 요소 초기화 및 이벤트 리스너
    useEffect(() => {
      const audio = new Audio();
      audioRef.current = audio;
      audio.volume = volume;

      const handleTimeUpdate = () => {
        setProgress(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleEnded = () => {
        setQueue((q) => {
          if (q.length > 0) {
            const nextTrack = q[0];
            setCurrent(nextTrack);
            setProgress(0);
            return q.slice(1);
          } else {
            setIsPlaying(false);
            setProgress(0);
            return q;
          }
        });
      };

      const handleError = () => {
        const audio = audioRef.current;
        if (!audio) {
          console.error("[PlayerContext] 오디오 재생 오류: audio 요소가 없습니다");
          setIsPlaying(false);
          return;
        }

        const currentTrack = currentRef.current;

        const error = audio.error;
        if (error) {
          let errorMessage = "알 수 없는 오류";
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = "재생이 중단되었습니다";
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = "네트워크 오류로 인해 재생할 수 없습니다";
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = "오디오 파일 디코딩 오류";
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = "지원하지 않는 오디오 형식이거나 URL이 잘못되었습니다";
              break;
          }
          console.error(`[PlayerContext] 오디오 재생 오류 (코드: ${error.code}):`, {
            message: errorMessage,
            audioSrc: audio.src,
            expectedAudioUrl: currentTrack?.audioUrl || "(없음)",
            currentTrack: currentTrack?.title || "알 수 없음",
            trackId: currentTrack?.id || "알 수 없음",
          });
        } else {
          console.error("[PlayerContext] 오디오 재생 오류: 오류 정보를 가져올 수 없습니다", {
            audioSrc: audio.src,
            expectedAudioUrl: currentTrack?.audioUrl || "(없음)",
            currentTrack: currentTrack?.title || "알 수 없음",
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
    }, [volume]);

    // ✅ current 변경 시 오디오 URL 로드
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !current) {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
        setDuration(0);
        return;
      }

      if (current.audioUrl) {
        // audioUrl이 유효한 오디오 URL인지 확인 (http/https로 시작하는지)
        const audioUrl = current.audioUrl.trim();
        if (audioUrl && (audioUrl.startsWith("http://") || audioUrl.startsWith("https://") || audioUrl.startsWith("/"))) {
          console.log(`[PlayerContext] 오디오 URL 로드:`, {
            trackId: current.id,
            trackTitle: current.title,
            audioUrl: audioUrl,
          });
          audio.src = audioUrl;
          audio.volume = volume;
          setProgress(0);
          audio.load();
        } else {
          console.warn(`[PlayerContext] 유효하지 않은 오디오 URL:`, {
            trackId: current.id,
            trackTitle: current.title,
            audioUrl: audioUrl,
          });
          audio.pause();
          audio.src = "";
          setDuration(0);
          setIsPlaying(false);
        }
      } else {
        console.warn(`[PlayerContext] 오디오 URL이 없음:`, {
          trackId: current.id,
          trackTitle: current.title,
        });
        audio.pause();
        audio.src = "";
        setDuration(0);
      }
    }, [current, volume]);

    // ✅ isPlaying 변경 시 재생/일시정지
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !current?.audioUrl) return;

      if (isPlaying) {
        audio.play().catch((e) => {
          console.error("오디오 재생 실패:", e);
          setIsPlaying(false);
        });
      } else {
        audio.pause();
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
  
    const playTracks = useCallback(
      (tracks: PlayerTrack[], opts?: { shuffle?: boolean }) => {
        if (tracks.length === 0) return;
  
        const list = opts?.shuffle ? shuffleCopy(tracks) : tracks;
  
        setCurrent(list[0]);
        setIsPlaying(true);
        setProgress(0);
  
        // queue는 다음 곡들만
        setQueue(list.slice(1));
  
        setHistory((prev) => {
          const first = list[0];
          const next = [first, ...prev.filter((t) => t.id !== first.id)];
          return next.slice(0, 50);
        });
      },
      []
    );
  
    const toggle = useCallback(() => {
      if (!current?.audioUrl) return;
      setIsPlaying((v) => !v);
    }, [current]);
    
    const seek = useCallback((sec: number) => {
      const audio = audioRef.current;
      if (audio && current?.audioUrl) {
        audio.currentTime = sec;
        setProgress(sec);
      }
    }, [current]);
  
    // ✅ 추가: 큐에서 삭제
    const removeFromQueue = useCallback((trackId: string) => {
      setQueue((q) => q.filter((t) => t.id !== trackId));
    }, []);
  
    // ✅ 추가: 큐 순서 변경
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
  
        // ✅ 큐 편집
        removeFromQueue,
        moveQueueItem,
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
      ]
    );
  
    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
