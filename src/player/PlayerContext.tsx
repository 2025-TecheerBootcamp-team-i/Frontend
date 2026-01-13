    import {
        createContext,
        useContext,
        useEffect,
        useMemo,
        useRef,
        useState,
    } from "react";
    
    export type Track = {
        id: string;
        title: string;
        artist: string;
        coverUrl?: string;
        audioUrl: string;
    };
    
    type PlayerState = {
        current: Track | null;
        isPlaying: boolean;
        progress: number;
        duration: number;
        volume: number;
    };
    
    type PlayerActions = {
        setTrackAndPlay: (track: Track) => Promise<void>;
        toggle: () => Promise<void>;
        pause: () => void;
        play: () => Promise<void>;
        seek: (sec: number) => void;
        setVolume: (v: number) => void;
    };
    
    const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);
    
    export function PlayerProvider({ children }: { children: React.ReactNode }) {
        /** ✅ mutable 객체는 ref */
        const audioRef = useRef<HTMLAudioElement | null>(null);
    
        /** 상태 */
        const [current, setCurrent] = useState<Track | null>(null);
        const [isPlaying, setIsPlaying] = useState(false);
        const [progress, setProgress] = useState(0);
        const [duration, setDuration] = useState(0);
        const [volume, setVolume] = useState(0.8);
    
        /** ✅ 오디오 객체는 effect에서 "한 번만" 생성 */
        useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
    
        const audio = audioRef.current;
        if (!audio) return;
    
        audio.volume = volume;
    
        const onTimeUpdate = () => setProgress(audio.currentTime || 0);
        const onLoaded = () => setDuration(audio.duration || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);
    
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("ended", onEnded);
    
        return () => {
            audio.pause();
            audio.src = "";
            audio.load();
    
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("ended", onEnded);
        };
        }, [volume]);
    
        const actions: PlayerActions = useMemo(
        () => ({
            setTrackAndPlay: async (track) => {
            const audio = audioRef.current;
            if (!audio) return;
    
            setCurrent(track);
            setProgress(0);
            setDuration(0);
    
            audio.src = track.audioUrl;
            audio.currentTime = 0;
    
            try {
                await audio.play();
            } catch {
                //
            }
            },
    
            toggle: async () => {
            const audio = audioRef.current;
            if (!audio || !current) return;
    
            if (audio.paused) {
                try {
                await audio.play();
                } catch {
                        // 
                    }
            } else {
                audio.pause();
            }
            },
    
            pause: () => audioRef.current?.pause(),
    
            play: async () => {
            const audio = audioRef.current;
            if (!audio || !current) return;
            try {
                await audio.play();
            } catch {
                //
            }
            },
    
            seek: (sec) => {
            const audio = audioRef.current;
            if (!audio) return;
    
            audio.currentTime = Math.max(0, Math.min(sec, audio.duration || sec));
            setProgress(audio.currentTime);
            },
    
            setVolume: (v) => {
            const nv = Math.max(0, Math.min(1, v));
            setVolume(nv);
            if (audioRef.current) audioRef.current.volume = nv;
            },
        }),
        [current]
        );
    
        const value = useMemo(
        () => ({
            current,
            isPlaying,
            progress,
            duration,
            volume,
            ...actions,
        }),
        [current, isPlaying, progress, duration, volume, actions]
        );
    
        return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
    }
    
    export function usePlayer() {
        const ctx = useContext(PlayerContext);
        if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
        return ctx;
    }
    