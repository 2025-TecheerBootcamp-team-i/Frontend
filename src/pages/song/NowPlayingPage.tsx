import axios from "axios";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MdFavorite, MdQueueMusic, MdClose, MdDelete, MdDragIndicator, MdPlayArrow } from "react-icons/md";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from "recharts";
import * as D3 from "d3";
import cloud from "d3-cloud";
import "tippy.js/dist/tippy.css";
import "tippy.js/animations/scale.css";
import { RiDashboardFill, RiBarChartLine, RiMusic2Line, RiPriceTag3Line, RiDiscLine, RiAlbumLine } from "react-icons/ri";
import { GrContract } from "react-icons/gr";
import { motion, AnimatePresence } from "framer-motion";
import StarField from "../../components/canvas/StarField";
import { usePlayer } from "../../player/PlayerContext";
import { likecount, likeTrack, deleteTrack } from "../../api/LikedSong";
import { getMusicDetail, getTagGraph } from "../../api/music";
import type { TagGraphItem } from "../../api/music";
import { getRecommendations } from "../../api/recommendation";
import type { RecommendedMusic } from "../../api/recommendation";
import { extractPastelColors, rgbStringToHsl } from "../../utils/color";

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

// ✅ D3 Word Cloud Component (Custom Implementation for React 19 stability)
interface Word extends cloud.Word {
    text: string;
    size: number;
    x?: number;
    y?: number;
    rotate?: number;
}

function SimpleWordCloud({
    words,
    baseColor
}: {
    words: { text: string; value: number }[];
    baseColor: { h: number; s: number; l: number } | null
}) {


    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

    // Resize Observer
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            if (!entries.length) return;
            const { width, height } = entries[0].contentRect;
            setDimensions({ w: width, h: height });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // Draw Chart
    useEffect(() => {
        const node = containerRef.current;
        if (!node || words.length === 0) return;

        const { width, height } = node.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        // Clear
        node.innerHTML = "";

        const svg = D3.select(node).append("svg")
            .attr("width", width)
            .attr("height", height);

        const g = svg.append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        const layout = cloud<Word>()
            .size([width, height])
            .words(words.map((d) => ({ text: d.text, size: d.value })))
            .padding(6) // 글자 간격 조정 (2 -> 6)
            .rotate(() => (~~(Math.random() * 2) * 90))
            .spiral('rectangular') // 더 꽉 차 보이게 배치
            .font("Pretendard")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .fontSize((d: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const val = (d as any).size as number;
                const vals = words.map(w => w.value);
                const max = Math.max(...vals, 1);
                const min = Math.min(...vals, 0);
                const range = max - min;
                const normalized = range === 0 ? 0.5 : (val - min) / range;

                // 더 풍성해보이게 크기 키움 (14~50 -> 16~64)
                return 16 + (normalized * 48);
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on("end", (drawnWords: any[]) => {
                g.selectAll("text")
                    .data(drawnWords)
                    .enter().append("text")
                    .style("font-size", (d) => (d.size || 16) + "px")
                    .style("font-family", "Pretendard")
                    .style("font-weight", (d) => (d.size && d.size > 40) ? "800" : ((d.size && d.size > 24) ? "700" : "500")) // 두께감 조정
                    .style("fill", (d) => {
                        const fontSize = d.size || 16;
                        // 폰트 크기 범위(16~64)에 맞춰 정규화
                        const normalized = (fontSize - 16) / 48;

                        // 1. 앨범에서 추출된 색상이 있고, 채도가 일정 수준 이상인 경우 (유채색 앨범)
                        if (baseColor && baseColor.s >= 20) {
                            const { h, s } = baseColor;
                            // Lightness를 70% ~ 98% 사이로 강제
                            const targetL = 70 + (28 * normalized);
                            // 원래 채도가 있으면 더 쨍하게(최소 50% 보장)
                            const targetS = Math.max(s, 50);

                            return `hsl(${h}, ${targetS}%, ${targetL}%)`;
                        }

                        // 2. 색상이 없거나, 채도가 낮은 경우 (검정/회색/어두운 앨범) -> 무채색(White/Gray)
                        // 기존에는 채도가 낮아도 강제로 40%로 올려버려 핑크/갈색이 되는 문제가 있었음
                        const targetL = 60 + (40 * normalized); // 60% ~ 100%

                        return `hsl(0, 0%, ${targetL}%)`;
                    })
                    .attr("text-anchor", "middle")
                    .attr("transform", (d) => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
                    .text((d) => d.text || "")
                    .style("cursor", "default")
                    .style("opacity", 0)
                    .transition()
                    .duration(600)
                    .style("opacity", 1);
            });

        layout.start();

    }, [words, baseColor, dimensions]);



    return (
        <div ref={containerRef} className="w-full h-full min-h-[0px] overflow-hidden" />
    );
}

let __npHintStyleInjected = false;
function ensureNowPlayingHintStyle() {
    if (__npHintStyleInjected) return;
    __npHintStyleInjected = true;

    const style = document.createElement("style");
    style.setAttribute("data-nowplaying-hint", "true");
    style.innerHTML = `
    @keyframes np-tab-hint {
      0%, 100% { 
        transform: scaleX(1); 
        filter: brightness(1);
      }
      50% { 
        transform: scaleX(1.2); 
        filter: brightness(5);
        }
    }
    .np-tab-hint {
      animation: np-tab-hint 0.9s ease-in-out infinite;
      transform-origin: center;
      will-change: transform;
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


// ✅ Heart Explosion Effect Helper
const triggerHeartExplosion = (x: number, y: number) => {
    const colors = ['#FF4B4B', '#FF8F8F', '#FFC0C0', '#FFFFFF'];
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        particle.style.position = 'fixed';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.transform = 'translate(-50%, -50%) scale(0)';
        document.body.appendChild(particle);

        // Animation
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        const rotation = (Math.random() - 0.5) * 360;

        const animation = particle.animate([
            { transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${0.5 + Math.random()}) rotate(${rotation}deg)`, opacity: 0 }
        ], {
            duration: 800 + Math.random() * 400,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        });

        animation.onfinish = () => particle.remove();
    }
};

export default function NowPlayingPage() {
    ensureNowPlayingEqStyle();
    ensureNowPlayingHintStyle();

    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<"cover" | "vinyl">("cover");
    const [hintTabs, setHintTabs] = useState(true);


    // ✅ 먼저 PlayerContext에서 isPlaying을 꺼내야 함 (순서 중요)
    const {
        current,
        queue,
        history,
        isPlaying,
        removeFromQueue,
        moveQueueItem,
        setTrackAndPlay,
    } = usePlayer();

    const hasTrack = !!current;

    // ✅ 현재 곡의 musicId (트랙이 바뀔 때만 바뀌는 값)
    const currentMusicId = (current as { musicId?: number | null } | null)?.musicId ?? null;

    // ✅ 재생 재시작 시 애니메이션 리셋용
    const [playSeq, setPlaySeq] = useState(0);

    // ✅ (NEW) 확실하게 찾아진 MusicID 상태 (모든 분석 컴포넌트가 공유)
    const [resolvedMusicId, setResolvedMusicId] = useState<number | null>(null);

    useEffect(() => {
        // 곡이 있고 + 재생 시작될 때만 playSeq 증가
        if (hasTrack && isPlaying) setPlaySeq((v) => v + 1);
    }, [hasTrack, isPlaying, current?.id]);

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

    // ✅ (NEW) Music ID Resolution Effect
    // current가 바뀌면 즉시 musicId를 찾아서 resolvedMusicId에 세팅
    useEffect(() => {
        if (!current || !API_BASE) {
            setResolvedMusicId(null);
            return;
        }

        // 1. 이미 musicId가 있는 경우
        const storedMusicId = (current as { musicId?: number | null }).musicId;
        if (storedMusicId && typeof storedMusicId === 'number') {
            setResolvedMusicId(storedMusicId);
            return;
        }

        // 2. 없으면 검색으로 찾기
        const controller = new AbortController();

        (async () => {
            // current.id가 itunes_id일 수 있으므로, music_id를 찾아야 함
            const itunesId = Number(current.id);
            if (Number.isNaN(itunesId)) {
                console.warn(`[NowPlayingPage] ID Resolution: Invalid current.id`, current.id);
                return;
            }

            try {
                // 1) 제목으로 검색
                const searchUrl = `${API_BASE}/search/opensearch?q=${encodeURIComponent(current.title)}`;
                const searchRes = await fetch(searchUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (searchRes.ok) {
                    const searchData = (await searchRes.json()) as SearchApiResponse;
                    const matchedResult = searchData.results?.find((r) => r.itunes_id === itunesId);

                    if (matchedResult?.music_id) {
                        setResolvedMusicId(matchedResult.music_id);
                        return;
                    } else if (matchedResult?.album_id) {
                        // 2) 앨범 API
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
                                    setResolvedMusicId(matchedTrack.music_id);
                                    return;
                                }
                            }
                        } catch { /* ignore */ }
                    }
                }

                // 3) 조합 검색
                const combinedSearch = `${current.artist} ${current.title}`;
                const combinedSearchUrl = `${API_BASE}/search/opensearch?q=${encodeURIComponent(combinedSearch)}`;
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
                        setResolvedMusicId(matched.music_id);
                        return;
                    }
                }

                console.warn(`[NowPlayingPage] Could not resolve music_id for: ${current.title}`);

            } catch (err) {
                if (err instanceof DOMException && err.name === "AbortError") return;
            }
        })();

        return () => controller.abort();

    }, [current, API_BASE]);

    // 이미지 URL 처리 함수
    const processImageUrl = useCallback((url: string | null | undefined): string | null => {
        if (!url) return null;

        const base = import.meta.env.VITE_API_BASE_URL as string | undefined;

        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
            return url;
        }
        if (base && url.startsWith("/")) {
            return `${base.replace("/api/v1", "")}${url} `;
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

    // ✅ 음악 추천 데이터 (4개)
    const [recommendations, setRecommendations] = useState<RecommendedMusic[]>([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);

    // ✅ 태그 데이터 (WordCloud용)
    const [tagGraph, setTagGraph] = useState<TagGraphItem[]>([]);
    const [tagGraphLoading, setTagGraphLoading] = useState(false);

    // ✅ 트리맵(워드클라우드) 동적 색상 상태 (HSL)
    const [treemapBaseColor, setTreemapBaseColor] = useState<{ h: number; s: number; l: number } | null>(null);

    // ✅ WordCloud용 데이터 변환 ({ text, value })
    const words = useMemo(() => {
        return tagGraph.map(item => ({
            text: item.name,
            value: item.size
        }));
    }, [tagGraph]);


    // ✅ Treemap용 데이터에 고유 ID 추가 (더 이상 사용 안 할 수도 있지만 혹시 모를 의존성 위해 남겨둠, 하지만 Treemap 컴포넌트 삭제 시 필요 없음)
    // WordCloud에는 필요 없으므로 일단 둠 (tagGraph만 있으면 됨)

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


    // ✅ (추가) 앨범 커버 색상 추출하여 트리맵에 적용
    useEffect(() => {
        if (!coverImage) {
            setTreemapBaseColor(null);
            return;
        }

        let cancelled = false;

        // 1개만 추출하면 됨 (가장 주요한 색)
        extractPastelColors(coverImage, 1).then(colors => {
            if (cancelled || colors.length === 0) return;

            // 추출된 RGB 문자열을 HSL로 변환
            const hsl = rgbStringToHsl(colors[0]);
            if (hsl) {
                setTreemapBaseColor(hsl);
            }
        });

        return () => { cancelled = true; };
    }, [coverImage]);

    // ✅ 가사 API 호출
    useEffect(() => {
        if (!resolvedMusicId || !API_BASE) {
            setLyrics([]);
            setLyricsError(null);
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                setLyricsLoading(true);
                setLyricsError(null);

                // 가사 API 호출: /api/v1/{music_id}/
                const lyricsUrl = `${API_BASE}/${resolvedMusicId}/`;

                const res = await fetch(lyricsUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    if (res.status === 404) {
                        setLyrics([]);
                        setLyricsError(null);
                        return;
                    }
                    throw new Error(`가사 API 오류: ${res.status}`);
                }

                const data = (await res.json()) as { lyrics?: unknown };
                // ... (Parsing Logic remains same, omitted for brevity but logic is preserved if we just replace the call part)
                // Actually, I need to keep parsing logic.

                let parsedLyrics: LyricLine[] = [];

                if (typeof data.lyrics === "string" && data.lyrics.trim()) {
                    const lines = data.lyrics.split(/\r?\n/).filter((line) => line.trim() !== "");
                    parsedLyrics = lines.map((line) => {
                        const timestampMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
                        if (timestampMatch) {
                            const minutes = parseInt(timestampMatch[1], 10);
                            const seconds = parseInt(timestampMatch[2], 10);
                            const centiseconds = parseInt(timestampMatch[3], 10);
                            const timestampSeconds = minutes * 60 + seconds + centiseconds / 100;
                            const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]\s*/, "").trim();
                            return { t: timestampSeconds, text: text || line.trim(), timestamp: timestampMatch[0] };
                        }
                        return { t: 0, text: line.trim(), timestamp: null };
                    });

                    parsedLyrics = parsedLyrics.filter((l) => l.text.trim() !== "").sort((a, b) => a.t - b.t);
                    setLyrics(parsedLyrics);
                } else {
                    setLyrics([]);
                    setLyricsError(null);
                }

            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === "AbortError") return;
                console.error(`[NowPlayingPage] ❌ 가사 로드 실패:`, err);
                setLyricsError(err instanceof Error ? err.message : "가사를 불러올 수 없습니다.");
                setLyrics([]);
            } finally {
                setLyricsLoading(false);
            }
        })();

        return () => controller.abort();
    }, [resolvedMusicId, API_BASE]);

    // ✅ 음악 분석 데이터 가져오기 (valence, arousal)
    useEffect(() => {
        if (!resolvedMusicId || !API_BASE) {
            setMusicAnalysis(null);
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                // 음악 상세 정보 API 호출: /api/v1/{music_id}/
                const detailUrl = `${API_BASE}/${resolvedMusicId}/`;
                const res = await fetch(detailUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    setMusicAnalysis(null);
                    return;
                }

                const data = await res.json();

                const valenceRaw = typeof data.valence === "string" ? parseFloat(data.valence) : (typeof data.valence === "number" ? data.valence : 0);
                const arousalRaw = typeof data.arousal === "string" ? parseFloat(data.arousal) : (typeof data.arousal === "number" ? data.arousal : 0);

                const valence = Math.floor(valenceRaw * 12);
                const arousal = Math.floor(arousalRaw * 12);

                setMusicAnalysis({ valence, arousal });

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
    }, [resolvedMusicId, API_BASE]);

    // ✅ 재생 로그 데이터 가져오기 (시간대별 재생횟수)
    useEffect(() => {
        if (!resolvedMusicId || !API_BASE) {
            setPlayLogs([]);
            return;
        }

        const controller = new AbortController();

        (async () => {
            try {
                setPlayLogsLoading(true);

                // 재생 로그 API 호출
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const playLogsUrl = `${API_BASE}/playlogs/${resolvedMusicId}/?date=${dateStr}`;

                const res = await fetch(playLogsUrl, {
                    method: "GET",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    setPlayLogs([]);
                    return;
                }

                const data = await res.json();
                // ... (Parsing Logic preserved)
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

                // 당일 기준으로 필터링 (오늘 00:00:00 ~ 내일 00:00:00)
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

                const KST_OFFSET = 9 * 60 * 60 * 1000; // UTC → KST (+9시간)

                rawLogs.forEach((item) => {
                    // 1. played_at이 있는 경우 (개별 로그 집계)
                    if (item.played_at) {
                        // UTC → KST 변환 (+9시간)
                        const utcDate = new Date(item.played_at);
                        const kstDate = new Date(utcDate.getTime() + KST_OFFSET);

                        // 당일에 해당하는 데이터만 필터링
                        if (kstDate >= targetDate && kstDate < nextDay) {
                            const hour = kstDate.getHours();
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
    }, [resolvedMusicId, API_BASE]);

    // ✅ 음악 추천 데이터 가져오기
    useEffect(() => {
        if (!resolvedMusicId) {
            setRecommendations([]);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setRecommendationsLoading(true);
                // limit=4로 요청 (2x2 그리드)
                const data = await getRecommendations(resolvedMusicId, 4);
                if (cancelled) return;

                setRecommendations(data);
            } catch (err) {
                console.error("[NowPlayingPage] 추천 음악 로드 실패:", err);
                if (!cancelled) setRecommendations([]);
            } finally {
                if (!cancelled) setRecommendationsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [resolvedMusicId]);

    // ✅ 태그 그래프 데이터 가져오기 (Treemap용)
    useEffect(() => {
        if (!resolvedMusicId) {
            setTagGraph([]);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                setTagGraphLoading(true);
                const data = await getTagGraph(resolvedMusicId);
                if (cancelled) return;

                setTagGraph(data);
            } catch (err) {
                console.error("[NowPlayingPage] 태그 그래프 로드 실패:", err);
                if (!cancelled) setTagGraph([]);
            } finally {
                if (!cancelled) setTagGraphLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [resolvedMusicId]);

    // ✅ 좌 패널 상태
    const [leftOpen, setLeftOpen] = useState(false); // 분석 대시보드
    const [rightOpen, setRightOpen] = useState(false); // 재생목록
    const [chartsReady, setChartsReady] = useState(false); // 차트 렌더링 준비 상태

    useEffect(() => {
        // 페이지 들어오면 4초 정도만 힌트 주고 자동 종료
        const t = window.setTimeout(() => setHintTabs(false), 1800);
        return () => window.clearTimeout(t);
    }, []);

    // 사용자가 한 번이라도 패널 열면 힌트 즉시 종료
    useEffect(() => {
        if (leftOpen || rightOpen) setHintTabs(false);
    }, [leftOpen, rightOpen]);

    // ✅ 패널이 열릴 때 차트 렌더링 지연 (ResponsiveContainer 크기 문제 해결)
    useEffect(() => {
        if (leftOpen) {
            const timer = setTimeout(() => setChartsReady(true), 100);
            return () => clearTimeout(timer);
        } else {
            setChartsReady(false);
        }
    }, [leftOpen]);

    // ✅ 좋아요 상태
    const [musicId, setMusicId] = useState<number | null>(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [likeLoading, setLikeLoading] = useState(false);
    useEffect(() => {
        void musicId; // 혹은 void musicId; 같은 꼼수
    }, []);


    // ✅ 현재 곡의 musicId definition moved up

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
    const LEFT_W = 1500; // 음악 분석 사이드바 너비 (기존: 1040)
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

    return (
        <div className="relative h-full w-full text-[#F6F6F6] overflow-hidden">
            {/* ✅ Dynamic Star Background */}
            <StarField />

            {/* 좌측 대시보드 */}
            <aside
                className="absolute left-0 top-0 h-full bg-white/[0.03] backdrop-blur-2xl border-r border-white/10 transition-transform duration-300 ease-out flex flex-col z-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
                style={{
                    width: LEFT_W,
                    transform: leftOpen ? "translateX(0)" : `translateX(-${LEFT_W}px)`,
                }}
            >
                <div className="mt-2 h-10 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
                    <div className="text-sm font-bold text-white/90 tracking-wide">음악 분석</div>
                    <button
                        type="button"
                        onClick={toggleLeft}
                        className="p-1.5 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"
                        aria-label="대시보드 닫기"
                    >
                        <MdClose size={16} />
                    </button>
                </div>

                <div className="flex-1 p-4 pb-[100px] overflow-hidden flex flex-col min-h-0">
                    {/* 2x2 그리드 레이아웃 - 상단 공간 줄이고 하단 최대 확보 (fr 단위 사용으로 gap 포함 계산) */}
                    <div className="grid grid-cols-2 gap-3 flex-1 min-h-0" style={{ gridTemplateRows: '3.5fr 6.5fr' }}>
                        {/* 1번: 감정 분석 카드 */}
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 shadow-xl flex flex-col min-h-0">
                            <div className="text-lg font-bold text-white/95 mb-2 tracking-wide">감정 분석</div>

                            {musicAnalysis ? (
                                <div className="flex items-center justify-center gap-40 w-full flex-1">
                                    {/* Valence (긍정/부정) 원형 - 사이즈 확대 (103 -> 128) */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <svg width="128" height="128" viewBox="0 0 210 210" className="transform -rotate-90">
                                                {/* 배경 원 */}
                                                <circle
                                                    cx="105"
                                                    cy="105"
                                                    r="93"
                                                    fill="none"
                                                    stroke="rgba(255,255,255,0.08)"
                                                    strokeWidth="24"
                                                />
                                                {/* 프로그레스 원 */}
                                                <circle
                                                    cx="105"
                                                    cy="105"
                                                    r="93"
                                                    fill="none"
                                                    stroke="url(#valenceGradient)"
                                                    strokeWidth="24"
                                                    strokeLinecap="round"
                                                    strokeDasharray={2 * Math.PI * 93}
                                                    strokeDashoffset={2 * Math.PI * 93 * (1 - musicAnalysis.valence / 100)}
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                                <defs>
                                                    <linearGradient id="valenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#AFDEE2" />
                                                        <stop offset="100%" stopColor="#7EC8CC" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            {/* 중앙 텍스트 - 폰트 사이즈 조절 */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className="text-3xl font-black text-[#AFDEE2] tabular-nums">{musicAnalysis.valence}</div>
                                                <div className="text-sm text-white/60 font-medium">%</div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-base text-white/90 font-semibold">Valence</div>
                                            <div className="text-sm text-white/60">긍정도</div>
                                        </div>
                                    </div>

                                    {/* Arousal (에너지) 원형 - 사이즈 확대 (103 -> 128) */}
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative">
                                            <svg width="128" height="128" viewBox="0 0 210 210" className="transform -rotate-90">
                                                {/* 배경 원 */}
                                                <circle
                                                    cx="105"
                                                    cy="105"
                                                    r="93"
                                                    fill="none"
                                                    stroke="rgba(255,255,255,0.08)"
                                                    strokeWidth="24"
                                                />
                                                {/* 프로그레스 원 */}
                                                <circle
                                                    cx="105"
                                                    cy="105"
                                                    r="93"
                                                    fill="none"
                                                    stroke="url(#arousalGradient)"
                                                    strokeWidth="24"
                                                    strokeLinecap="round"
                                                    strokeDasharray={2 * Math.PI * 93}
                                                    strokeDashoffset={2 * Math.PI * 93 * (1 - musicAnalysis.arousal / 100)}
                                                    className="transition-all duration-1000 ease-out"
                                                />
                                                <defs>
                                                    <linearGradient id="arousalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#E4524D" />
                                                        <stop offset="100%" stopColor="#C43E3A" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            {/* 중앙 텍스트 - 폰트 사이즈 조절 */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <div className="text-3xl font-black text-[#E4524D] tabular-nums">{musicAnalysis.arousal}</div>
                                                <div className="text-sm text-white/60 font-medium">%</div>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-base text-white/90 font-semibold">Arousal</div>
                                            <div className="text-sm text-white/60">에너지</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-white/30 text-sm">분석 데이터 없음</div>
                            )}
                        </div>

                        {/* 2번: 시간대별 재생횟수 차트 카드 */}
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 shadow-xl flex flex-col min-h-0">
                            <div className="text-lg font-bold text-white/95 mb-2 tracking-wide">시간대별 재생횟수</div>
                            {playLogsLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
                                    <RiBarChartLine size={32} className="animate-pulse" />
                                    <div className="text-sm font-medium">데이터를 분석하고 있어요...</div>
                                </div>
                            ) : playLogs.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-3">
                                    <RiBarChartLine size={32} />
                                    <div className="text-sm font-medium">재생 기록이 아직 없어요</div>
                                </div>
                            ) : !chartsReady ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
                                    <RiBarChartLine size={32} className="animate-pulse" />
                                    <div className="text-sm font-medium">차트를 그리고 있어요...</div>
                                </div>
                            ) : (
                                <div className="flex-1 w-full min-h-0 relative">
                                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                        <AreaChart data={playLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#AFDEE2" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#AFDEE2" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                            <XAxis
                                                dataKey="time"
                                                stroke="rgba(255,255,255,0.3)"
                                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                                interval="preserveStartEnd"
                                                height={20}
                                            />
                                            <YAxis
                                                stroke="rgba(255,255,255,0.3)"
                                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={[0, 'auto']}
                                                allowDecimals={false}
                                            />
                                            {/* 바닥 가이드 라인 (데이터가 0일 때 시각적 보조) */}
                                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    padding: '8px 12px'
                                                }}
                                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                                                labelStyle={{ color: '#AFDEE2', fontSize: '11px', marginBottom: '2px' }}
                                                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                stroke="#AFDEE2"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorCount)"
                                                // 데이터가 0이어도 점이 보이도록 항상 dot 표시
                                                dot={{ r: 3, fill: '#AFDEE2', strokeWidth: 0 }}
                                                activeDot={{ r: 5, fill: '#fff', stroke: '#AFDEE2', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* 3번: 유사 음악 (4개, 2x2 그리드) */}
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 shadow-xl flex flex-col overflow-hidden relative min-h-0">
                            <div className="text-lg font-bold text-white/95 mb-2 tracking-wide z-10 relative">유사 음악</div>

                            {recommendationsLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
                                    <RiMusic2Line size={32} className="animate-pulse" />
                                    <div className="text-sm font-medium">비슷한 곡을 찾고 있어요...</div>
                                </div>
                            ) : recommendations.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-3">
                                    <RiMusic2Line size={32} />
                                    <div className="text-sm font-medium">추천할 곡이 없어요</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1 min-h-0">
                                    {recommendations.slice(0, 4).map((rec) => {
                                        // 데이터 필드 정규화
                                        const imageUrl = processImageUrl(
                                            rec.album?.album_image ||
                                            rec.image_square ||
                                            rec.album_image
                                        );
                                        const title = rec.music_name;
                                        const artist = rec.artist?.artist_name || rec.artist_name || "Unknown Artist";

                                        return (
                                            <button
                                                key={rec.music_id}
                                                type="button"
                                                onClick={async () => {
                                                    // 음악 상세 정보 가져오기
                                                    const detail = await getMusicDetail(rec.music_id);

                                                    if (detail) {
                                                        // 상세 정보로 트랙 재생
                                                        setTrackAndPlay({
                                                            id: detail.music_id,
                                                            title: detail.music_name,
                                                            artist: detail.artist_name || artist,
                                                            coverUrl: processImageUrl(
                                                                detail.image_large_square ||
                                                                detail.image_square ||
                                                                detail.album_image
                                                            ) || imageUrl || "",
                                                            audioUrl: detail.audio_url || "",
                                                            musicId: detail.music_id
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        } as any);
                                                    } else {
                                                        // 상세 정보 실패 시 기존 데이터로 재생
                                                        setTrackAndPlay({
                                                            id: rec.music_id,
                                                            title: title,
                                                            artist: artist,
                                                            coverUrl: imageUrl || "",
                                                            musicId: rec.music_id
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        } as any);
                                                    }
                                                }}
                                                className="relative group rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                                            >
                                                {/* 배경 이미지 */}
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={rec.music_name}
                                                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                                )}

                                                {/* 텍스트 오버레이 */}
                                                <div className="absolute inset-0 p-3 flex flex-col justify-end text-left bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                                                    <div className="text-base font-bold text-white truncate drop-shadow-md">{rec.music_name}</div>
                                                    <div className="text-sm text-white/80 truncate drop-shadow-md">{rec.artist_name}</div>
                                                </div>

                                                {/* 호버 시 재생 아이콘 */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                                                        <MdPlayArrow size={30} className="text-white" />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 4번: 태그 그래프 (Treemap) */}
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 shadow-xl flex flex-col overflow-hidden flex-1 min-h-0">
                            <div className="text-lg font-bold text-white/95 mb-2 tracking-wide">태그 분석</div>

                            {tagGraphLoading ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
                                    <RiPriceTag3Line size={32} className="animate-pulse" />
                                    <div className="text-sm font-medium">태그를 읽어오고 있어요...</div>
                                </div>
                            ) : tagGraph.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-3">
                                    <RiPriceTag3Line size={32} />
                                    <div className="text-sm font-medium">분석된 태그가 없어요</div>
                                </div>
                            ) : !chartsReady ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
                                    <RiPriceTag3Line size={32} className="animate-pulse" />
                                    <div className="text-sm font-medium">차트를 준비 중이에요...</div>
                                </div>
                            ) : (
                                <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
                                    <div style={{ width: '100%', height: '100%' }}>
                                        {/* 커스텀 D3 컴포넌트 사용 */}
                                        <SimpleWordCloud
                                            words={words}
                                            baseColor={treemapBaseColor}
                                            // Key를 주어 리랜더링 강제 (데이터 변경 시)
                                            key={`wordcloud-${currentMusicId}-${words.length}-${treemapBaseColor?.h}`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
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
                                            key={`${t.id}-${i}`}
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
                    <div className="absolute left-0 top-1/2 z-20" style={{ transform: "translateY(-50%)" }}>
                        <button
                            type="button"
                            onClick={toggleLeft}
                            className={[
                                "w-20 h-44 rounded-r-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 border-l-0",
                                "flex items-center justify-center transition-all hover:bg-white/[0.08] shadow-lg",
                                leftOpen ? "text-white" : "text-white/30 hover:text-white",
                                // ✅ 힌트: 닫혀있을 때만 커졌다 작아짐
                                hintTabs && !leftOpen ? "np-tab-hint" : "",
                            ].join(" ")}
                            aria-label="분석 대시보드 토글"
                        >
                            <RiDashboardFill size={20} />
                        </button>
                    </div>
                )}

                {/* 우측 사이드 버튼 (Queue) */}
                {!rightOpen && (
                    <div className="absolute right-0 top-1/2 z-20" style={{ transform: "translateY(-50%)" }}>
                        <button
                            type="button"
                            onClick={toggleRight}
                            className={[
                                "w-20 h-44 rounded-l-2xl bg-white/[0.03] backdrop-blur-md border border-white/5 border-r-0",
                                "flex items-center justify-center transition-all hover:bg-white/[0.08] shadow-lg",
                                rightOpen ? "text-white" : "text-white/30 hover:text-white",
                                // ✅ 힌트: 닫혀있을 때만 커졌다 작아짐
                                hintTabs && !rightOpen ? "np-tab-hint" : "",
                            ].join(" ")}
                            aria-label="재생목록 토글"
                        >
                            <MdQueueMusic size={22} />
                        </button>
                    </div>
                )}

                <div className="absolute right-8 top-6 z-20 flex items-center gap-5">
                    {/* View Toggle */}
                    <button
                        type="button"
                        onClick={() => setViewMode(v => v === 'cover' ? 'vinyl' : 'cover')}
                        className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition"
                        title={viewMode === 'cover' ? "LP 모드로 보기" : "커버 모드로 보기"}
                    >
                        {viewMode === 'cover' ? <RiDiscLine size={24} /> : <RiAlbumLine size={24} />}
                    </button>

                    <button
                        type="button"
                        onClick={(ev) => {
                            ev.stopPropagation();
                            toggleLike();
                            triggerHeartExplosion(ev.clientX, ev.clientY);
                        }}
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
                            <div className="relative h-[380px] w-full flex justify-center items-center">
                                {hasTrack && (
                                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 820, height: 240, opacity: 0.75, zIndex: 0 }}>
                                        <div className="w-full h-full flex items-end justify-center gap-[10px]">
                                            {Array.from({ length: 35 }).map((_, i) => {
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

                                <AnimatePresence mode="wait">
                                    {viewMode === 'cover' ? (
                                        <motion.div
                                            key="cover"
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            transition={{ type: "spring", duration: 0.5 }}
                                            className="w-[380px] aspect-square rounded-[40px] bg-white/10 overflow-hidden relative z-10 shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10"
                                        >
                                            {hasTrack && coverImage ? (
                                                <img src={coverImage} alt={current.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-white/5"><span className="text-white/20 font-black tracking-tighter text-4xl uppercase">No Cover</span></div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="vinyl"
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.9, opacity: 0 }}
                                            transition={{ type: "spring", duration: 0.5 }}
                                            className="relative z-10"
                                        >
                                            <div className="relative w-[380px] h-[380px]">
                                                {/* Vinyl Disc */}
                                                <motion.div
                                                    className="w-full h-full rounded-full shadow-2xl relative z-10"
                                                    animate={{ rotate: isPlaying ? 360 : 0 }}
                                                    transition={{
                                                        duration: isPlaying ? 3 : 0.6,
                                                        repeat: isPlaying ? Infinity : 0,
                                                        ease: "linear",
                                                    }}
                                                >
                                                    {/* Vinyl Texture */}
                                                    <div className="absolute inset-0 rounded-full bg-[#111] border border-white/10" />
                                                    <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(#111_0,#111_2px,#222_3px)] opacity-50" />

                                                    {/* Start using existing cover image as label */}
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full overflow-hidden border-[8px] border-[#111]">
                                                        {coverImage && <img src={coverImage} alt="label" className="w-full h-full object-cover" />}
                                                    </div>

                                                    {/* Center Hole */}
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#e5e5e5] rounded-full z-20" />
                                                </motion.div>

                                                {/* Tone Arm */}
                                                <div className="absolute -top-[10%] -right-[15%] z-20 w-[180px] h-[240px] pointer-events-none">
                                                    <motion.div
                                                        className="w-full h-full origin-[75%_12.5%]"
                                                        animate={{ rotate: isPlaying ? 25 : 0 }}
                                                        transition={{ type: "spring", stiffness: 40, damping: 10 }}
                                                    >
                                                        <svg width="100%" height="100%" viewBox="0 0 100 120" style={{ overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>
                                                            <circle cx="75" cy="15" r="12" fill="#d4d4d4" stroke="#888" strokeWidth="1" />
                                                            <path d="M75 15 L35 90" stroke="#c0c0c0" strokeWidth="4" strokeLinecap="round" />
                                                            <rect x="25" y="85" width="20" height="28" rx="2" fill="#222" transform="rotate(20 35 90)" />
                                                        </svg>
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                </div>
            </div>
        </div>
    );
}
