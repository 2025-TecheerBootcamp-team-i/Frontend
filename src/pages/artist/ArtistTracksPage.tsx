import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import {
  fetchArtistDetail,
  fetchArtistTracks,
  type ArtistDetail,
  type ArtistTrack,
} from "../../api/artist";

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type ActionKey = (typeof actions)[number]["key"];

export default function ArtistTracksPage() {
    const { artistId } = useParams();
    const navigate = useNavigate();

    const [artist, setArtist] = useState<ArtistDetail | null>(null);
    const [tracks, setTracks] = useState<ArtistTrack[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    if (!artistId) {
        setError("아티스트 ID가 없습니다.");
        setArtist(null);
        setTracks([]);
        return;
    }

    const idNum = Number(artistId);
    if (Number.isNaN(idNum)) {
        setError("유효하지 않은 아티스트 ID입니다.");
        setArtist(null);
        setTracks([]);
        return;
    }

    let cancelled = false;

    (async () => {
        try {
        setLoading(true);
        setError(null);

        const [detail, list] = await Promise.all([
            fetchArtistDetail(idNum),
            fetchArtistTracks(idNum),
        ]);

        if (cancelled) return;

        setArtist(detail);
        setTracks(list);

        // 새 데이터 로드되면 체크 상태 초기화(원하면 제거 가능)
        setCheckedIds({});
        } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        setArtist(null);
        setTracks([]);
        } finally {
        if (!cancelled) setLoading(false);
        }
    })();

    return () => {
        cancelled = true;
    };
    }, [artistId]);



    // ✅ PlayerContext에 있는 이름 그대로 쓰기 (너가 위에서 playTracks로 가져왔으니 그걸로)
    const { playTracks } = usePlayer();

    // ✅ 체크박스 상태
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

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
            <button type="button" onClick={() => navigate(-1)} className="mb-6 text-[#aaa] hover:text-white transition">
                <IoChevronBack size={24} />
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-xl font-semibold">아티스트를 찾을 수 없어요.</div>
                <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{artistId ?? "(없음)"}</span>
                </div>
                {error && <div className="mt-2 text-sm text-red-400">오류: {error}</div>}
            </div>
            </div>
        );
        }

    // ✅ 단 하나의 변환 함수만 유지
    const toPlayerTrack = (t: ArtistTrack): PlayerTrack => ({
        id: t.id,
        title: t.title,
        artist: artist.artist_name,
        album: t.album,
        duration: t.duration, // "mm:ss"
        audioUrl: "/audio/sample.mp3",
        // coverUrl도 mock에 있으면 여기서 안전하게 추가 가능
    });

    // ✅ "선택된 곡이 있으면 선택된 곡만", 없으면 전체
    const selectedList = tracks
        .filter((t) => checkedIds[t.id])
        .map((t) => toPlayerTrack(t));

    const listToPlay = (selectedList.length > 0 ? selectedList : tracks.map(toPlayerTrack));

    const selectedCount = selectedList.length;

    const handleAction = (key: ActionKey) => {
            if (tracks.length === 0) return;
        
            if (key === "play") {
            playTracks(listToPlay);
            return;
            }
            if (key === "shuffle") {
            playTracks(listToPlay, { shuffle: true });
            return;
            }
            if (key === "add") {
            console.log("add", (selectedCount > 0 ? selectedList : listToPlay).map((t) => t.id));
            return;
            }
            if (key === "like") {
            console.log("like", (selectedCount > 0 ? selectedList : listToPlay).map((t) => t.id));
            }
    };

    return (
        <div className="w-full min-w-0">
        {/* 상단 sticky 헤더 */}
        <div className="sticky bg-[#2d2d2d] border-b border-[#464646] pb-4 top-0 z-20 pt-5 px-4 mb-4">
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>
            <h1 className="text-xl font-semibold text-[#F6F6F6]">{artist.artist_name} · 전체 곡</h1>
            </div>
        </div>

        <section className="mt-4 mx-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#464646]">
            <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-6">
                <h2 className="text-xl font-semibold text-[#F6F6F6]">곡 전체보기</h2>
                <div className="text-sm text-[#999999]">총 {tracks.length}곡</div>
                </div>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-4 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar">
                {actions.map((a) => {
                const disabled = 
                    (a.key === "play" || a.key === "shuffle") && selectedCount === 0;

                return (
                    <button
                    key={a.key}
                    type="button"
                    disabled={disabled}
                    className={[
                        "shrink-0 px-4 py-2 rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-500",
                        "text-sm transition flex items-center gap-2",
                        disabled
                            ? "text-white/30 cursor-not-allowed"
                            : "text-[#F6F6F6] hover:bg-[#f6f6f6]/10",
                    ].join(" ")}
                    onClick={() => handleAction(a.key)}
                    >
                    <span className="text-lg">{a.icon}</span>
                    <span className="whitespace-nowrap">
                        {a.label}
                    </span>
                    </button>
                );
                })}
            </div>
            </div>

            {/* 리스트 헤더 */}
            <div className="px-6 pt-4">
            <div
                className={[
                "grid items-center",
                "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
                "gap-x-4 pb-3 text-xs text-[#F6F6F6]/60",
                ].join(" ")}
            >
                <label className="flex items-center justify-center">
                <input
                    type="checkbox"
                    className="accent-[#f6f6f6]"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                />
                </label>

                <div className="ml-4 col-span-2 border-l px-2 border-[#464646]">곡정보</div>
                <div className="hidden min-[1200px]:block text-left border-l px-2 border-[#464646]">
                앨범
                </div>
                <div className="text-right border-r px-2 border-[#464646]">길이</div>
            </div>
            </div>

            <div className="border-b border-[#464646]" />

            {/* 리스트 */}
            <div className="pb-6">
            {tracks.map((t) => (
                <div
                key={t.id}
                className={[
                    "w-full text-left",
                    "grid grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px] items-center",
                    "gap-x-4 py-3 px-6 border-b border-[#464646]",
                    "hover:bg-white/5 transition",
                ].join(" ")}
                >
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                    type="checkbox"
                    className="accent-[#f6f6f6]"
                    checked={!!checkedIds[t.id]}
                    onChange={() => toggleOne(t.id)}
                    aria-label={`${t.title} 선택`}
                    />
                </div>

                    <div className="ml-4 w-10 h-10 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]">
                        {t.album_image ? (
                        <img
                        src={t.album_image}
                        alt={t.title}
                        className="w-full h-full rounded-xl object-cover"
                        />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#F6F6F6] text-xl">
                            {t.title?.[0] ?? "?"}
                            </div>
                        )}
                    </div>

                <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">{t.title}</div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">{artist.artist_name}</div>
                </div>

                <div className="hidden min-[1200px]:block text-sm text-[#F6F6F6]/70 text-left truncate">
                    {t.album}
                </div>

                <div className="text-sm text-[#F6F6F6]/70 text-right tabular-nums">{t.duration}</div>
                </div>
            ))}
            </div>
        </section>
        </div>
    );
}
