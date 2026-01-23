import axios from "axios";
import { useMemo, useState, useEffect, useCallback } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MdFavorite, MdAutoAwesome, MdQueueMusic, MdClose, MdDelete, MdDragIndicator, MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious, MdShuffle, MdRepeat } from "react-icons/md";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { RiDashboardFill } from "react-icons/ri";
import { GrContract } from "react-icons/gr";
import { usePlayer } from "../../player/PlayerContext";
import { getBestAlbumCover } from "../../api/album";
import { likecount, likeTrack, deleteTrack } from "../../api/LikedSong";

// ✅ NowPlayingPage.tsx 상단 (import 아래) — 1번만 주입되는 이퀄라이저 CSS
let __npEqStyleInjected = false;
function ensureNowPlayingEqStyle() {
    if (__npEqStyleInjected) return;
    __npEqStyleInjected = true;

    const style = document.createElement("style");
    style.setAttribute("data-nowplaying-eq", "true");
    style.innerHTML = `
        @keyframes np-eq-calm {
            0%   { transform: scaleY(0.22); opacity: .45; }
            25%  { transform: scaleY(0.38); opacity: .60; }
            50%  { transform: scaleY(0.30); opacity: .52; }
            75%  { transform: scaleY(0.48); opacity: .65; }
            100% { transform: scaleY(0.22); opacity: .45; }
            }

            .np-eq-bar {
            transform-origin: bottom;
            will-change: transform, opacity;
            }

    `;
    document.head.appendChild(style);
}


type LyricLine = { t: number; text: string; timestamp?: string | null };

// ✅ 검색 API 응답 타입 (SearchAll.tsx 기반 추정)
type SearchResult = {
    itunes_id: number;
    music_id?: number | null;
    album_id?: number | null;
    artist_name?: string | null;
    music_name?: string | null;
};

type SearchApiResponse = {
    results?: SearchResult[];
};

// ✅ 앨범 상세 응답 타입 (tracks 배열만 최소로 사용)
type AlbumTrack = { music_id?: number | null; music_name?: string | null };
type AlbumDetailResponse = { tracks?: AlbumTrack[] };

export default function NowPlayingPage() {
    ensureNowPlayingEqStyle();

    const navigate = useNavigate();

    // ✅ 먼저 PlayerContext에서 isPlaying을 꺼내야 함 (순서 중요)
    const {
        current,
        queue,
        history,
        isPlaying,
        toggle,
        removeFromQueue,
        moveQueueItem,
        shuffleQueue,
        nextTrack,
        previousTrack,
        repeatMode,
        toggleRepeat,
        setTrackAndPlay,
    } = usePlayer();

    const hasTrack = !!current;

    // ✅ 재생 재시작 시 애니메이션 리셋용
    const [playSeq, setPlaySeq] = useState(0);

    useEffect(() => {
        // 곡이 있고 + 재생 시작될 때만 playSeq 증가
        if (hasTrack && isPlaying) setPlaySeq((v) => v + 1);
    }, [hasTrack, isPlaying, current?.id]);

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

    // 이미지 URL 처리 함수
    const processImageUrl = useCallback((url: string | null | undefined): string | null => {
        if (!url) return null;

        const base = import.meta.env.VITE_API_BASE_URL as string | undefined;

        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
            return url;
        }
        if (base && url.startsWith("/")) {
            return `${base.replace("/api/v1", "")}${url}`;
        }
        return url;
    }, []);

    // ✅ 가사 패널 (bottom sheet)
    const [lyricsOpen, setLyricsOpen] = useState(false);

    // ✅ 가사 데이터 상태
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsError, setLyricsError] = useState<string | null>(null);

    // ✅ 음악 분석 데이터 (valence, arousal)
    const [musicAnalysis, setMusicAnalysis] = useState<{ valence: number; arousal: number } | null>(null);

    // ✅ 음악 상세 데이터 (커버 이미지 우선순위용)
    const [musicDetail, setMusicDetail] = useState<{
        image_large_square?: string | null;
        image_square?: string | null;
        album_image?: string | null;
    } | null>(null);

    // ✅ 재생 로그 데이터 (시간대별 재생횟수)
    type PlayLogData = { time: string; count: number };
    const [playLogs, setPlayLogs] = useState<PlayLogData[]>([]);
    const [playLogsLoading, setPlayLogsLoading] = useState(false);

    // 커버 이미지 우선순위: image_large_square → image_square → album_image → coverUrl (fallback)
    const coverImage = useMemo(() => {
        if (!current) return null;

        // 1순위: musicDetail에서 image_large_square
        if (musicDetail?.image_large_square) {
            return processImageUrl(musicDetail.image_large_square);
        }

        // 2순위: musicDetail에서 image_square
        if (musicDetail?.image_square) {
            return processImageUrl(musicDetail.image_square);
        }

        // 3순위: musicDetail에서 album_image
        if (musicDetail?.album_image) {
            return processImageUrl(musicDetail.album_image);
        }

        // 4순위 (fallback): current.coverUrl
        return processImageUrl(current.coverUrl);
    }, [current, musicDetail, processImageUrl]);

    // ✅ 가사 API 호출
    useEffect(() => {
        if (!current || !API_BASE) {
            setLyrics([]);
            setLyricsError(null);
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                setLyricsLoading(true);
                setLyricsError(null);

                // ⚠️ current.musicId는 itunes_id일 수 있으므로 무조건 검색으로 실제 music_id를 찾음
                let musicId: number | null = null;

                {
                    // current.id가 itunes_id일 수 있으므로, music_id를 찾아야 함
                    const itunesId = Number(current.id);
                    if (Number.isNaN(itunesId)) {
                        console.warn(
                            `[NowPlayingPage] 가사 API 호출 실패: current.id가 숫자가 아니고 musicId도 없습니다.`,
                            { id: current.id, title: current.title }
                        );
                        setLyrics([]);
                        setLyricsError(null);
                        return;
                    }

                    // 1) 제목으로 검색해서 itunes_id 매칭 시도
                    try {
                        const searchUrl = `${API_BASE}/search?q=${encodeURIComponent(current.title)}`;
                        const searchRes = await fetch(searchUrl, {
                            method: "GET",
                            signal: controller.signal,
                            headers: { "Content-Type": "application/json" },
                        });

                        if (searchRes.ok) {
                            const searchData = (await searchRes.json()) as SearchApiResponse;

                            const matchedResult = searchData.results?.find((r) => r.itunes_id === itunesId);

                            if (matchedResult?.music_id) {
                                musicId = matchedResult.music_id ?? null;
                            } else if (matchedResult?.album_id) {
                                // 2) music_id가 없으면 앨범 API를 통해 찾기
                                try {
                                    const albumRes = await fetch(`${API_BASE}/albums/${matchedResult.album_id}/`, {
                                        method: "GET",
                                        signal: controller.signal,
                                        headers: { "Content-Type": "application/json" },
                                    });

                                    if (albumRes.ok) {
                                        const albumData = (await albumRes.json()) as AlbumDetailResponse;
                                        const matchedTrack = albumData.tracks?.find(
                                            (t) => t.music_name === current.title
                                        );
                                        if (matchedTrack?.music_id) {
                                            musicId = matchedTrack.music_id ?? null;
                                        }
                                    }
                                } catch (err) {
                                    if (err instanceof DOMException && err.name === "AbortError") return;
                                    console.warn(`[NowPlayingPage] 앨범 API 호출 실패:`, err);
                                }
                            }
                        } else if (searchRes.status !== 404) {
                            console.warn(`[NowPlayingPage] 검색 API 오류: ${searchRes.status}`);
                        }
                    } catch (err) {
                        if (err instanceof DOMException && err.name === "AbortError") return;
                        console.warn(`[NowPlayingPage] 검색 API 호출 실패:`, err);
                    }

                    // 3) 여전히 못 찾으면 "아티스트 + 제목" 조합 검색
                    if (!musicId) {
                        try {
                            const combinedSearch = `${current.artist} ${current.title}`;
                            const combinedSearchUrl = `${API_BASE}/search?q=${encodeURIComponent(combinedSearch)}`;

                            const combinedSearchRes = await fetch(combinedSearchUrl, {
                                method: "GET",
                                signal: controller.signal,
                                headers: { "Content-Type": "application/json" },
                            });

                            if (combinedSearchRes.ok) {
                                const combinedSearchData = (await combinedSearchRes.json()) as SearchApiResponse;

                                const matched = combinedSearchData.results?.find(
                                    (r) => r.artist_name === current.artist && r.music_name === current.title
                                );

                                if (matched?.music_id) {
                                    musicId = matched.music_id ?? null;
                                }
                            }
                        } catch (err) {
                            if (err instanceof DOMException && err.name === "AbortError") return;
                            console.warn(`[NowPlayingPage] 조합 검색 API 호출 실패:`, err);
                        }
                    }

                    // 여전히 music_id를 찾지 못했으면 가사를 불러올 수 없음
                    if (!musicId) {
                        console.warn(`[NowPlayingPage] ⚠️ music_id를 찾을 수 없어 가사를 불러올 수 없습니다:`, {
                            title: current.title,
                            artist: current.artist,
                        });
                        setLyrics([]);
                        setLyricsError(null);
                        return;
                    }
                }

                // 가사 API 호출: /api/v1/{music_id}/
                const lyricsUrl = `${API_BASE}/${musicId}/`;

                const res = await fetch(lyricsUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        // 404: 트랙이 없거나 가사가 없는 경우 -> 빈 가사 처리
                        setLyrics([]);
                        setLyricsError(null);
                        return;
                    }
                    throw new Error(`가사 API 오류: ${res.status}`);
                }

                const data = (await res.json()) as { lyrics?: unknown };

                let parsedLyrics: LyricLine[] = [];

                if (typeof data.lyrics === "string" && data.lyrics.trim()) {
                    // 타임스탬프 형식: [00:00.56] 가사 텍스트
                    const lines = data.lyrics.split(/\r?\n/).filter((line) => line.trim() !== "");

                    parsedLyrics = lines.map((line) => {
                        const timestampMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
                        if (timestampMatch) {
                            const minutes = parseInt(timestampMatch[1], 10);
                            const seconds = parseInt(timestampMatch[2], 10);
                            const centiseconds = parseInt(timestampMatch[3], 10);
                            const timestampSeconds = minutes * 60 + seconds + centiseconds / 100;

                            const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/, "").trim();

                            return {
                                t: timestampSeconds,
                                text: text || line.trim(),
                                timestamp: timestampMatch[0],
                            };
                        }

                        // 타임스탬프가 없는 경우
                        return { t: 0, text: line.trim(), timestamp: null };
                    });

                    parsedLyrics = parsedLyrics
                        .filter((l) => l.text.trim() !== "")
                        .sort((a, b) => a.t - b.t);

                    setLyrics(parsedLyrics);
                } else {
                    // lyrics 필드가 없거나 다른 형식
                    setLyrics([]);
                    setLyricsError(null);
                }
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") return;

                console.error(`[NowPlayingPage] ❌ 가사 로드 실패:`, {
                    id: current?.id,
                    title: current?.title,
                    error: err,
                });
                setLyricsError(err instanceof Error ? err.message : "가사를 불러올 수 없습니다.");
                setLyrics([]);
            } finally {
                setLyricsLoading(false);
            }
        })();

        return () => controller.abort();
    }, [current, API_BASE]);

    // ✅ 음악 분석 데이터 가져오기 (valence, arousal)
    useEffect(() => {
        if (!current || !API_BASE) {
            setMusicAnalysis(null);
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                // ⚠️ current.musicId는 itunes_id일 수 있으므로 무조건 검색으로 실제 music_id를 찾음
                let musicId: number | null = null;

                console.log(`[NowPlayingPage] 음악 분석 시작:`, {
                    title: current.title,
                    currentId: current.id,
                    storedMusicId: (current as { musicId?: number | null }).musicId
                });

                // 항상 검색으로 실제 music_id 찾기
                {
                    // current.id가 itunes_id일 수 있으므로, music_id를 찾아야 함
                    const itunesId = Number(current.id);
                    if (Number.isNaN(itunesId)) {
                        console.warn(`[NowPlayingPage] current.id가 숫자가 아닙니다:`, current.id);
                        setMusicAnalysis(null);
                        return;
                    }

                    // 1) 제목으로 검색해서 itunes_id 매칭 시도
                    try {
                        const searchUrl = `${API_BASE}/search?q=${encodeURIComponent(current.title)}`;
                        console.log(`[NowPlayingPage] 검색 API 호출:`, searchUrl);

                        const searchRes = await fetch(searchUrl, {
                            method: "GET",
                            signal: controller.signal,
                            headers: { "Content-Type": "application/json" },
                        });

                        if (searchRes.ok) {
                            const searchData = (await searchRes.json()) as SearchApiResponse;
                            console.log(`[NowPlayingPage] 검색 결과:`, searchData.results?.length, '개');

                            const matchedResult = searchData.results?.find((r) => r.itunes_id === itunesId);

                            if (matchedResult?.music_id) {
                                musicId = matchedResult.music_id ?? null;
                                console.log(`[NowPlayingPage] music_id 찾음 (검색):`, musicId);
                            } else if (matchedResult?.album_id) {
                                console.log(`[NowPlayingPage] music_id 없음, 앨범 API 시도:`, matchedResult.album_id);

                                // 2) music_id가 없으면 앨범 API를 통해 찾기
                                try {
                                    const albumRes = await fetch(`${API_BASE}/albums/${matchedResult.album_id}/`, {
                                        method: "GET",
                                        signal: controller.signal,
                                        headers: { "Content-Type": "application/json" },
                                    });

                                    if (albumRes.ok) {
                                        const albumData = (await albumRes.json()) as AlbumDetailResponse;
                                        const matchedTrack = albumData.tracks?.find(
                                            (t) => t.music_name === current.title
                                        );
                                        if (matchedTrack?.music_id) {
                                            musicId = matchedTrack.music_id ?? null;
                                            console.log(`[NowPlayingPage] music_id 찾음 (앨범):`, musicId);
                                        }
                                    }
                                } catch (err) {
                                    if (err instanceof DOMException && err.name === "AbortError") return;
                                    console.warn(`[NowPlayingPage] 앨범 API 호출 실패:`, err);
                                }
                            } else {
                                console.warn(`[NowPlayingPage] 검색 결과에서 매칭되는 곡을 찾지 못함`);
                            }
                        } else {
                            console.warn(`[NowPlayingPage] 검색 API 오류: ${searchRes.status}`);
                        }
                    } catch (err) {
                        if (err instanceof DOMException && err.name === "AbortError") return;
                        console.warn(`[NowPlayingPage] 검색 API 호출 실패:`, err);
                    }

                    // 3) 여전히 못 찾으면 "아티스트 + 제목" 조합 검색
                    if (!musicId) {
                        try {
                            const combinedSearch = `${current.artist} ${current.title}`;
                            const combinedSearchUrl = `${API_BASE}/search?q=${encodeURIComponent(combinedSearch)}`;
                            console.log(`[NowPlayingPage] 조합 검색 시도:`, combinedSearch);

                            const combinedSearchRes = await fetch(combinedSearchUrl, {
                                method: "GET",
                                signal: controller.signal,
                                headers: { "Content-Type": "application/json" },
                            });

                            if (combinedSearchRes.ok) {
                                const combinedSearchData = (await combinedSearchRes.json()) as SearchApiResponse;

                                const matched = combinedSearchData.results?.find(
                                    (r) => r.artist_name === current.artist && r.music_name === current.title
                                );

                                if (matched?.music_id) {
                                    musicId = matched.music_id ?? null;
                                    console.log(`[NowPlayingPage] music_id 찾음 (조합 검색):`, musicId);
                                }
                            }
                        } catch (err) {
                            if (err instanceof DOMException && err.name === "AbortError") return;
                            console.warn(`[NowPlayingPage] 조합 검색 API 호출 실패:`, err);
                        }
                    }
                }

                if (!musicId) {
                    console.warn(`[NowPlayingPage] ⚠️ music_id를 찾을 수 없어 음악 분석 데이터를 불러올 수 없습니다`);
                    setMusicAnalysis(null);
                    return;
                }

                // 음악 상세 정보 API 호출: /api/v1/{music_id}/
                const detailUrl = `${API_BASE}/${musicId}/`;
                console.log(`[NowPlayingPage] 음악 상세 API 호출:`, detailUrl);

                const res = await fetch(detailUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    console.warn(`[NowPlayingPage] 음악 상세 API 오류: ${res.status}`);
                    setMusicAnalysis(null);
                    return;
                }

                const data = await res.json();
                console.log(`[NowPlayingPage] 음악 상세 데이터:`, data);

                // valence와 arousal 값 추출 (문자열로 제공되므로 숫자로 변환)
                const valenceRaw = typeof data.valence === "string" ? parseFloat(data.valence) : (typeof data.valence === "number" ? data.valence : 0);
                const arousalRaw = typeof data.arousal === "string" ? parseFloat(data.arousal) : (typeof data.arousal === "number" ? data.arousal : 0);

                // 12를 곱하고 소수점 버림
                const valence = Math.floor(valenceRaw * 12);
                const arousal = Math.floor(arousalRaw * 12);

                console.log(`[NowPlayingPage] ✅ 음악 분석 데이터 로드 성공:`, {
                    valenceRaw,
                    arousalRaw,
                    valence,
                    arousal
                });
                setMusicAnalysis({ valence, arousal });

                // 커버 이미지 정보 저장 (우선순위: image_large_square → image_square → album_image)
                setMusicDetail({
                    image_large_square: data.image_large_square || null,
                    image_square: data.image_square || null,
                    album_image: data.album_image || null,
                });
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                console.error(`[NowPlayingPage] ❌ 음악 분석 데이터 로드 실패:`, err);
                setMusicAnalysis(null);
            }
        })();

        return () => controller.abort();
    }, [current, API_BASE]);

    // ✅ 재생 로그 데이터 가져오기 (시간대별 재생횟수)
    useEffect(() => {
        if (!current || !API_BASE) {
            setPlayLogs([]);
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                setPlayLogsLoading(true);

                // ⚠️ current.musicId는 itunes_id일 수 있으므로 무조건 검색으로 실제 music_id를 찾음
                let musicId: number | null = null;

                {
                    // current.id가 itunes_id일 수 있으므로, music_id를 찾아야 함
                    const itunesId = Number(current.id);
                    if (Number.isNaN(itunesId)) {
                        console.warn(`[NowPlayingPage] 재생 로그 API 호출 실패: current.id가 숫자가 아닙니다.`, current.id);
                        setPlayLogs([]);
                        return;
                    }

                    // 1) 제목으로 검색해서 itunes_id 매칭 시도
                    try {
                        const searchUrl = `${API_BASE}/search?q=${encodeURIComponent(current.title)}`;
                        const searchRes = await fetch(searchUrl, {
                            method: "GET",
                            signal: controller.signal,
                            headers: { "Content-Type": "application/json" },
                        });

                        if (searchRes.ok) {
                            const searchData = (await searchRes.json()) as SearchApiResponse;
                            const matchedResult = searchData.results?.find((r) => r.itunes_id === itunesId);

                            if (matchedResult?.music_id) {
                                musicId = matchedResult.music_id ?? null;
                            } else if (matchedResult?.album_id) {
                                // 2) music_id가 없으면 앨범 API를 통해 찾기
                                try {
                                    const albumRes = await fetch(`${API_BASE}/albums/${matchedResult.album_id}/`, {
                                        method: "GET",
                                        signal: controller.signal,
                                        headers: { "Content-Type": "application/json" },
                                    });

                                    if (albumRes.ok) {
                                        const albumData = (await albumRes.json()) as AlbumDetailResponse;
                                        const matchedTrack = albumData.tracks?.find(
                                            (t) => t.music_name === current.title
                                        );
                                        if (matchedTrack?.music_id) {
                                            musicId = matchedTrack.music_id ?? null;
                                        }
                                    }
                                } catch (err) {
                                    if (err instanceof DOMException && err.name === "AbortError") return;
                                    console.warn(`[NowPlayingPage] 앨범 API 호출 실패:`, err);
                                }
                            }
                        }
                    } catch (err) {
                        if (err instanceof DOMException && err.name === "AbortError") return;
                        console.warn(`[NowPlayingPage] 검색 API 호출 실패:`, err);
                    }

                    // 3) 여전히 못 찾으면 "아티스트 + 제목" 조합 검색
                    if (!musicId) {
                        try {
                            const combinedSearch = `${current.artist} ${current.title}`;
                            const combinedSearchUrl = `${API_BASE}/search?q=${encodeURIComponent(combinedSearch)}`;

                            const combinedSearchRes = await fetch(combinedSearchUrl, {
                                method: "GET",
                                signal: controller.signal,
                                headers: { "Content-Type": "application/json" },
                            });

                            if (combinedSearchRes.ok) {
                                const combinedSearchData = (await combinedSearchRes.json()) as SearchApiResponse;
                                const matched = combinedSearchData.results?.find(
                                    (r) => r.artist_name === current.artist && r.music_name === current.title
                                );
                                if (matched?.music_id) {
                                    musicId = matched.music_id ?? null;
                                }
                            }
                        } catch (err) {
                            if (err instanceof DOMException && err.name === "AbortError") return;
                            console.warn(`[NowPlayingPage] 조합 검색 API 호출 실패:`, err);
                        }
                    }
                }

                if (!musicId) {
                    console.warn(`[NowPlayingPage] ⚠️ music_id를 찾을 수 없어 재생 로그를 불러올 수 없습니다`);
                    setPlayLogs([]);
                    return;
                }

                // 재생 로그 API 호출: /api/v1/playlogs/{music_id}/
                const playLogsUrl = `${API_BASE}/playlogs/${musicId}/`;
                console.log(`[NowPlayingPage] 재생 로그 API 호출:`, playLogsUrl);

                const res = await fetch(playLogsUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        // 404: 재생 로그가 없는 경우 -> 빈 배열
                        setPlayLogs([]);
                        return;
                    }
                    console.warn(`[NowPlayingPage] 재생 로그 API 오류: ${res.status}`);
                    setPlayLogs([]);
                    return;
                }

                const data = await res.json();
                console.log(`[NowPlayingPage] 재생 로그 데이터:`, data);

                // API 응답 형식에 따라 데이터 변환
                // 예상 형식: { playlogs: [{ hour: "05:30", count: 5 }, ...] } 또는 배열
                // API 응답 아이템 타입 정의
                interface PlayLogItem {
                    played_at?: string;
                    user_id?: number;
                    // 기존 호환성 유지
                    hour?: string;
                    time?: string;
                    timestamp?: string;
                    count?: number;
                    play_count?: number;
                }

                // API 응답 형식에 따라 데이터 변환
                let rawLogs: PlayLogItem[] = [];

                if (Array.isArray(data)) {
                    rawLogs = data;
                } else if (data.playlogs && Array.isArray(data.playlogs)) {
                    rawLogs = data.playlogs;
                } else if (data.data && Array.isArray(data.data)) {
                    rawLogs = data.data;
                }

                // 오늘 날짜 기준으로 설정
                const targetDate = new Date();
                targetDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);

                // 2시간 간격 슬롯 초기화 (00:00 ~ 22:00)
                const timeSlots: { [key: string]: number } = {};
                for (let h = 0; h < 24; h += 2) {
                    const slot = `${String(h).padStart(2, '0')}:00`;
                    timeSlots[slot] = 0;
                }

                rawLogs.forEach((item) => {
                    // 1. played_at이 있는 경우 (개별 로그 집계)
                    if (item.played_at) {
                        const date = new Date(item.played_at);
                        // 타겟 날짜(27일)에 해당하는 데이터만 필터링
                        if (date >= targetDate && date < nextDay) {
                            const hour = date.getHours();
                            const roundedHour = Math.floor(hour / 2) * 2;
                            const slot = `${String(roundedHour).padStart(2, '0')}:00`;
                            if (timeSlots[slot] !== undefined) {
                                timeSlots[slot] += 1;
                            }
                        }
                    }
                    // 2. 기존 로직 (이미 집계된 데이터인 경우)
                    else {
                        const timeStr = item.hour || item.time || item.timestamp || "";
                        const count = item.count || item.play_count || 0;

                        if (timeStr) {
                            const [hourStr] = timeStr.split(':');
                            const hour = parseInt(hourStr, 10);
                            if (!isNaN(hour)) {
                                const roundedHour = Math.floor(hour / 2) * 2;
                                const slot = `${String(roundedHour).padStart(2, '0')}:00`;
                                if (timeSlots[slot] !== undefined) {
                                    timeSlots[slot] += count;
                                }
                            }
                        }
                    }
                });

                // 최종 데이터 배열 생성
                const logs = Object.entries(timeSlots)
                    .map(([time, count]) => ({ time, count }))
                    .sort((a, b) => {
                        const [hourA] = a.time.split(':').map(Number);
                        const [hourB] = b.time.split(':').map(Number);
                        return hourA - hourB;
                    });

                console.log(`[NowPlayingPage] ✅ 재생 로그 데이터 로드 성공:`, logs.length, '개');
                console.log(`[NowPlayingPage] 재생 로그 데이터 상세:`, logs);
                setPlayLogs(logs);
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                console.error(`[NowPlayingPage] ❌ 재생 로그 로드 실패:`, err);
                setPlayLogs([]);
            } finally {
                setPlayLogsLoading(false);
            }
        })();

        return () => controller.abort();
    }, [current, API_BASE]);

    // ✅ 좌 패널 상태
    const [leftOpen, setLeftOpen] = useState(false); // 분석 대시보드
    const [rightOpen, setRightOpen] = useState(false); // 재생목록

    // ✅ 좋아요 상태
    const [musicId, setMusicId] = useState<number | null>(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [likeLoading, setLikeLoading] = useState(false);
    
    // ✅ 현재 곡의 musicId (트랙이 바뀔 때만 바뀌는 값)
    const currentMusicId = (current as { musicId?: number | null } | null)?.musicId ?? null;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!currentMusicId) {
                setMusicId(null);
                setLiked(false);
                setLikeCount(0);
                return;
            }

            // 2) musicId 확정
            setMusicId(currentMusicId);

            // 3) 좋아요 상태/카운트 GET
            try {
                const data = await likecount(currentMusicId);
                if (cancelled) return;

                setLikeCount(data.like_count ?? 0);
                setLiked(!!data.is_liked);
            } catch (e) {
                console.warn("[NowPlayingPage] likecount(GET) 실패:", e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentMusicId]);

    // ✅ toggleLike: POST/DELETE + 응답값으로 상태 갱신
    const toggleLike = async () => {
        const id = currentMusicId; // ✅ track 바뀔 때 갱신되는 값 사용
        if (!id || likeLoading) return;

        const wasLiked = liked; // ✅ 클릭 순간의 프론트 상태 스냅샷
        setLikeLoading(true);

        console.log("LIKE CLICK", { id, liked: wasLiked, likeCount });

        try {
            if (wasLiked) {
                // ✅ 이미 좋아요 상태면 → 취소(DELETE)
                const del = await deleteTrack(id);
                console.log("UNLIKE RES(DELETE)", del);

                // ✅ 서버가 확정해준 상태로 동기화
                setLiked(!!del?.is_liked); // 보통 false
            } else {
                // ✅ 좋아요 아닌 상태면 → 등록(POST)
                const post = await likeTrack(id);
                console.log("LIKE RES(POST)", post);

                // ✅ 서버가 확정해준 상태로 동기화
                setLiked(!!post?.is_liked); // 보통 true
            }

            // ✅ like_count는 GET으로 최종 동기화
            const fresh = await likecount(id);
            console.log("LIKE AFTER(GET)", fresh);

            setLikeCount(Number(fresh?.like_count ?? 0) || 0);
        } catch (e) {
            if (axios.isAxiosError(e)) {
                console.warn("[NowPlayingPage] toggleLike 실패:", e.response?.status, e.response?.data);
            } else {
                console.warn("[NowPlayingPage] toggleLike 실패:", e);
            }
        } finally {
            setLikeLoading(false);
        }
    };

    const shownLikeCount = Number.isFinite(likeCount) ? likeCount : 0;

    const [tab, setTab] = useState<"queue" | "history">("queue");
    const list = useMemo(() => (tab === "queue" ? queue : history), [tab, queue, history]);

    // ✅ push 레이아웃
    const LEFT_W = 1040;
    const RIGHT_W = 400;

    const leftShift = leftOpen ? LEFT_W : 0;
    const rightShift = rightOpen ? RIGHT_W : 0;

    const toggleLeft = () => {
        setLeftOpen((v) => {
            const next = !v;
            if (next) setRightOpen(false);
            return next;
        });
    };

    const toggleRight = () => {
        setRightOpen((v) => {
            const next = !v;
            if (next) setLeftOpen(false);
            return next;
        });
    };

    // ✅ 드래그앤드롭(핸들만 드래그)
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => (e: DragEvent<HTMLElement>) => {
        setDragIndex(index);
        setOverIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
    };

    const handleDragEnter = (index: number, isQueue: boolean) => () => {
        if (!isQueue) return;
        if (dragIndex === null) return;
        setOverIndex(index);
    };

    const handleDragOver = (index: number, isQueue: boolean) => (e: DragEvent<HTMLElement>) => {
        if (!isQueue) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverIndex(index);
    };

    const handleDrop = (index: number, isQueue: boolean) => (e: DragEvent<HTMLElement>) => {
        if (!isQueue) return;
        e.preventDefault();

        const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
        const to = index;

        if (Number.isFinite(from) && from !== to) {
            moveQueueItem(from, to);
        }

        setDragIndex(null);
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setOverIndex(null);
    };

    const handleStartStation = () => {
        if (!current) return;
    };

    return (
        <div className="relative h-full w-full text-[#F6F6F6] overflow-hidden">

            {/* 좌측 대시보드 */}
            <aside
                className="absolute left-0 top-0 h-full bg-white/[0.03] backdrop-blur-2xl border-r border-white/10 transition-transform duration-300 ease-out flex flex-col z-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
                style={{
                    width: LEFT_W,
                    transform: leftOpen ? "translateX(0)" : `translateX(-${LEFT_W}px)`,
                }}
            >
                <div className="mt-12 h-16 px-4 flex items-center justify-between border-b border-white/10">
                    <div className="px-4 text-sm font-bold text-white/90 tracking-wide">음악 분석</div>
                    <button
                        type="button"
                        onClick={toggleLeft}
                        className="p-2 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"
                        aria-label="대시보드 닫기"
                    >
                        <MdClose size={18} />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                    {/* 감정 분석 카드 */}
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-xl">
                        <div className="text-base font-bold text-white/90 mb-4 tracking-wide">감정 분석</div>

                        {musicAnalysis ? (
                            <div className="flex items-center justify-around gap-8 py-6">
                                {/* Valence (긍정/부정) 원형 */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                                            {/* 배경 원 */}
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.08)"
                                                strokeWidth="10"
                                            />
                                            {/* 프로그레스 원 */}
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="url(#valenceGradient)"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 62}
                                                strokeDashoffset={2 * Math.PI * 62 * (1 - musicAnalysis.valence / 100)}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                            {/* 그라데이션 정의 */}
                                            <defs>
                                                <linearGradient id="valenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#AFDEE2" />
                                                    <stop offset="100%" stopColor="#7EC8CC" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        {/* 중앙 텍스트 */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-3xl font-black text-[#AFDEE2] tabular-nums">{musicAnalysis.valence}</div>
                                            <div className="text-xs text-white/50 font-medium">%</div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-white/80 font-semibold">Valence</div>
                                        <div className="text-xs text-white/50 mt-1">긍정도</div>
                                    </div>
                                </div>

                                {/* Arousal (에너지) 원형 */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                                            {/* 배경 원 */}
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.08)"
                                                strokeWidth="10"
                                            />
                                            {/* 프로그레스 원 */}
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="url(#arousalGradient)"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 62}
                                                strokeDashoffset={2 * Math.PI * 62 * (1 - musicAnalysis.arousal / 100)}
                                                className="transition-all duration-1000 ease-out"
                                            />
                                            {/* 그라데이션 정의 */}
                                            <defs>
                                                <linearGradient id="arousalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#E4524D" />
                                                    <stop offset="100%" stopColor="#C43E3A" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        {/* 중앙 텍스트 */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-3xl font-black text-[#E4524D] tabular-nums">{musicAnalysis.arousal}</div>
                                            <div className="text-xs text-white/50 font-medium">%</div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-white/80 font-semibold">Arousal</div>
                                        <div className="text-xs text-white/50 mt-1">에너지</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-around gap-8 py-6">
                                {/* Valence (긍정/부정) 원형 - 기본값 0 */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.08)"
                                                strokeWidth="10"
                                            />
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="url(#valenceGradient)"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 62}
                                                strokeDashoffset={2 * Math.PI * 62}
                                            />
                                            <defs>
                                                <linearGradient id="valenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#AFDEE2" />
                                                    <stop offset="100%" stopColor="#7EC8CC" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-3xl font-black text-[#AFDEE2] tabular-nums">0</div>
                                            <div className="text-xs text-white/50 font-medium">%</div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-white/80 font-semibold">Valence</div>
                                        <div className="text-xs text-white/50 mt-1">긍정도</div>
                                    </div>
                                </div>

                                {/* Arousal (에너지) 원형 - 기본값 0 */}
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.08)"
                                                strokeWidth="10"
                                            />
                                            <circle
                                                cx="70"
                                                cy="70"
                                                r="62"
                                                fill="none"
                                                stroke="url(#arousalGradient)"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                                strokeDasharray={2 * Math.PI * 62}
                                                strokeDashoffset={2 * Math.PI * 62}
                                            />
                                            <defs>
                                                <linearGradient id="arousalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#E4524D" />
                                                    <stop offset="100%" stopColor="#C43E3A" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="text-3xl font-black text-[#E4524D] tabular-nums">0</div>
                                            <div className="text-xs text-white/50 font-medium">%</div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-white/80 font-semibold">Arousal</div>
                                        <div className="text-xs text-white/50 mt-1">에너지</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* 시간대별 재생횟수 차트 카드 */}
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-xl">
                        <div className="text-base font-bold text-white/90 mb-4 tracking-wide">시간대별 재생횟수</div>
                        {playLogsLoading ? (
                            <div className="h-[200px] flex items-center justify-center text-white/50 text-sm">로딩 중...</div>
                        ) : playLogs.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-white/50 text-sm">재생 기록이 없습니다</div>
                        ) : (
                            <div className="w-full" style={{ height: '400px', minHeight: '400px', position: 'relative' }}>
                                <ResponsiveContainer>
                                    <AreaChart data={playLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#AFDEE2" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#AFDEE2" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                        <XAxis
                                            dataKey="time"
                                            stroke="rgba(255,255,255,0.3)"
                                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                                            tickLine={false}
                                            axisLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.3)"
                                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={[0, 10]}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(20, 20, 20, 0.9)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                color: '#fff',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ color: '#fff', fontSize: '13px' }}
                                            labelStyle={{ color: '#AFDEE2', fontSize: '12px', marginBottom: '4px' }}
                                            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#AFDEE2"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorCount)"
                                            activeDot={{ r: 6, fill: '#AFDEE2', stroke: '#fff', strokeWidth: 2 }}
                                            dot={{ r: 4, fill: '#2d2d2d', stroke: '#AFDEE2', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* 우측 재생목록 */}
            <aside
                className="absolute right-0 top-0 h-full bg-white/[0.03] backdrop-blur-2xl border-l border-white/10 transition-transform duration-300 ease-out flex flex-col z-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
                style={{
                    width: RIGHT_W,
                    transform: rightOpen ? "translateX(0)" : `translateX(${RIGHT_W}px)`,
                }}
            >
                <div className="mt-12 h-16 px-4 flex items-center justify-between border-b border-white/10">
                    <div className="px-4 text-sm font-bold text-white/90 tracking-wide">재생목록</div>
                    <button
                        type="button"
                        onClick={toggleRight}
                        className="p-2 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"
                        aria-label="재생목록 닫기"
                    >
                        <MdClose size={18} />
                    </button>
                </div>

                <div className="flex-1 min-h-0 px-4 pt-4 flex flex-col">
                    {/* 탭 */}
                    <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-lg">
                        <button
                            type="button"
                            onClick={() => setTab("queue")}
                            className={[
                                "py-2.5 text-sm font-medium transition",
                                tab === "queue" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5",
                            ].join(" ")}
                        >
                            재생 대기
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("history")}
                            className={[
                                "py-2.5 text-sm font-medium transition",
                                tab === "history" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5",
                            ].join(" ")}
                        >
                            재생 기록
                        </button>
                    </div>

                    <div className="mt-4 border-t border-white/10 flex-shrink-0" />

                    {/* 리스트 */}
                    <div className="mt-2 pb-6 flex-1 min-h-0 overflow-y-auto">
                        {list.length === 0 ? (
                            <div className="mt-10 text-sm text-white/45 text-center">
                                {tab === "queue" ? "재생 대기 목록이 비어있어요" : "재생 기록이 없어요"}
                            </div>
                        ) : (
                            <div className="divide-y divide-white/10 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-lg">
                                {list.map((t, i) => {
                                    const isQueue = tab === "queue";

                                    return (
                                        <div
                                            key={t.id}
                                            onDragEnter={handleDragEnter(i, isQueue)}
                                            onDragOver={handleDragOver(i, isQueue)}
                                            onDrop={handleDrop(i, isQueue)}
                                            onDoubleClick={() => {
                                                if (isQueue) {
                                                    setTrackAndPlay(t);
                                                }
                                            }}
                                            className={[
                                                "w-full transition",
                                                "hover:bg-white/5",
                                                isQueue ? "select-none cursor-pointer" : "",
                                                overIndex === i && dragIndex !== null && dragIndex !== i
                                                    ? "bg-white/10 outline outline-1 outline-white/15"
                                                    : "",
                                                dragIndex === i ? "opacity-60" : "",
                                            ].join(" ")}
                                        >
                                            <div className="grid grid-cols-[28px_44px_1fr_auto] items-center gap-3 px-3 py-3">
                                                <div className="flex items-center justify-center text-white/40">
                                                    {isQueue ? (
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            draggable
                                                            onDragStart={handleDragStart(i)}
                                                            onDragEnd={handleDragEnd}
                                                            onMouseDown={(ev) => ev.stopPropagation()}
                                                            onClick={(ev) => ev.stopPropagation()}
                                                            className="cursor-grab active:cursor-grabbing"
                                                            aria-label="드래그로 순서 변경"
                                                            title="드래그로 순서 변경"
                                                        >
                                                            <MdDragIndicator size={20} />
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {/* 앨범 이미지 */}
                                                <div className="h-10 w-10 rounded-xl bg-white/20 border border-white/10 overflow-hidden relative flex-shrink-0">
                                                    {t.coverUrl ? (
                                                        <>
                                                            <img
                                                                src={processImageUrl(t.coverUrl) || undefined}
                                                                alt={t.title}
                                                                className="w-full h-full object-cover relative z-10"
                                                                onError={(ev) => {
                                                                    (ev.currentTarget as HTMLImageElement).style.display = "none";
                                                                }}
                                                                loading="lazy"
                                                            />
                                                            <div className="absolute inset-0 bg-white/20 animate-pulse z-0" />
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full bg-white/20" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold truncate">{t.title}</div>
                                                    <div className="text-xs text-white/60 truncate">{t.artist}</div>
                                                </div>

                                                {/* 큐 탭에서만 삭제 */}
                                                {isQueue ? (
                                                    <button
                                                        type="button"
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            removeFromQueue(t.id);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-white/10 transition"
                                                        aria-label="대기 목록에서 삭제"
                                                        title="대기 목록에서 삭제"
                                                    >
                                                        <MdDelete size={18} className="text-white/75" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* 본문 */}
            <div className="h-full relative">
                {/* 좌측 사이드 버튼 (Dashboard) */}
                {!leftOpen && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20">
                        <button
                            type="button"
                            onClick={toggleLeft}
                            className="w-10 h-24 rounded-r-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 border-l-0 flex items-center justify-center transition-all hover:bg-white/[0.08] shadow-lg text-white/30 hover:text-white"
                            aria-label="분석 대시보드 토글"
                        >
                            <RiDashboardFill size={20} />
                        </button>
                    </div>
                )}

                {/* 우측 사이드 버튼 (Queue) */}
                {!rightOpen && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
                        <button
                            type="button"
                            onClick={toggleRight}
                            className="w-10 h-24 rounded-l-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 border-r-0 flex items-center justify-center transition-all hover:bg-white/[0.08] shadow-lg text-white/30 hover:text-white"
                            aria-label="재생목록 토글"
                        >
                            <MdQueueMusic size={22} />
                        </button>
                    </div>
                )}

                {/* 상단 우측 버튼 세트 (Like, Station, Contract) */}
                <div className="absolute right-8 top-6 z-20 flex items-center gap-5">
                    <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); toggleLike(); }}
                        className={[
                            "flex items-center gap-2 transition hover:opacity-80",
                            liked ? "text-[#AFDEE2]" : "text-white/60"
                        ].join(" ")}
                        title="좋아요"
                    >
                        <MdFavorite size={24} />
                        <span className="text-sm font-bold tabular-nums">{shownLikeCount.toLocaleString()}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleStartStation}
                        className="text-white/60 hover:text-white transition"
                        title="스테이션 시작"
                    >
                        <MdAutoAwesome size={24} />
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="text-white/60 hover:text-white transition"
                        title="축소하기"
                    >
                        <GrContract size={20} />
                    </button>
                </div>

                <div
                    className="h-full transition-all duration-300 ease-out"
                    style={{ marginLeft: leftShift, marginRight: rightShift }}
                >
                    <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
                        <div className="w-full max-w-[860px] flex flex-col items-center gap-6">
                            <div className="relative">
                                {hasTrack && (
                                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 820, height: 240, opacity: 0.75, zIndex: 0 }}>
                                        <div className="w-full h-full flex items-end justify-center gap-[10px]">
                                            {Array.from({ length: 26 }).map((_, i) => {
                                                const eqActive = hasTrack && isPlaying;
                                                const dur = 1.6 + (i % 7) * 0.18;
                                                const delay = (i % 11) * 0.07;
                                                return (
                                                    <div key={`${playSeq}-${i}`} className="np-eq-bar rounded-full" style={{ width: 12, height: 60 + (i % 6) * 28, background: "rgba(255,255,255,0.28)", animation: eqActive ? `np-eq-calm ${dur}s ease-in-out infinite` : "none", animationDelay: `${delay}s`, transform: eqActive ? undefined : "scaleY(0.22)", opacity: eqActive ? 0.55 : 0.25, transition: "transform 0.25s ease, opacity 0.25s ease" }} />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="w-[380px] aspect-square rounded-[40px] bg-white/10 overflow-hidden relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10">
                                    {hasTrack && coverImage ? (
                                        <img src={coverImage} alt={current.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-white/20 font-black tracking-tighter text-4xl uppercase">No Cover</span></div>
                                    )}
                                </div>
                            </div>

                            <div className="min-w-0 text-center space-y-2 mt-4">
                                <div className="text-3xl font-black text-white truncate tracking-tight drop-shadow-xl">{hasTrack ? current.title : "재생 중인 곡이 없어요"}</div>
                                <div className="text-lg font-medium text-white/40 truncate tracking-wide">{hasTrack ? current.artist : "—"}</div>
                            </div>

                            <button type="button" onClick={() => setLyricsOpen(true)} className="mt-8 px-6 py-2.5 rounded-full bg-white/5 border border-white/5 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all">전체 가사 보기</button>
                        </div>
                    </div>
                </div>

                {/* 기존 하단/사이드 토글 버튼들은 숨김 (사이드 버튼으로 대체됨) */}
            </div>

            {/* Lyrics Full Screen Overlay - 투명하게 꽉 차게 수정 */}
            <div className={["absolute inset-0 z-50 transition-all duration-500 flex flex-col", lyricsOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"].join(" ")}>
                {/* 배경 블러 처리 (메인 배경과 동일한 느낌 유지) */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[80px]" onClick={() => setLyricsOpen(false)} />

                <div className="relative flex-1 flex flex-col h-full">
                    {/* 헤더 */}
                    <div className="h-20 px-10 flex items-center justify-between border-b border-white/5">
                        <div className="min-w-0">
                            <div className="text-lg font-bold text-white/90 truncate">가사</div>
                            <div className="text-sm text-white/50 truncate">{hasTrack ? `${current.title} · ${current.artist}` : "—"}</div>
                        </div>
                        <button onClick={() => setLyricsOpen(false)} className="p-3 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"><MdClose size={28} /></button>
                    </div>

                    {/* 가사 본문 - 중앙 정렬 및 폰트 크기 확대 */}
                    <div className="flex-1 overflow-y-auto px-10 py-20 no-scrollbar">
                        {lyricsLoading ? (
                            <div className="flex items-center justify-center h-full text-white/40">가사를 불러오는 중...</div>
                        ) : lyricsError ? (
                            <div className="flex items-center justify-center h-full text-white/40">{lyricsError}</div>
                        ) : lyrics.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-white/40">가사가 없습니다.</div>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-10 text-center">
                                {lyrics.map((line, i) => (
                                    <div key={`${line.t}-${i}`} className="text-3xl font-bold text-white/80 hover:text-white transition-colors cursor-default leading-relaxed">
                                        {line.text}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 하단 컨트롤 바 - 투명하게 배치 */}
                    <div className="p-10 bg-gradient-to-t from-black/40 to-transparent">
                        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
                            <div className="flex items-center gap-10">
                                <button onClick={shuffleQueue} className="text-white/40 hover:text-white transition"><MdShuffle size={24} /></button>
                                <button onClick={previousTrack} className="text-white/60 hover:text-white transition"><MdSkipPrevious size={36} /></button>
                                <button onClick={toggle} className="h-16 w-16 rounded-full bg-[#E4524D] text-white flex items-center justify-center hover:scale-105 transition shadow-xl">
                                    {isPlaying ? <MdPause size={36} /> : <MdPlayArrow size={36} className="ml-1" />}
                                </button>
                                <button onClick={nextTrack} className="text-white/60 hover:text-white transition"><MdSkipNext size={36} /></button>
                                <button onClick={toggleRepeat} className={repeatMode === "one" ? "text-[#AFDEE2]" : "text-white/40 hover:text-white transition"}><MdRepeat size={24} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
