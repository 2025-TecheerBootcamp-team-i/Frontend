import { useNavigate, useOutletContext } from "react-router-dom";
import React,{ useEffect, useRef, useState } from "react";

import { IoChevronBack } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";
import { MdEdit } from "react-icons/md";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import type { Playlist } from "../../components/layout/MainLayout";
import { getMyAiSongs, subscribeAiSongs } from "../../mocks/aiSongMock";
import type { AiTrack } from "../../mocks/aiSongMock";
import { fetchUserStatistics, fetchTopTracks, type UserStatistics, type TopTrack } from "../../api/user";
import { getCurrentUserNickname, updateCurrentUserNickname, getCurrentUserId } from "../../utils/auth";

type Profile = {
    name: string;
    avatar?: string; // dataURL(base64) 또는 이미지 URL(나중에 백엔드 붙이면 URL로 교체)
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
    gradientFromClass?: string; // 배경색 맞추기
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
    }, []);

    return (
        <div className="relative mt-2">
        {/* 스크롤 영역 */}
        <div
            ref={ref}
            onScroll={update}
            className="overflow-x-auto overflow-y-hidden no-scrollbar"
        >
            {children}
        </div>

        {/* 왼쪽 화살표 */}
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

        {/* 오른쪽 화살표 */}
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

        {/* 그라데이션 힌트 */}
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

export default function MyPage() {
    const { playlists } = useOutletContext<LayoutCtx>();
    const navigate = useNavigate();

     // ✅ 프로필(실제 반영 값)
    const [profile, setProfile] = useState<Profile>(() => {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) {
        try {
            return JSON.parse(raw) as Profile;
        } catch {
            // ignore
        }
        }
        // ✅ 로그인한 사용자의 닉네임을 기본값으로 사용
        return {
        name: getCurrentUserNickname(),
        avatar: "", // 기본 비워두면 회색 원 표시
        };
    });

    // ✅ 모달 열림/닫힘
    const [editOpen, setEditOpen] = useState(false);

    // ✅ 모달에서 편집 중인 임시 값(draft)
    const [draft, setDraft] = useState<Profile>(profile);

    const openEdit = () => {
        setDraft(profile);     // 현재 프로필 → draft 복사
        setEditOpen(true);
    };

    const closeEdit = () => setEditOpen(false);

    // ✅ 모달 열려있을 때 스크롤 잠금 (배경 스크롤 방지)
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
        const next = {
        ...draft,
        name: newName,
        };
        
        // ✅ localStorage의 "profile"에 저장
        setProfile(next);
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
        
        // ✅ localStorage의 "user"의 nickname도 업데이트
        updateCurrentUserNickname(newName);
        
        // ✅ 프로필 업데이트 이벤트 발생
        window.dispatchEvent(new CustomEvent("profileUpdated"));
        
        setEditOpen(false);
    };

    const { setTrackAndPlay } = usePlayer();

    // ✅ 로그인한 사용자 ID 가져오기
    const CURRENT_USER_ID = getCurrentUserId() || "me";

    // ✅ 마이페이지 프리뷰용 AI곡
    const [myAiPreview, setMyAiPreview] = useState<AiTrack[]>([]);

    useEffect(() => {
    const syncAi = () => {
        setMyAiPreview(getMyAiSongs(String(CURRENT_USER_ID)).slice(0, 12));
    };

    syncAi();
    const off = subscribeAiSongs(syncAi);
    return () => { off(); }; // ✅ boolean cleanup 방지
    }, [CURRENT_USER_ID]);


    // ✅ 추가: 분석 대시보드 탭 상태
    const [range, setRange] = useState<"month" | "all">("month");

    // ✅ API 데이터 상태
    const [statistics, setStatistics] = useState<UserStatistics | null>(null);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);

    // ✅ TopTrack -> TopRow 변환
    const topRows: TopRow[] = topTracks.map(track => ({
        id: String(track.music_id),
        rank: track.rank,
        title: track.music_name,
        artist: track.artist_name,
        album: track.album_name,
        coverUrl: track.album_image || undefined,
        total: track.play_count
    }));

    const toTrack = (r: TopRow): PlayerTrack => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    audioUrl: "/audio/sample.mp3", // ✅ 임시(나중에 실제 URL로 교체)
    coverUrl: r.coverUrl,
    });

    // ✅ API 호출: range 변경 시마다 재호출
    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, tracksData] = await Promise.all([
                    fetchUserStatistics(CURRENT_USER_ID, range),
                    fetchTopTracks(CURRENT_USER_ID, range, 50)
                ]);
                setStatistics(statsData);
                setTopTracks(tracksData);
            } catch (error) {
                console.error("데이터 로드 실패:", error);
            }
        };

        loadData();
    }, [range, CURRENT_USER_ID]);

    // ✅ 대시보드 데이터 가공
    const dashboard = statistics ? {
        listen: {
            value: `${statistics.listening_time.total_hours.toFixed(1)}시간`,
            sub: range === "month" 
                ? `지난달 대비 ${statistics.listening_time.change_percent > 0 ? '+' : ''}${statistics.listening_time.change_percent.toFixed(1)}%`
                : `총 재생 횟수: ${statistics.listening_time.play_count}회`
        },
        genre: {
            value: statistics.top_genres[0]?.genre || "—",
            sub: statistics.top_genres[1] ? `2위: ${statistics.top_genres[1].genre}` : "—"
        },
        ai: {
            value: `${statistics.ai_generation.total_generated}곡`,
            sub: statistics.ai_generation.last_generated_days_ago !== null
                ? `최근 생성: ${statistics.ai_generation.last_generated_days_ago}일 전`
                : "생성 기록 없음"
        },
        insight: {
            main1: statistics.top_genres[0]?.genre || "—",
            main2: statistics.top_artists[0]?.artist_name || "—",
            text: range === "month" ? "이번 달은" : "전체 기간 기준으로는",
        },
    } : {
        listen: { value: "—", sub: "로딩 중..." },
        genre: { value: "—", sub: "—" },
        ai: { value: "—", sub: "—" },
        insight: { main1: "—", main2: "—", text: range === "month" ? "이번 달은" : "전체 기간 기준으로는" },
    };

    // ✅ 버튼 스타일 함수 (중복 줄이기)
    const tabBtn = (key: "month" | "all", label: string) => {
        const active = range === key;
        return (
        <button
            type="button"
            onClick={() => setRange(key)}
            aria-pressed={active}
            className={[
            "h-9 px-4 rounded-full text-sm border border-[#2d2d2d] transition",
            active
                ? "bg-[#E4524D] text-[#F6F6F6]"
                : "bg-[#3d3d3d] text-[#F6F6F6]/80 hover:text-[#F6F6F6] hover:bg-[#3d3d3d]/80",
            ].join(" ")}
        >
            {label}
        </button>
        );
    };

    return (
    <div className="w-full h-full flex flex-col">
        {/* 타이틀 라인 */}
        <div className="sticky top-0 z-20 pt-2 mb-4">
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>
            <h1 className="text-2xl font-semibold text-[#F6F6F6]">마이페이지</h1>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="w-full min-w-[1050px] mx-auto">
            {/* 본문: 고정 2컬럼 */}
            <div className="pt-6 grid grid-cols-12 gap-6">
                {/* 좌측 */}
                <section className="col-span-6 space-y-6">
                {/* ✅ 프로필 + 분석 */}
                <div className="space-y-6">
                    {/* 프로필 카드 */}
                    <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-6">
                        <div className="flex items-center gap-6">
                                <div className="w-28 h-28 rounded-full bg-[#777777] overflow-hidden">
                                    {profile.avatar ? (
                                    <img
                                        src={profile.avatar}
                                        alt="profile"
                                        className="w-full h-full object-cover"
                                    />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex flex-col">
                                    <div className="text-2xl font-semibold text-[#F6F6F6]">
                                        {profile.name}
                                    </div>
                                <div className="mt-3 text-sm text-[#F6F6F6]">
                                    <button
                                    type="button"
                                    onClick={openEdit}
                                    className="flex items-center gap-1 hover:underline text-[#F6F6F6]"
                                    >
                                    <IoIosSettings size={20} />
                                    수정 및 설정
                                    </button>
                                </div>
                                </div>
                        </div>
                    </div>

                    {/* 분석 대시보드 카드 */}
                    <div
                    className="
                        rounded-3xl p-[2px]
                        bg-gradient-to-r
                        from-[#2d2d2d]
                        via-[#5a5a5a]
                        to-[#2d2d2d]
                    "
                    >
                    <div className="rounded-3xl bg-[#2d2d2d]/80 p-6">
                        <div className="flex items-center justify-between">
                        <div className="px-2 text-2xl font-semibold text-[#F6F6F6]">
                            개인 음악 분석 데이터
                        </div>

                        {/* ✅ 여기: 버튼 클릭하면 탭 넘어가게 */}
                        <div className="px-2 flex gap-2">
                            {tabBtn("month", "이번 달")}
                            {tabBtn("all", "전체")}
                        </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-sm text-[#999999]">
                            {range === "month" ? "이번 달 청취" : "누적 청취"}
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-[#F6F6F6]">
                            {dashboard.listen.value}
                            </div>
                            <div className="mt-2 text-xs text-[#999999]">
                            {dashboard.listen.sub}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-sm text-[#999999]">Top 장르</div>
                            <div className="mt-2 text-2xl font-semibold text-[#AFDEE2]">
                            {dashboard.genre.value}
                            </div>
                            <div className="mt-2 text-xs text-[#999999]">
                            {dashboard.genre.sub}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-sm text-[#999999]">
                            AI 생성 활동
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-[#F6F6F6]">
                            {dashboard.ai.value}
                            </div>
                            <div className="mt-2 text-xs text-[#999999]">
                            {dashboard.ai.sub}
                            </div>
                        </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4">
                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-base font-semibold text-[#F6F6F6] mb-3">
                            Top 아티스트
                            </div>

                            <div className="space-y-3">
                            {statistics?.top_artists.slice(0, 3).map((artist) => (
                                <div key={artist.artist_id} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#777777] overflow-hidden">
                                    {artist.artist_image ? (
                                    <img 
                                        src={artist.artist_image} 
                                        alt={artist.artist_name}
                                        className="w-full h-full object-cover"
                                    />
                                    ) : null}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-[#F6F6F6] truncate">
                                    {artist.rank}. {artist.artist_name}
                                    </div>
                                    <div className="text-xs text-[#999999]">
                                    재생 횟수: {artist.play_count}회
                                    </div>
                                </div>

                                <div className="text-sm font-semibold text-[#F6F6F6]/80 whitespace-nowrap">
                                    {artist.percentage.toFixed(1)}%
                                </div>
                                </div>
                            ))}
                            {(!statistics || statistics.top_artists.length === 0) && (
                                <div className="text-sm text-[#999999] text-center py-4">
                                데이터 없음
                                </div>
                            )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4">
                            <div className="text-base font-semibold text-[#F6F6F6] mb-3">
                            분위기/키워드
                            </div>

                            <div className="flex flex-wrap gap-2">
                            {statistics?.top_tags.slice(0, 6).map((tag) => (
                                <span
                                    key={tag.tag_id}
                                    className="
                                    px-3 py-2 rounded-full
                                    bg-[#3d3d3d] border border-[#2d2d2d]
                                    text-sm text-[#AFDEE2]/85
                                    "
                                >
                                    {tag.tag_key}
                                </span>
                            ))}
                            {(!statistics || statistics.top_tags.length === 0) && (
                                <div className="text-sm text-[#999999] text-center py-4 w-full">
                                데이터 없음
                                </div>
                            )}
                            </div>
                        </div>
                        </div>

                        <div className="mt-5 rounded-3xl bg-[#4b4b4b] border border-[#2d2d2d] p-4 text-center">
                        <div className="text-sm text-[#999999]">
                            {range === "month" ? "이번 달 인사이트" : "전체 인사이트"}
                        </div>
                        <div className="mt-2 text-base text-[#F6F6F6]">
                            {dashboard.insight.text}{" "}
                            <span className="font-semibold text-[#AFDEE2]">
                            {dashboard.insight.main1}
                            </span>
                            {" 장르와 "}
                            <span className="font-semibold text-[#AFDEE2]">
                            {dashboard.insight.main2}
                            </span>
                            을(를) 더 자주 들었어요 🎧
                        </div>
                        </div>
                    </div>
                    </div>
                </div>

                {/* 나의 플레이리스트 */}
                <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-6">
                    <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-1 text-xl hover:text-white transition font-semibold text-[#F6F6F6]"
                    >
                        나의 플레이리스트
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/my-playlists")}
                        className="px-1 text-[#F6F6F6] hover:text-white transition"
                        aria-label="플레이리스트 더보기"
                        title="더보기"
                    >
                        <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="mt-3 border-b border-[#464646]" />

                    <HorizontalScroller gradientFromClass="from-[#2d2d2d]">
                    <div className="flex gap-1 w-max">
                        {playlists.slice(0, 12).map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => navigate(`/playlist/${p.id}`)}   // ✅ 상세 연결
                            className="
                            w-[145px]
                            shrink-0
                            flex flex-col
                            rounded-xl
                            hover:bg-white/5
                            transition
                            p-2
                            text-left
                            "
                        >
                            <div className="w-full aspect-square rounded-xl bg-[#777777] overflow-hidden">
                                {p.coverUrl ? (
                                    <img src={p.coverUrl} alt={p.title} className="w-full h-full object-cover" />
                                ) : null}
                            </div>

                            <div className="mt-3">
                                <div className="text-sm font-medium text-[#F6F6F6] truncate">{p.title}</div>
                            </div>
                        </button>
                        ))}
                    </div>
                    </HorizontalScroller>

                </div>

                {/* 나의 AI 생성곡 */}
                <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-6">
                    <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/my/ai-songs")}
                        className="px-1 text-xl hover:text-white transition font-semibold text-[#F6F6F6]"
                    >
                        나의 AI 생성곡
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/my/ai-songs")}
                        className="px-1 text-[#F6F6F6] hover:text-white transition"
                        aria-label="AI 생성곡 더보기"
                        title="더보기"
                    >
                        <MdOutlineNavigateNext size={30} />
                    </button>
                    </div>

                    <div className="mt-3 border-b border-[#464646]" />

                    <HorizontalScroller gradientFromClass="from-[#2d2d2d]">
                    <div className="flex gap-1 w-max">
                        {myAiPreview.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => navigate(`/aisong/${t.id}`)} // ✅ 상세로 이동
                            className="
                            w-[145px]
                            shrink-0
                            flex flex-col
                            rounded-xl
                            hover:bg-white/5
                            transition
                            p-2
                            text-left
                            "
                        >
                            <div className="w-full aspect-square rounded-xl bg-[#777777] overflow-hidden">
                            {t.coverUrl ? (
                                <img
                                src={t.coverUrl}
                                alt={t.title}
                                className="w-full h-full object-cover"
                                />
                            ) : null}
                            </div>

                            <div className="mt-3">
                            <div className="text-sm font-medium text-[#F6F6F6] truncate">
                                {t.title}
                            </div>
                            <div className="mt-1 text-xs text-[#999999] truncate">
                                {t.createdAt || "생성일 없음"}
                            </div>
                            </div>
                        </button>
                        ))}

                        {/* ✅ 없을 때: 만들기 카드 */}
                        {myAiPreview.length === 0 && (
                        <button
                            type="button"
                            onClick={() => navigate("/ai/create")}
                            className="
                            w-[145px]
                            shrink-0
                            flex flex-col
                            rounded-xl
                            border border-[#464646]
                            bg-white/5
                            hover:bg-white/10
                            transition
                            p-2
                            text-left
                            "
                        >
                            <div className="w-full aspect-square rounded-xl bg-[#777777]/40 flex items-center justify-center text-[#F6F6F6]/70 text-base">
                            +
                            </div>

                            <div className="mt-3">
                            <div className="text-sm font-medium text-[#F6F6F6] truncate">
                                AI 곡 생성
                            </div>
                            <div className="mt-1 text-xs text-[#999999] truncate">
                                아직 만든 곡이 없어요
                            </div>
                            </div>
                        </button>
                        )}
                    </div>
                    </HorizontalScroller>

                </div>
                </section>

                {/* 우측 */}
                <aside className="col-span-6 rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80">
                <h2 className="px-8 pt-6 text-xl font-semibold text-[#F6F6F6]">
                    실시간 나의 TOP 50 차트
                </h2>

                <div className="mt-4 border-b border-[#464646]" />

                <div className="mt-3 px-8 grid grid-cols-[100px_200px_1fr] items-center text-sm text-[#F6F6F6]/80">
                    <div className="border-l border-[#f6f6f6]/20 pl-2">순위</div>
                    <div className="border-l border-[#f6f6f6]/20 pl-2">곡정보</div>
                    <div className="border-l border-[#f6f6f6]/20 pl-2">
                    총 들은 수
                    </div>
                </div>

                <div className="mt-3 border-b border-[#464646]" />

                <div className="divide-y divide-[#464646]">
                    {topRows.slice(0, 8).map((r, idx) => (
                    <div
                        key={r.id}
                        className="
                        group
                        w-full
                        text-left
                        transition
                        hover:bg-white/5
                        "
                    >
                        <div
                        className={[
                            "grid grid-cols-[100px_200px_1fr] items-center px-8 py-2.5",
                            idx % 2 === 0 ? "bg-[#3d3d3d]/80" : "bg-[#2d2d2d]/80",
                        ].join(" ")}
                        >
                        {/* ✅ 순위 (행 hover 시 아이콘으로 전환) */}
                        <div className="border-l border-[#464646] text-left font-semibold text-[#F6F6F6]">
                            <div className="flex items-center gap-3">
                            <div className="relative w-8 flex items-center justify-center">
                                {/* 기본: 순위 */}
                                <span className="text-sm transition-opacity group-hover:opacity-0">
                                {r.rank}
                                </span>

                                {/* hover: 재생 아이콘 */}
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTrackAndPlay(toTrack(r)); // ✅ 하단 플레이어 세팅+재생
                                    }}
                                    className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#AFDEE2]"
                                    aria-label={`${r.title} 재생`}
                                    title="재생"><FaPlay />
                                </button>
                            </div>
                            </div>
                        </div>

                        {/* 곡정보 */}
                        <div className="pl-2 min-w-0 border-l border-[#464646]">
                            <div className="flex items-center gap-5 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-xl bg-[#777777] overflow-hidden">
                                {r.coverUrl ? (
                                <img 
                                    src={r.coverUrl} 
                                    alt={r.title}
                                    className="w-full h-full object-cover"
                                />
                                ) : null}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm text-[#F6F6F6]">
                                {r.title}
                                </div>
                                <div className="truncate text-xs text-[#999999]">
                                {r.artist}
                                </div>
                            </div>
                            </div>
                        </div>

                        {/* 총 들은 수 */}
                        <div className="border-l border-[#464646] pl-2 text-left text-sm font-semibold text-[#F6F6F6] whitespace-nowrap">
                            {r.total}번
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                </aside>
                {/* /우측 */}
                </div>
                {/* /grid */}
                </div>
                {/* /min-w container */}
                </div>
                {/* /scroll 영역 */}
                
                {/* =======================
                    ✅ 프로필 편집 모달
                ======================= */}
                {editOpen && (
                <div className="fixed inset-0 z-50">
                    {/* 딤/배경 */}
                    <button
                    type="button"
                    className="absolute inset-0 bg-black/40"
                    onClick={closeEdit}
                    aria-label="닫기"
                    />

                    {/* 모달 카드 */}
                    <div className="
                            absolute left-1/2 top-1/2 w-[360px]
                            -translate-x-1/2 -translate-y-1/2
                            rounded-3xl bg-[#2d2d2d]
                            border border-white/10 p-6
                            shadow-[0_0px_200px_rgba(0,0,0,0.2)]
                            ">

                    <h2 className="text-center text-[#f6f6f6] text-xl font-semibold mb-4">
                        프로필 세부 설정
                    </h2>

                    {/* 아바타 */}
                    <div className="
                            group
                            relative mx-auto w-40 h-40
                            rounded-full bg-[#777777]
                            overflow-hidden
                            flex items-center justify-center
                            shadow-[0_0px_20px_rgba(0,0,0,0.55)]
                            ">
                        {draft.avatar ? (
                        <img
                            src={draft.avatar}
                            alt="avatar"
                            className="w-full h-full object-cover"
                        />
                        ) : null}

                        {/* 이미지 변경 버튼(연필) */}
                        <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                        <span className="
                            w-9 h-9 rounded-full 
                            bg-black/35 text-white/90
                            flex items-center justify-center
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-200">
                            <MdEdit />
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // ✅ 이미지 리사이즈 및 압축
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                // 최대 크기 설정 (300x300)
                                const MAX_SIZE = 300;
                                let width = img.width;
                                let height = img.height;

                                // 비율 유지하면서 리사이즈
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

                                // Canvas로 리사이즈
                                const canvas = document.createElement("canvas");
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext("2d");
                                if (!ctx) return;

                                ctx.drawImage(img, 0, 0, width, height);

                                // JPEG로 압축 (품질 0.7)
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

                    {/* 입력 */}
                    <div className="mt-6 space-y-3">
                        <input
                        value={draft.name}
                        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Name"
                        className="
                            w-full h-11 rounded-xl bg-[#777777]/70
                            px-4 text-sm text-white
                            placeholder:text-white/50
                            outline-none
                            focus:ring-2 focus:ring-white/30
                        "
                        />
                    </div>

                    {/* 버튼 */}
                    <div className="mt-5 flex items-center justify-between">
                        <button
                        type="button"
                        onClick={() => setEditOpen(false)}
                        className="px-4 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/15 transition text-sm"
                        >
                        취소
                        </button>
                        <button
                        type="button"
                        onClick={saveProfile}
                        className="px-4 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/15 transition text-sm"
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