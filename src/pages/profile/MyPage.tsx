import { useNavigate, useOutletContext } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";

import { IoChevronBack } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import { MdEdit } from "react-icons/md";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import type { Playlist } from "../../components/layout/MainLayout";

import { fetchUserAiMusic } from "../../api/user";
import {
    fetchUserStatistics,
    fetchTopTracks,
    type UserStatistics,
    type TopTrack,
} from "../../api/user";
import {
    getCurrentUserNickname,
    updateCurrentUserNickname,
    getCurrentUserId,
} from "../../utils/auth";

import { getPlaylistDetail } from "../../api/playlist";

type Profile = {
    name: string;
    avatar?: string;
};

const PROFILE_KEY = "profile";

type LayoutCtx = { playlists: Playlist[] };

type TopRow = {
    id: string;
    rank: number;
    title: string;
    artist: string;
    album: string;
    coverUrl?: string;
    total: number;
};

type HorizontalScrollerProps = {
    children: React.ReactNode;
    scrollStep?: number;
    gradientFromClass?: string;
};

type MyAiPreviewItem = {
    id: string;
    title: string;
    coverUrl?: string;
};

function HorizontalScroller({
    children,
    scrollStep = 300,
    gradientFromClass = "from-[#2d2d2d]",
    }: HorizontalScrollerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const update = () => {
        const el = ref.current;
        if (!el) return;

        const can = el.scrollWidth > el.clientWidth + 1;
        setCanScroll(can);

        if (!can) {
        setShowLeft(false);
        setShowRight(false);
        return;
        }

        const left = el.scrollLeft;
        const max = el.scrollWidth - el.clientWidth;

        setShowLeft(left > 4);
        setShowRight(left < max - 4);
    };

    useEffect(() => {
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative mt-2">
        <div ref={ref} onScroll={update} className="overflow-x-auto overflow-y-hidden no-scrollbar">
            {children}
        </div>

        {canScroll && showLeft && (
            <button
            type="button"
            onClick={() => {
                ref.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
                setTimeout(update, 250);
            }}
            className="
                absolute left-1 top-1/2 -translate-y-1/2 z-10
                h-9 w-9 rounded-full
                bg-[#1d1d1d]/50 text-[#f6f6f6]
                flex items-center justify-center
                hover:bg-[#1d1d1d]/70 transition
                rotate-180
            "
            aria-label="왼쪽으로 이동"
            >
            <MdOutlineNavigateNext size={22} />
            </button>
        )}

        {canScroll && showRight && (
            <button
            type="button"
            onClick={() => {
                ref.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
                setTimeout(update, 250);
            }}
            className="
                absolute right-1 top-1/2 -translate-y-1/2 z-10
                h-9 w-9 rounded-full
                bg-[#1d1d1d]/50 text-[#f6f6f6]
                flex items-center justify-center
                hover:bg-[#1d1d1d]/70 transition
            "
            aria-label="오른쪽으로 이동"
            >
            <MdOutlineNavigateNext size={22} />
            </button>
        )}

        {canScroll && showRight && (
            <div
            className={[
                "pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l to-transparent",
                gradientFromClass,
            ].join(" ")}
            />
        )}
        {canScroll && showLeft && (
            <div
            className={[
                "pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r to-transparent",
                gradientFromClass,
            ].join(" ")}
            />
        )}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCoverFromPlaylistDetailItems(items: any[], limit = 4) {
    const urls = (items ?? [])
        .map((it) => it?.music?.album_image)
        .filter((v): v is string => typeof v === "string" && v.length > 0);

    const unique = Array.from(new Set(urls)).slice(0, limit);
    return { coverUrls: unique, coverUrl: unique[0] ?? null };
}

export default function MyPage() {
    const { playlists } = useOutletContext<LayoutCtx>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<Profile>(() => {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) {
        try {
            return JSON.parse(raw) as Profile;
        } catch {
            // ignore
        }
        }
        return { name: getCurrentUserNickname(), avatar: "" };
    });

    const [editOpen, setEditOpen] = useState(false);
    const [draft, setDraft] = useState<Profile>(profile);

    const openEdit = () => {
        setDraft(profile);
        setEditOpen(true);
    };
    const closeEdit = () => setEditOpen(false);

    useEffect(() => {
        if (!editOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
        document.body.style.overflow = prev;
        };
    }, [editOpen]);

    const saveProfile = () => {
        const newName = draft.name.trim() || getCurrentUserNickname();
        const next = { ...draft, name: newName };

        setProfile(next);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        updateCurrentUserNickname(newName);
        window.dispatchEvent(new CustomEvent("profileUpdated"));

        setEditOpen(false);
    };

    const { setTrackAndPlay } = usePlayer();

    const CURRENT_USER_ID = getCurrentUserId() || "me";

    const [myAiPreview, setMyAiPreview] = useState<MyAiPreviewItem[]>([]);
    const [aiLoading, setAiLoading] = useState(true);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        const loadAiPreview = async () => {
        const userId = getCurrentUserId();
        if (!userId) {
            setAiError("로그인이 필요합니다.");
            setAiLoading(false);
            setMyAiPreview([]);
            return;
        }

        try {
            setAiLoading(true);
            setAiError(null);

            const data = await fetchUserAiMusic(userId);

            const sorted = [...data].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
            });

            const mapped: MyAiPreviewItem[] = sorted.slice(0, 12).map((music) => ({
            id: music.music_id.toString(),
            title: music.music_name || "제목 없음",
            coverUrl: music.album_image_square || undefined,
            }));

            setMyAiPreview(mapped);
        } catch (err) {
            console.error("AI 프리뷰 로드 실패:", err);
            setAiError("AI 생성곡을 불러오는데 실패했습니다.");
            setMyAiPreview([]);
        } finally {
            setAiLoading(false);
        }
        };

        loadAiPreview();
    }, [CURRENT_USER_ID]);

    const [range, setRange] = useState<"month" | "all">("month");

    const [statistics, setStatistics] = useState<UserStatistics | null>(null);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);

    const topRows: TopRow[] = topTracks.map((track) => ({
        id: String(track.music_id),
        rank: track.rank,
        title: track.music_name,
        artist: track.artist_name,
        album: track.album_name,
        coverUrl: track.album_image || undefined,
        total: track.play_count,
    }));

    const toTrack = (r: TopRow): PlayerTrack => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        audioUrl: "/audio/sample.mp3",
        coverUrl: r.coverUrl,
    });

    useEffect(() => {
        const loadData = async () => {
        try {
            const [statsData, tracksData] = await Promise.all([
            fetchUserStatistics(CURRENT_USER_ID, range),
            fetchTopTracks(CURRENT_USER_ID, range, 50),
            ]);
            setStatistics(statsData);
            setTopTracks(tracksData);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        }
        };

        loadData();
    }, [range, CURRENT_USER_ID]);

    const dashboard = statistics
        ? {
            listen: {
            value: `${statistics.listening_time.total_hours.toFixed(1)}시간`,
            sub:
                range === "month"
                ? `지난달 대비 ${statistics.listening_time.change_percent > 0 ? "+" : ""}${statistics.listening_time.change_percent.toFixed(1)}%`
                : `총 재생 횟수: ${statistics.listening_time.play_count}회`,
            },
            genre: {
            value: statistics.top_genres[0]?.genre || "—",
            sub: statistics.top_genres[1] ? `2위: ${statistics.top_genres[1].genre}` : "—",
            },
            ai: {
            value: `${statistics.ai_generation.total_generated}곡`,
            sub:
                statistics.ai_generation.last_generated_days_ago !== null
                ? `최근 생성: ${statistics.ai_generation.last_generated_days_ago}일 전`
                : "생성 기록 없음",
            },
            insight: {
            main1: statistics.top_genres[0]?.genre || "—",
            main2: statistics.top_artists[0]?.artist_name || "—",
            text: range === "month" ? "이번 달은" : "전체 기간 기준으로는",
            },
        }
        : {
            listen: { value: "—", sub: "로딩 중..." },
            genre: { value: "—", sub: "—" },
            ai: { value: "—", sub: "—" },
            insight: { main1: "—", main2: "—", text: range === "month" ? "이번 달은" : "전체 기간 기준으로는" },
        };

    const tabBtn = (key: "month" | "all", label: string) => {
        const active = range === key;
        return (
        <button
            type="button"
            onClick={() => setRange(key)}
            aria-pressed={active}
            className={[
            "py-2 px-4 rounded-full text-base whitespace-nowrap",
            active
                ? "bg-[#E4524D]/80 text-[#f6f6f6] font-semibold scale-105 z-10"
                : "bg-white/20 text-[#F6F6F6] hover:bg-white/[0.08] font-semibold hover:scale-105",
            ].join(" ")}
        >
            {label}
        </button>
        );
    };

    // ✅ MyPage에서도 플레이리스트 cover 모자이크 만들기 (상단 12개만)
    const [playlistCovers, setPlaylistCovers] = useState<
        Record<string, { coverUrls: string[]; coverUrl: string | null }>
    >({});

    useEffect(() => {
        let cancelled = false;

        (async () => {
        try {
            const targets = (playlists ?? []).slice(0, 12);

            const results = await Promise.allSettled(
            targets.map(async (p) => {
                const id = String(p.id);
                const cached = playlistCovers[id];
                if (cached) return [id, cached] as const;

                const detail = await getPlaylistDetail(id);
                const cover = buildCoverFromPlaylistDetailItems(detail.items, 4);
                return [id, cover] as const;
            })
            );

            if (cancelled) return;

            setPlaylistCovers((prev) => {
            const next = { ...prev };
            for (const r of results) {
                if (r.status === "fulfilled") {
                const [id, cover] = r.value;
                next[id] = cover;
                }
            }
            return next;
            });
        } catch (e) {
            console.error("[MyPage] playlist covers fetch 실패:", e);
        }
        })();

        return () => {
        cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playlists]);

    return (
        <div className="w-full h-full flex flex-col">
        <div className="sticky top-0 z-20 pt-2 mb-4">
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={24} />
            </button>
            <h1 className="text-3xl font-bold text-[#F6F6F6]">마이페이지</h1>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="w-full min-w-[1050px] mx-auto">
            <div className="pt-6 grid grid-cols-12 gap-6">
                <section className="col-span-6 space-y-6">
                <div className="space-y-6">
                    <div className="rounded-[40px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-6">
                    <div className="flex items-center gap-6">
                        <div className="w-32 h-32 rounded-full bg-white/10 overflow-hidden shadow-2xl border border-white/20">
                        {profile.avatar ? (
                            <img src={profile.avatar} alt="profile" className="w-full h-full object-cover" />
                        ) : null}
                        </div>
                        <div className="min-w-0 flex flex-col">
                        <div className="text-4xl font-bold text-[#f6f6f6]">{profile.name}</div>
                        <div className="mt-3 text-base text-[#f6f6f6]/80">
                            <button
                            type="button"
                            onClick={openEdit}
                            className="flex items-center gap-1 hover:underline hover:text-[#f6f6f6]/50 transition-colors"
                            >
                            <IoIosSettings size={20} />
                            수정 및 설정
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>

                    <div className="rounded-[40px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-6">
                    <div className="flex items-center justify-between mt-2 mb-3">
                        <div className="px-2 text-3xl font-bold text-[#f6f6f6]">개인 음악 분석 데이터</div>
                        <div className="px-2 flex gap-3">
                        {tabBtn("month", "이번 달")}
                        {tabBtn("all", "전체")}
                        </div>
                    </div>

                    <div className="border-b border-white/10 mb-4" />

                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6">
                        <div className="text-base text-[#f6f6f6]/35">
                            {range === "month" ? "이번 달 청취" : "누적 청취"}
                        </div>
                        <div className="mt-2 text-3xl font-bold text-[#F6F6F6] tabular-nums">
                            {dashboard.listen.value}
                        </div>
                        <div className="mt-2 text-sm text-[#f6f6f6]/25">{dashboard.listen.sub}</div>
                        </div>

                        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6">
                        <div className="text-base text-[#f6f6f6]/35">Top 장르</div>
                        <div className="mt-2 text-3xl font-bold text-[#AFDEE2] tabular-nums">
                            {dashboard.genre.value}
                        </div>
                        <div className="mt-2 text-sm text-[#f6f6f6]/25">{dashboard.genre.sub}</div>
                        </div>

                        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6">
                        <div className="text-base text-[#f6f6f6]/35">AI 생성 활동</div>
                        <div className="mt-2 text-3xl font-bold text-[#F6F6F6] tabular-nums">
                            {dashboard.ai.value}
                        </div>
                        <div className="mt-2 text-sm text-[#f6f6f6]/25">{dashboard.ai.sub}</div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 shadow-xl">
                        <div className="text-base font-semibold text-white/40 mb-3">Top 아티스트</div>

                        <div className="space-y-4">
                            {statistics?.top_artists.slice(0, 3).map((artist) => (
                            <div
                                key={artist.artist_id}
                                className="flex items-center gap-3 group cursor-pointer"
                                onClick={() => navigate(`/artists/${artist.artist_id}`)}
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/10 overflow-hidden shadow-lg group-hover:scale-110 transition-transform duration-300">
                                {artist.artist_image ? (
                                    <img
                                    src={artist.artist_image}
                                    alt={artist.artist_name}
                                    className="w-full h-full object-cover"
                                    />
                                ) : null}
                                </div>

                                <div className="flex-1 min-w-0">
                                <div className="text-base text-[#f6f6f6]/90 truncate group-hover:text-[#AFDEE2] transition-colors">
                                    {artist.rank}. {artist.artist_name}
                                </div>
                                <div className="text-sm text-[#f6f6f6]/30">재생 횟수: {artist.play_count}회</div>
                                </div>

                                <div className="text-base text-center text-[#f6f6f6]/20 tabular-nums whitespace-nowrap">
                                {artist.percentage.toFixed(1)}%
                                </div>
                            </div>
                            ))}
                            {(!statistics || statistics.top_artists.length === 0) && (
                            <div className="text-base text-[#f6f6f6]/80 text-center py-4">데이터 없음</div>
                            )}
                        </div>
                        </div>

                        <div className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 shadow-xl">
                        <div className="text-base font-semibold text-[#f6f6f6]/40 mb-3">분위기/키워드</div>

                        <div className="flex flex-wrap gap-2">
                            {statistics?.top_tags.slice(0, 6).map((tag) => (
                            <span
                                key={tag.tag_id}
                                className="
                                px-3 py-2 rounded-full
                                bg-white/[0.05] border border-white/10
                                text-base text-[#AFDEE2]/80
                                hover:bg-white/[0.1] hover:text-[#AFDEE2] transition-all
                                "
                            >
                                #{tag.tag_key}
                            </span>
                            ))}
                            {(!statistics || statistics.top_tags.length === 0) && (
                            <div className="text-base text-[#f6f6f6]/80 text-center py-4">데이터 없음</div>
                            )}
                        </div>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[24px] bg-white/[0.03] border border-white/5 p-6 text-center shadow-xl">
                        <div className="text-base text-[#f6f6f6]/30 mb-3">
                        {range === "month" ? "이번 달 인사이트" : "전체 인사이트"}
                        </div>
                        <div className="text-lg text-[#f6f6f6]/80">
                        {dashboard.insight.text}{" "}
                        <span className="text-[#AFDEE2] font-semibold">{dashboard.insight.main1}</span>
                        {" 장르와 "}
                        <span className="text-[#AFDEE2] font-semibold">{dashboard.insight.main2}</span>
                        을(를) 더 자주 들었어요 🎧
                        </div>
                    </div>
                    </div>
                </div>

                <div className="rounded-[40px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-2 text-2xl transition font-bold text-[#f6f6f6] hover:text-[#f6f6f6]/50"
                    >
                        나의 플레이리스트
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-2 text-[#f6f6f6] hover:text-[#f6f6f6]/50 transition-all"
                        aria-label="플레이리스트 더보기"
                        title="더보기"
                    >
                        <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="border-b border-white/10" />

                    <HorizontalScroller gradientFromClass="from-transparent">
                    <div className="flex w-max">
                        {playlists.slice(0, 12).map((p) => {
                        const cover = playlistCovers[String(p.id)];
                        const coverUrls = cover?.coverUrls ?? [];
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const coverUrl = cover?.coverUrl ?? (p as any).coverUrl ?? null;

                        return (
                            <button
                            key={p.id}
                            type="button"
                            onClick={() => navigate(`/playlist/${p.id}`)}
                            className="
                                w-[200px]
                                shrink-0
                                flex flex-col
                                rounded-xl
                                hover:bg-white/[0.05]
                                transition-all duration-300
                                p-3
                                text-left
                                group
                            "
                            >
                            <div className="w-full aspect-square rounded-xl bg-white/10 overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-500">
                                {coverUrls.length ? (
                                <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                                    {Array.from({ length: 4 }).map((_, idx) => {
                                    const src = coverUrls[idx];
                                    return src ? (
                                        <img
                                        key={idx}
                                        src={src}
                                        alt={`${p.title} cover ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                        }}
                                        />
                                    ) : (
                                        <div key={idx} className="w-full h-full bg-white/5" />
                                    );
                                    })}
                                </div>
                                ) : coverUrl ? (
                                <img
                                    src={coverUrl}
                                    alt={p.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                    }}
                                />
                                ) : (
                                <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
                                )}
                            </div>

                            <div className="mt-4 px-1">
                                <div className="text-base text-[#f6f6f6]/90 truncate group-hover:text-[#AFDEE2] transition-colors">
                                {p.title}
                                </div>
                                <div className="mt-1 text-xs text-white/20 uppercase">Playlist</div>
                            </div>
                            </button>
                        );
                        })}
                    </div>
                    </HorizontalScroller>
                </div>

                <div className="rounded-[40px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => navigate("/my/ai-songs")}
                        className="px-2 text-2xl font-bold text-[#f6f6f6] hover:text-[#f6f6f6]/50 transition"
                    >
                        나의 AI 생성곡
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/my/ai-songs")}
                        className="px-2 text-[#f6f6f6] hover:text-[#f6f6f6]/50 transition-all"
                        aria-label="AI 생성곡 더보기"
                        title="더보기"
                    >
                        <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="border-b border-white/10" />

                    <HorizontalScroller gradientFromClass="from-transparent">
                    <div className="flex w-max">
                        {aiLoading ? (
                        <div className="px-4 py-6 text-base text-white/80">로딩 중...</div>
                        ) : aiError ? (
                        <div className="px-4 py-6 text-base text-red-400/60">{aiError}</div>
                        ) : (
                        <>
                            {myAiPreview.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => navigate(`/aisong/${t.id}`)}
                                className="
                                w-[200px]
                                shrink-0
                                flex flex-col
                                rounded-xl
                                hover:bg-white/[0.05]
                                transition-all duration-300
                                p-3
                                text-left
                                group
                                "
                            >
                                <div className="w-full aspect-square rounded-xl bg-white/10 overflow-hidden shadow-xl group-hover:scale-105 transition-transform duration-500">
                                {t.coverUrl ? (
                                    <img
                                    src={t.coverUrl}
                                    alt={t.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
                                )}
                                </div>

                                <div className="mt-4 px-1">
                                <div className="text-base text-[#f6f6f6]/90 truncate group-hover:text-[#AFDEE2] transition-colors">
                                    {t.title}
                                </div>
                                <div className="mt-1 text-xs text-white/20 uppercase">AI Track</div>
                                </div>
                            </button>
                            ))}

                            {myAiPreview.length === 0 && (
                            <button
                                type="button"
                                onClick={() => navigate("/ai/create")}
                                className="
                                w-[200px]
                                shrink-0
                                flex flex-col
                                rounded-[32px]
                                border border-white/10
                                bg-white/[0.03]
                                hover:bg-white/[0.08]
                                transition-all duration-500
                                p-3
                                text-left
                                group
                                "
                            >
                                <div className="w-full aspect-square rounded-[24px] bg-white/5 flex items-center justify-center text-white/20 text-4xl font-black group-hover:scale-105 group-hover:text-[#AFDEE2]/40 transition-all">
                                +
                                </div>

                                <div className="mt-4 px-1">
                                <div className="text-base font-bold text-white/90 truncate tracking-tight group-hover:text-[#AFDEE2] transition-colors">
                                    AI 곡 생성
                                </div>
                                <div className="mt-1.5 text-xs font-black text-white/20 uppercase tracking-widest">
                                    No tracks yet
                                </div>
                                </div>
                            </button>
                            )}
                        </>
                        )}
                    </div>
                    </HorizontalScroller>
                </div>
                </section>

                <aside className="col-span-6 rounded-[40px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-0 overflow-hidden whitespace-nowrap">
                <div className="px-8 py-6 border-b border-white/10">
                    <div className="flex pt-2 items-end justify-between gap-4">
                    <h2 className="text-3xl px-2 font-bold text-[#f6f6f6]">실시간 나의 TOP 50 차트</h2>
                    </div>
                </div>

                <div>
                    <div className="grid grid-cols-[80px_220px_1fr] items-center py-3 px-4 text-base text-[#f6f6f6]/30">
                    <div className="border-l border-white/10 pl-4">순위</div>
                    <div className="border-l border-white/10 pl-4">곡정보</div>
                    <div className="border-l border-white/10 pl-4">총 들은 수</div>
                    </div>
                    <div className="border-b border-white/10" />
                </div>

                <div className="divide-y divide-white/10">
                    {topRows.slice(0, 15).map((r, idx) => (
                    <div
                        key={r.id}
                        className={[
                        "group grid grid-cols-[80px_220px_1fr] items-center px-4 py-2",
                        "transition-all duration-300 hover:bg-white/[0.08]",
                        idx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
                        ].join(" ")}
                    >
                        <div className="border-l border-white/10 pl-4 text-left">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 flex items-center justify-center">
                            <span className="text-base text-[#f6f6f6]/90 transition-opacity group-hover:opacity-0 tabular-nums">
                                {r.rank}
                            </span>

                            <button
                                type="button"
                                onClick={(e) => {
                                e.stopPropagation();
                                setTrackAndPlay(toTrack(r));
                                }}
                                className="absolute opacity-0 transition-all duration-300 group-hover:opacity-100 text-[#AFDEE2]"
                                aria-label={`${r.title} 재생`}
                                title="재생"
                            >
                                <FaPlay size={18} />
                            </button>
                            </div>
                        </div>
                        </div>

                        <div className="pl-4 min-w-0 border-l border-white/10">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="relative h-14 w-14 rounded-lg bg-white/10 shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                            {r.coverUrl ? (
                                <>
                                <img
                                    src={r.coverUrl}
                                    alt={r.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = "block";
                                    }}
                                />
                                <div className="hidden w-full h-full bg-white/5" />
                                </>
                            ) : (
                                <div className="w-full h-full bg-white/5" />
                            )}

                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="min-w-0">
                            <div className="truncate text-base text-[#f6f6f6]/95 group-hover:text-[#AFDEE2] transition-colors">
                                {r.title}
                            </div>
                            <div className="truncate text-sm text-white/40">{r.artist}</div>
                            </div>
                        </div>
                        </div>

                        <div className="border-l border-white/10 pl-4 text-left text-base text-[#f6f6f6]/40 tabular-nums group-hover:text-white/60 transition-colors">
                        {r.total}번
                        </div>
                    </div>
                    ))}
                </div>
                </aside>
            </div>
            </div>
        </div>

        {editOpen && (
            <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/40" onClick={closeEdit} aria-label="닫기" />

            <div
                className="
                absolute left-1/2 top-1/2 w-[360px]
                -translate-x-1/2 -translate-y-1/2
                rounded-3xl bg-[#2d2d2d]
                border border-white/10 p-6
                shadow-[0_0px_200px_rgba(0,0,0,0.2)]
                "
            >
                <h2 className="text-center text-[#f6f6f6] text-2xl font-semibold mb-4">프로필 세부 설정</h2>

                <div
                className="
                    group
                    relative mx-auto w-40 h-40
                    rounded-full bg-[#777777]
                    overflow-hidden
                    flex items-center justify-center
                    shadow-[0_0px_20px_rgba(0,0,0,0.55)]
                "
                >
                {draft.avatar ? <img src={draft.avatar} alt="avatar" className="w-full h-full object-cover" /> : null}

                <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                    <span
                    className="
                        w-9 h-9 rounded-full
                        bg-black/35 text-white/90
                        flex items-center justify-center
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-200
                    "
                    >
                    <MdEdit />
                    </span>
                    <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const MAX_SIZE = 300;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                            if (width > MAX_SIZE) {
                                height = (height * MAX_SIZE) / width;
                                width = MAX_SIZE;
                            }
                            } else {
                            if (height > MAX_SIZE) {
                                width = (width * MAX_SIZE) / height;
                                height = MAX_SIZE;
                            }
                            }

                            const canvas = document.createElement("canvas");
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;

                            ctx.drawImage(img, 0, 0, width, height);

                            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);

                            setDraft((prev) => ({
                            ...prev,
                            avatar: compressedDataUrl,
                            }));
                        };
                        img.src = event.target?.result as string;
                        };
                        reader.readAsDataURL(file);
                    }}
                    />
                </label>
                </div>

                <div className="mt-6 space-y-3">
                <input
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    className="
                    w-full h-11 rounded-xl bg-[#777777]/70
                    px-4 text-base text-white
                    placeholder:text-white/50
                    outline-none
                    focus:ring-2 focus:ring-white/30
                    "
                />
                </div>

                <div className="mt-5 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/15 transition text-base"
                >
                    취소
                </button>
                <button
                    type="button"
                    onClick={saveProfile}
                    className="px-4 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/15 transition text-base"
                >
                    저장
                </button>
                </div>
            </div>
            </div>
        )}
        </div>
    );
}
