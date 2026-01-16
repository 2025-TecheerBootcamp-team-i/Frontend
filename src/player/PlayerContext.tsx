import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

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

    // 더미 duration (나중에 audio 연동)
    const [duration] = useState(0);

    const [queue, setQueue] = useState<PlayerTrack[]>([]);
    const [history, setHistory] = useState<PlayerTrack[]>([]);

    // ✅ 볼륨 상태 (0~1)
    const [volume, _setVolume] = useState(0.8);
    const setVolume = useCallback((v: number) => {
        _setVolume(Math.max(0, Math.min(1, v)));
    }, []);

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

        // queue는 "다음 곡들"만 두는 게 자연스러움
        setQueue(list.slice(1));

        setHistory((prev) => {
        const first = list[0];
        const next = [first, ...prev.filter((t) => t.id !== first.id)];
        return next.slice(0, 50);
        });
    }, []);

    const toggle = useCallback(() => setIsPlaying((v) => !v), []);
    const seek = useCallback((sec: number) => setProgress(sec), []);

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
        ]
    );

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
