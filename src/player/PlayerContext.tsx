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
    musicId?: number; // API의 music_id (가사 조회 등에 사용)
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
    
    // ✅ 플레이어 컨트롤
    shuffleQueue: () => void;
    seekBackward: (seconds?: number) => void;
    seekForward: (seconds?: number) => void;
    nextTrack: () => void;
    previousTrack: () => void;
    repeatMode: 'off' | 'one';
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
    
    // ✅ 반복 모드: 'off' | 'one'
    const [repeatMode, setRepeatMode] = useState<'off' | 'one'>('off');
    // ✅ 반복 모드를 ref로도 저장 (handleEnded에서 최신 값 참조용)
    const repeatModeRef = useRef<'off' | 'one'>('off');
  
    // ✅ 실제 오디오 요소
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // ✅ 현재 트랙을 ref로도 저장 (에러 핸들러에서 최신 값 참조용)
    const currentRef = useRef<PlayerTrack | null>(null);
    // ✅ 재생 상태를 ref로도 저장 (셔플 등 상태 업데이트 시 재생 유지용)
    const isPlayingRef = useRef<boolean>(false);
  
    // ✅ current 변경 시 ref도 업데이트
    useEffect(() => {
      currentRef.current = current;
    }, [current]);
    
    // ✅ isPlaying 변경 시 ref도 업데이트
    useEffect(() => {
      isPlayingRef.current = isPlaying;
    }, [isPlaying]);
    
    // ✅ repeatMode 변경 시 ref도 업데이트
    useEffect(() => {
      repeatModeRef.current = repeatMode;
    }, [repeatMode]);

    // ✅ 볼륨 상태 (0~1)
    const [volume, _setVolume] = useState(0.8);
    const setVolume = useCallback((v: number) => {
      const vol = Math.max(0, Math.min(1, v));
      _setVolume(vol);
      if (audioRef.current) {
        audioRef.current.volume = vol;
      }
    }, []);

    // ✅ 오디오 요소 초기화 및 이벤트 리스너 (한 번만 실행)
    useEffect(() => {
      const audio = new Audio();
      audioRef.current = audio;
      audio.volume = volume; // 초기 볼륨 설정

      const handleTimeUpdate = () => {
        setProgress(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleEnded = () => {
        // ref에서 최신 반복 모드와 현재 곡 가져오기
        const currentRepeatMode = repeatModeRef.current;
        const currentTrack = currentRef.current;
        
        console.log('[PlayerContext] 곡 재생 종료:', {
          repeatMode: currentRepeatMode,
          currentTrack: currentTrack?.title,
        });
        
        // 반복 모드가 'one'이면 현재 곡 다시 재생 (다음 곡으로 넘어가지 않음)
        if (currentRepeatMode === 'one' && currentTrack) {
          console.log('[PlayerContext] 한곡 반복 모드: 같은 곡 다시 재생');
          const audio = audioRef.current;
          if (audio) {
            // 오디오를 처음부터 다시 재생
            audio.currentTime = 0;
            setProgress(0);
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                // AbortError는 재생 중 pause()가 호출된 경우이므로 무시
                if (e.name === 'AbortError') {
                  return;
                }
                console.error("[PlayerContext] 반복 재생 실패:", e);
                setIsPlaying(false);
              });
            }
          }
          return;
        }
        
        // 반복 모드가 'off'이면 다음 곡 재생
        console.log('[PlayerContext] 반복 모드 off: 다음 곡 재생');
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
    }, []); // volume dependency 제거 - 볼륨은 setVolume과 별도 useEffect에서 관리

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
          audio.volume = volume; // 현재 볼륨 설정
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
    }, [current]); // volume dependency 제거 - 볼륨은 별도로 관리

    // ✅ 볼륨 변경 시 오디오 볼륨만 업데이트 (오디오 재로드하지 않음)
    useEffect(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.volume = volume;
      }
    }, [volume]);

    // ✅ isPlaying 변경 시 재생/일시정지
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !current?.audioUrl) {
        console.log('[PlayerContext] isPlaying useEffect 스킵:', {
          hasAudio: !!audio,
          hasCurrent: !!current,
          hasAudioUrl: !!current?.audioUrl,
        });
        return;
      }

      console.log('[PlayerContext] isPlaying useEffect 실행:', {
        isPlaying,
        currentTitle: current.title,
        audioSrc: audio.src,
        audioPaused: audio.paused,
        currentAudioUrl: current.audioUrl,
      });

      if (isPlaying) {
        // 오디오가 이미 같은 곡을 재생 중이고 일시정지 상태가 아니면 재생하지 않음
        // (셔플 등으로 인한 불필요한 재시작 방지)
        const currentSrc = audio.src;
        const newSrc = current.audioUrl;
        const isSameTrack = currentSrc && newSrc && 
          (currentSrc === newSrc || 
           currentSrc.includes(newSrc.split('?')[0]) || 
           newSrc.includes(currentSrc.split('?')[0]));
        
        console.log('[PlayerContext] 재생 체크:', {
          isSameTrack,
          audioPaused: audio.paused,
          currentSrc,
          newSrc,
        });
        
        if (isSameTrack && !audio.paused) {
          // 이미 같은 곡이 재생 중이면 아무것도 하지 않음
          console.log('[PlayerContext] 같은 곡 재생 중이므로 재생하지 않음');
          return;
        }
        
        console.log('[PlayerContext] 오디오 재생 시작');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            // AbortError는 재생 중 pause()가 호출된 경우이므로 무시
            if (e.name === 'AbortError') {
              console.log('[PlayerContext] AbortError 무시 (정상 동작)');
              return;
            }
            console.error("[PlayerContext] 오디오 재생 실패:", e);
            setIsPlaying(false);
          });
        }
      } else {
        console.log('[PlayerContext] 오디오 일시정지');
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
    
    // ✅ 셔플: 재생 대기 곡들 셔플 (현재 재생 중인 곡에는 영향 없음)
    const shuffleQueue = useCallback(() => {
      console.log('[PlayerContext] 셔플 버튼 클릭');
      console.log('[PlayerContext] 셔플 전 상태:', {
        current: current?.title,
        isPlaying: isPlaying,
        isPlayingRef: isPlayingRef.current,
        queueLength: queue.length,
        audioPaused: audioRef.current?.paused,
        audioSrc: audioRef.current?.src,
      });
      
      // 현재 재생 상태를 유지하면서 큐만 섞기
      const currentTrack = current;
      const currentAudioSrc = audioRef.current?.src;
      
      setQueue((q) => {
        const shuffled = shuffleCopy(q);
        console.log('[PlayerContext] 셔플 후 큐:', {
          before: q.length,
          after: shuffled.length,
          shuffled: shuffled.map(t => t.title),
        });
        return shuffled;
      });
      
      // 셔플 후 상태 확인
      setTimeout(() => {
        console.log('[PlayerContext] 셔플 후 상태:', {
          current: currentTrack?.title,
          isPlaying: isPlaying,
          isPlayingRef: isPlayingRef.current,
          audioPaused: audioRef.current?.paused,
          audioSrc: audioRef.current?.src,
          audioSrcChanged: audioRef.current?.src !== currentAudioSrc,
        });
      }, 100);
    }, [current, isPlaying, queue]);
    
    // ✅ 뒤로 5초
    const seekBackward = useCallback((seconds: number = 5) => {
      const audio = audioRef.current;
      if (audio && current?.audioUrl) {
        const newTime = Math.max(0, audio.currentTime - seconds);
        audio.currentTime = newTime;
        setProgress(newTime);
      }
    }, [current]);
    
    // ✅ 앞으로 5초
    const seekForward = useCallback((seconds: number = 5) => {
      const audio = audioRef.current;
      if (audio && current?.audioUrl) {
        const newTime = Math.min(audio.duration || duration, audio.currentTime + seconds);
        audio.currentTime = newTime;
        setProgress(newTime);
      }
    }, [current, duration]);
    
    // ✅ 다음 곡
    const nextTrack = useCallback(() => {
      setQueue((q) => {
        if (q.length > 0) {
          const nextTrack = q[0];
          setCurrent(nextTrack);
          setProgress(0);
          return q.slice(1);
        }
        return q;
      });
    }, []);
    
    // ✅ 이전 곡
    const previousTrack = useCallback(() => {
      setHistory((h) => {
        if (h.length > 0) {
          const prevTrack = h[0];
          setCurrent(prevTrack);
          setProgress(0);
          // 현재 곡을 큐 앞에 추가
          if (current) {
            setQueue((q) => [current, ...q]);
          }
          return h.slice(1);
        }
        return h;
      });
    }, [current]);
    
    // ✅ 반복 모드 토글
    const toggleRepeat = useCallback(() => {
      setRepeatMode((mode) => (mode === 'off' ? 'one' : 'off'));
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
        
        // ✅ 플레이어 컨트롤
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
