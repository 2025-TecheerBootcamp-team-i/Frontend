// ArtistPage.tsx
import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";

/* =====================
타입 정의
===================== */
type Track = {
    id: string; // ✅ 여기서는 track play 호출에 쓰는 id (대부분 music_id 문자열)
    title: string;
    album: string;
    duration: string;
    albumImage?: string | null;
};
type Album = { id: string; title: string; year: string; albumImage?: string | null };

type TrackPlayApi = {
    music_id: number;
    music_name: string;
    artist_name: string;
    album_name: string;
    album_image: string | null;
    audio_url: string | null;
    duration: number | null;
    genre: string | null;
    is_ai: boolean;
    itunes_id: number;
};

type ArtistData = {
    id: string;
    name: string;
    image?: string | null;
    tracks: Track[]; // ✅ 미리보기(최대 5곡)
    albums: Album[];
};

// API 응답 타입
type ArtistDetailApi = {
    artist_id: number;
    artist_name: string;
    artist_image: string | null;
};

// ⚠️ 백엔드에서 tracks 응답이 music_id를 준다면 여기 타입을 바꿔도 됨
// 지금 너 코드 흐름상 t.id를 /tracks/{id}/play에 그대로 사용
type ArtistTrackApi = {
    id: string; // 보통 music_id가 문자열로 오거나, music_id를 id로 내려주는 형태
    title: string;
    album: string;
    duration: string;
    album_image: string | null;
};

type ArtistAlbumApi = {
    id: string;
    title: string;
    year: string;
    album_image: string | null;
    image_large_square: string | null; // ✅ RDS에 저장된 이미지 (우선 사용)
};

type HorizontalScrollerProps = {
    children: React.ReactNode;
    scrollStep?: number;
    gradientFromClass?: string;
};

// ✅ seconds -> "m:ss"
function formatSeconds(sec: number | null): string {
    if (typeof sec !== "number" || Number.isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function HorizontalScroller({
    children,
    scrollStep = 300,
    gradientFromClass = "from-[#2d2d2d]/80",
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
            "
            aria-label="왼쪽으로 이동"
            >
            <span className="rotate-180">
                <MdOutlineNavigateNext size={22} />
            </span>
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

/* =====================
더미 데이터
===================== */
const ARTISTS: Record<string, ArtistData> = {
    a1: {
        id: "a1",
        name: "아티스트 A",
        tracks: [
        { id: "a1-t1", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
        { id: "a1-t2", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
        { id: "a1-t3", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },
        ],
        albums: [
        { id: "a1-al1", title: "A - 앨범 1", year: "2024" },
        { id: "a1-al2", title: "A - 앨범 2", year: "2023" },
        { id: "a1-al3", title: "A - 앨범 3", year: "2022" },
        { id: "a1-al4", title: "A - 앨범 4", year: "2021" },
        ],
    },
    a2: {
        id: "a2",
        name: "아티스트 B",
        tracks: [
        { id: "a2-t1", title: "B - 인기곡 1", album: "B - 앨범 1", duration: "3:01" },
        { id: "a2-t2", title: "B - 인기곡 2", album: "B - 앨범 2", duration: "2:45" },
        { id: "a2-t3", title: "B - 인기곡 3", album: "B - 앨범 3", duration: "4:10" },
        ],
        albums: [
        { id: "a2-al1", title: "B - 미니 1집", year: "2025" },
        { id: "a2-al2", title: "B - 정규 1집", year: "2024" },
        { id: "a2-al3", title: "B - 싱글 모음", year: "2023" },
        { id: "a2-al4", title: "B - EP", year: "2022" },
        ],
    },
};

export default function ArtistPage() {
    const { artistId } = useParams();
    const navigate = useNavigate();
    const { playTracks } = usePlayer();

    const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

    // API 데이터 상태
    const [artist, setArtist] = useState<ArtistData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ 재생 중 상태 (버튼 disable / 중복 호출 방지)
    const [playingId, setPlayingId] = useState<string | null>(null);

    // ✅ API 데이터 로딩
    useEffect(() => {
        if (!artistId) {
        setError("아티스트 ID가 없습니다.");
        return;
        }

        // 더미 데이터 확인
        if (!API_BASE || artistId.startsWith("a")) {
        const dummy = ARTISTS[artistId];
        if (dummy) {
            setArtist(dummy);
            setError(null);
        } else {
            setError("아티스트를 찾을 수 없습니다.");
            setArtist(null);
        }
        return;
        }

        const controller = new AbortController();

        (async () => {
        try {
            setLoading(true);
            setError(null);

            const artistIdNum = Number(artistId);
            if (Number.isNaN(artistIdNum)) {
            throw new Error("유효하지 않은 아티스트 ID입니다.");
            }

            const [detailRes, tracksRes, albumsRes] = await Promise.all([
            fetch(`${API_BASE}/artists/${artistIdNum}/`, {
                method: "GET",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_BASE}/artists/${artistIdNum}/tracks/`, {
                method: "GET",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
            }),
            fetch(`${API_BASE}/artists/${artistIdNum}/albums/`, {
                method: "GET",
                signal: controller.signal,
                headers: { "Content-Type": "application/json" },
            }),
            ]);

            if (!detailRes.ok) {
            throw new Error(`아티스트 상세 정보 조회 실패: ${detailRes.status}`);
            }

            const detailData: ArtistDetailApi = await detailRes.json();
            const tracksData: ArtistTrackApi[] = tracksRes.ok ? await tracksRes.json() : [];
            const albumsData: ArtistAlbumApi[] = albumsRes.ok ? await albumsRes.json() : [];

            setArtist({
            id: String(detailData.artist_id),
            name: detailData.artist_name,
            image: detailData.artist_image,
            // ✅ 화면 미리보기는 5곡만 (전체재생은 버튼 눌렀을 때 다시 fetch)
            tracks: tracksData.slice(0, 5).map((t) => ({
                id: t.id,
                title: t.title,
                album: t.album,
                duration: t.duration,
                albumImage: t.album_image,
            })),
            albums: albumsData.map((a) => ({
                id: a.id,
                title: a.title,
                year: a.year,
                albumImage: a.image_large_square || a.album_image,
            })),
            });
        } catch (e: unknown) {
            if ((e as DOMException)?.name === "AbortError") return;
            console.error("[ArtistPage] API 오류:", e);
            setError(e instanceof Error ? e.message : "알 수 없는 오류");
            setArtist(null);
        } finally {
            setLoading(false);
        }
        })();

        return () => controller.abort();
    }, [API_BASE, artistId]);

    /* =====================
        단일 트랙 재생
    ===================== */
    const handlePlayById = async (musicId: string) => {
        try {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

        // 더미 모드에서는 API가 없으니 재생 막기 (원하면 더미 오디오 붙여서 확장 가능)
        if (!API_BASE || artistId?.startsWith("a")) {
            alert("더미 데이터에서는 재생을 지원하지 않습니다.");
            return;
        }

        setPlayingId(musicId);

        const res = await fetch(`${API_BASE}/tracks/${musicId}/play`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            throw new Error(`트랙 재생 정보 조회 실패: ${res.status}`);
        }

        const data: TrackPlayApi = await res.json();

        if (!data.audio_url) {
            throw new Error("재생할 오디오 URL이 없습니다.");
        }

        const track: PlayerTrack = {
            id: String(data.music_id),
            musicId: data.music_id,
            title: data.music_name,
            artist: data.artist_name,
            album: data.album_name,
            duration: formatSeconds(data.duration),
            audioUrl: data.audio_url,
            coverUrl: data.album_image ?? undefined,
        };

        playTracks([track]);
        } catch (e) {
        console.error("[ArtistPage] play error:", e);
        alert(e instanceof Error ? e.message : "재생 중 오류가 발생했습니다.");
        } finally {
        setPlayingId(null);
        }
    };

    /* =====================
        ✅ 아티스트 전체 트랙 재생 (상단 재생 버튼)
        - 미리보기(5곡) 말고 전체를 다시 fetch해서 큐로 재생
    ===================== */
    const handlePlayArtistAll = async () => {
        try {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;

        if (!API_BASE || artistId?.startsWith("a")) {
            alert("더미 데이터에서는 전체 재생을 지원하지 않습니다.");
            return;
        }

        if (!artistId) throw new Error("아티스트 ID가 없습니다.");

        const artistIdNum = Number(artistId);
        if (Number.isNaN(artistIdNum)) throw new Error("유효하지 않은 아티스트 ID입니다.");

        setPlayingId("artist-all");

        // ✅ 전체 트랙 목록
        const tracksRes = await fetch(`${API_BASE}/artists/${artistIdNum}/tracks/`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!tracksRes.ok) throw new Error(`아티스트 트랙 조회 실패: ${tracksRes.status}`);

        const tracksData: ArtistTrackApi[] = await tracksRes.json();
        if (!tracksData.length) throw new Error("재생할 트랙이 없습니다.");

        // ✅ 각 트랙별로 play API 호출해서 audio_url 받아오기
        const playerTracks: PlayerTrack[] = await Promise.all(
            tracksData.map(async (t) => {
            const res = await fetch(`${API_BASE}/tracks/${t.id}/play`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`트랙 재생 정보 조회 실패: ${res.status}`);

            const data: TrackPlayApi = await res.json();
            if (!data.audio_url) throw new Error("재생할 오디오 URL이 없습니다.");

            return {
                id: String(data.music_id),
                musicId: data.music_id,
                title: data.music_name,
                artist: data.artist_name,
                album: data.album_name,
                duration: formatSeconds(data.duration),
                audioUrl: data.audio_url,
                coverUrl: data.album_image ?? undefined,
            };
            })
        );

        playTracks(playerTracks);
        } catch (e) {
        console.error("[ArtistPage] play artist all error:", e);
        alert(e instanceof Error ? e.message : "전체 재생 중 오류가 발생했습니다.");
        } finally {
        setPlayingId(null);
        }
    };

    /* =====================
        렌더
    ===================== */

    if (loading) {
        return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
            <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 text-[#aaa] hover:text-white transition"
            aria-label="뒤로가기"
            >
            <IoChevronBack size={24} />
            </button>
            <div className="text-center py-12 text-[#999]">로딩 중...</div>
        </div>
        );
    }

    if (!artist || error) {
        return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
            <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 text-[#aaa] hover:text-white transition"
            aria-label="뒤로가기"
            >
            <IoChevronBack size={24} />
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xl font-semibold">아티스트를 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{artistId ?? "(없음)"}</span>
            </div>
            {error && <div className="mt-2 text-sm text-red-400">오류: {error}</div>}

            <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-5 px-4 py-2 rounded-full bg-[#E4524D] text-white font-semibold hover:opacity-90 transition"
            >
                홈으로
            </button>
            </div>
        </div>
        );
    }

    return (
        <div className="w-full min-w-0 overflow-x-auto">
        {/* 상단 */}
        <section className="relative overflow-visible">
            <div className="relative h-72 bg-white/[0.05] backdrop-blur-2xl border-b border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            {/* 뒤로 */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-4 top-5 z-10 p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
                title="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>

            {/* 내용 */}
            <div className="absolute inset-0 flex items-end">
                <div className="px-10 pb-8 flex items-end gap-8 min-w-[1100px] shrink-0">
                {/* 이미지 자리 유지 */}
                <div className="w-[228px] h-[228px] shrink-0" />

                {/* 텍스트 + 재생 */}
                <div className="flex items-end gap-5">
                    <div>
                    <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none">
                        {artist.name}
                    </div>
                    <div className="mt-2 text-sm text-[#F6F6F6]/60">아티스트</div>
                    </div>

                    {/* ✅ 상단 재생 버튼: 아티스트 전체재생 */}
                    <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (playingId) return;
                        void handlePlayArtistAll();
                    }}
                    disabled={!!playingId}
                    className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition disabled:opacity-60"
                    aria-label="아티스트 전체 재생"
                    title="전체 재생"
                    >
                    <FaPlay size={16} />
                    </button>
                </div>
                </div>
            </div>
            </div>

            {/* 헤더 밖 아티스트 이미지 */}
            <div
            className="
                absolute left-10 top-28
                w-[228px] h-[228px]
                rounded-full
                overflow-hidden
                z-20
                shadow-xl
                pointer-events-none
            "
            >
            {artist?.image ? (
                <>
                <img
                    src={
                    artist.image.startsWith("http") || artist.image.startsWith("//")
                        ? artist.image
                        : API_BASE && artist.image.startsWith("/")
                        ? `${API_BASE.replace("/api/v1", "")}${artist.image}`
                        : artist.image
                    }
                    alt={artist.name}
                    className="w-full h-full object-cover relative z-10"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={(e) => {
                    console.error(`[ArtistPage] ❌ 아티스트 이미지 로드 실패:`, {
                        name: artist.name,
                        id: artist.id,
                        image_url: artist.image,
                    });
                    (e.target as HTMLImageElement).style.display = "none";
                    }}
                    onLoad={() => {
                    console.log(`[ArtistPage] ✅ 아티스트 이미지 로드 성공:`, {
                        name: artist.name,
                        id: artist.id,
                        image_url: artist.image,
                    });
                    }}
                />
                <div className="absolute inset-0 bg-[#2d2d2d] animate-pulse z-0" />
                </>
            ) : (
                <div className="w-full h-full bg-[#777777]" />
            )}
            </div>
        </section>

        {/* 아래 컨텐츠 */}
        <div className="mt-[70px] px-4 space-y-8">
            {/* 곡 카드 */}
            <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="px-8 pt-8 pb-3 flex items-center justify-between">
                <button
                onClick={() => navigate(`/artists/${artist.id}/tracks`)}
                className="px-3 text-2xl font-black tracking-[0.15em] hover:text-[#AFDEE2] text-white uppercase opacity-95 whitespace-nowrap transition"
                >
                곡
                </button>
                <button
                type="button"
                onClick={() => navigate(`/artists/${artist.id}/tracks`)}
                className="px-3 shrink-0 text-white/40 hover:text-white transition text-xl leading-non"
                aria-label="곡 더보기"
                title="더보기"
                >
                <MdOutlineNavigateNext size={32} />
                </button>
            </div>

            <div className="mx-8 border-b border-white/10" />

            <div className="px-8 pb-4">
                {artist.tracks.map((t) => (
                <div
                    key={t.id}
                    onDoubleClick={(e) => {
                    if (!requireLogin("로그인 후 이용 가능합니다.")) return;
                    e.preventDefault();
                    if (playingId) return;
                    void handlePlayById(t.id);
                    }}
                    className={[
                    "w-full text-left",
                    "grid grid-cols-[56px_1fr_90px] min-[1200px]:grid-cols-[56px_1fr_200px_450px] items-center",
                    "py-3 px-3",
                    "gap-x-4",
                    "border-b border-white/5",
                    "hover:bg-white/10 transition rounded-xl",
                    ].join(" ")}
                >
                    {/* 앨범 이미지 */}
                    <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden relative flex-shrink-0 shadow-lg border border-white/10">
                    {t.albumImage ? (
                        <>
                        <img
                            src={
                            t.albumImage.startsWith("http") || t.albumImage.startsWith("//")
                                ? t.albumImage
                                : API_BASE && t.albumImage.startsWith("/")
                                ? `${API_BASE.replace("/api/v1", "")}${t.albumImage}`
                                : t.albumImage
                            }
                            alt={t.album}
                            className="w-full h-full object-cover relative z-10"
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            }}
                        />
                        <div className="absolute inset-0 bg-white/5 animate-pulse z-0" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-white/10" />
                    )}
                    </div>

                    <div className="min-w-0">
                    <div className="text-base font-bold text-white truncate tracking-tight">{t.title}</div>
                    <div className="mt-1 text-xs text-white/40 truncate font-medium">{artist.name}</div>
                    </div>

                    {/* 바꾸지 말아주세요! */}
                    <div className="hidden min-[1200px]:block text-sm text-white/50 text-right truncate">
                    {t.album}
                    </div>
                    <div className="text-sm text-white/30 font-bold tabular-nums text-right">{t.duration}</div>
                </div>
                ))}

                <div className="flex justify-center pt-6 pb-2 text-white/40">
                <button
                    onClick={() => navigate(`/artists/${artist.id}/tracks`)}
                    type="button"
                    aria-label="전체 곡으로 이동"
                    title="전체 곡"
                    className="hover:text-white text-sm font-medium transition"
                >
                    더보기
                </button>
                </div>
            </div>
            </section>

            {/* 앨범 카드 */}
            <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="px-8 pt-8 pb-3 flex items-center justify-between">
                <button
                onClick={() => navigate(`/artists/${artist.id}/albums`)}
                className="px-3 text-2xl font-black tracking-[0.15em] hover:text-[#AFDEE2] text-white uppercase opacity-95 whitespace-nowrap transition"
                >
                앨범
                </button>
                <button
                onClick={() => navigate(`/artists/${artist.id}/albums`)}
                type="button"
                className="px-3 shrink-0 text-white/40 hover:text-white transition text-xl leading-non"
                aria-label="앨범 더보기"
                title="더보기"
                >
                <MdOutlineNavigateNext size={32} />
                </button>
            </div>

            <div className="mx-8 border-b border-white/10" />

            <div className="px-8 pb-8">
                <HorizontalScroller gradientFromClass="from-[#080808]">
                <div className="flex gap-8 min-w-max pr-4 pt-4">
                    {artist.albums.map((al) => (
                    <button
                        key={al.id}
                        type="button"
                        onClick={() => navigate(`/album/${al.id}`)}
                        className="w-[200px] text-left group shrink-0"
                    >
                        <div className="aspect-square rounded-[32px] bg-white/5 group-hover:bg-white/10 transition-all duration-500 overflow-hidden relative shadow-xl border border-white/10 group-hover:border-white/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />
                            {al.albumImage ? (
                                <>
                                <img
                                    src={
                                    al.albumImage.startsWith("http") || al.albumImage.startsWith("//")
                                        ? al.albumImage
                                        : API_BASE && al.albumImage.startsWith("/")
                                        ? `${API_BASE.replace("/api/v1", "")}${al.albumImage}`
                                        : al.albumImage
                                    }
                                    alt={al.title}
                                    className="w-full h-full object-cover relative z-10 transition-transform duration-1000 group-hover:scale-110"
                                    loading="lazy"
                                    decoding="async"
                                    fetchPriority="low"
                                    onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                                </>
                            ) : (
                                <div className="w-full h-full bg-white/5" />
                            )}
                        </div>
                        <div className="mt-4 px-1">
                            <div className="text-base font-bold text-white truncate group-hover:text-[#AFDEE2] transition-colors">
                            {al.title}
                            </div>
                            <div className="mt-1 text-xs font-medium text-white/30">
                            {al.year}
                            </div>
                        </div>
                    </button>
                    ))}
                </div>
                </HorizontalScroller>
            </div>
            </section>
        </div>
        </div>
    );
}
