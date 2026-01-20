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

import {
    getPlaylistById,
    getUserPlaylists,
    subscribePlaylists,
    updatePlaylist,
    LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";

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

    // ✅ PlayerContext
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

    // ✅ 담기 모달/타겟
    const [addOpen, setAddOpen] = useState(false);
    const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

    useEffect(() => {
        const sync = () => setAddTargets(getUserPlaylists());
        sync();
        return subscribePlaylists(sync);
    }, []);

    // ✅ 선택된 곡 목록 (🔥 early return 전에 있어야 함)
    const checkedTracks = useMemo(
        () => tracks.filter((t) => checkedIds[t.id]),
        [tracks, checkedIds]
    );
    const selectedCount = checkedTracks.length;

    // ✅ 데이터 로드
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

            // ✅ 새 데이터 로드되면 선택 초기화
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

    // ✅ 안전한 이름 (artist null 대비)
    const artistName = artist?.artist_name ?? "";

    // ✅ PlayerTrack 변환
    const toPlayerTrack = (t: ArtistTrack): PlayerTrack => ({
        id: t.id,
        title: t.title,
        artist: artistName,
        album: t.album,
        duration: t.duration,
        audioUrl: "/audio/sample.mp3",
    });

    // ✅ mock playlist track 변환
    const toMockTrack = (t: ArtistTrack) => ({
        id: t.id,
        title: t.title,
        artist: artistName,
        album: t.album ?? "",
        duration: t.duration ?? "0:00",
        likeCount: 0,
        kind: "track" as const,
    });

    const addSelectedToPlaylist = async (playlistId: string) => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(playlistId);
        if (!curr) return;

        const incoming = checkedTracks.map(toMockTrack);

        const exists = new Set(curr.tracks.map((x) => x.id));
        const merged = [...curr.tracks];

        for (const tr of incoming) {
        if (exists.has(tr.id)) continue;
        merged.push(tr);
        exists.add(tr.id);
        }

        updatePlaylist(playlistId, { tracks: merged });
        setAddOpen(false);
        setCheckedIds({});
    };

    const addSelectedToLiked = async () => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(LIKED_SYSTEM_ID);
        if (!curr) return;

        const incoming = checkedTracks.map(toMockTrack);

        const exists = new Set(curr.tracks.map((x) => x.id));
        const merged = [...curr.tracks];

        for (const tr of incoming) {
        if (exists.has(tr.id)) continue;
        merged.push(tr);
        exists.add(tr.id);
        }

        updatePlaylist(LIKED_SYSTEM_ID, { tracks: merged });
        setCheckedIds({});
    };

    // ✅ 액션
    const handleAction = async (key: ActionKey) => {
        if (selectedCount === 0) return;

        if (key === "play") {
        playTracks(checkedTracks.map(toPlayerTrack));
        return;
        }

        if (key === "shuffle") {
        playTracks(checkedTracks.map(toPlayerTrack), { shuffle: true });
        return;
        }

        if (key === "add") {
        setAddOpen(true);
        return;
        }

        if (key === "like") {
        await addSelectedToLiked();
        return;
        }
    };

    // ✅ early return은 이제 Hook들 아래라서 OK
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
            >
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
            <h1 className="text-xl font-semibold text-[#F6F6F6]">
                {artist.artist_name} · 전체 곡
            </h1>
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
                const disabled = selectedCount === 0;

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
                    <span className="whitespace-nowrap">{a.label}</span>
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
                    "gap-x-5 py-2 px-6 border-b border-[#464646]",
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

                    <div className="ml-4 w-12 h-12 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]">
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

                <div className="ml-3 hidden min-[1200px]:block text-sm text-[#F6F6F6]/70 text-left truncate">
                    {t.album}
                </div>

                <div className="mr-1 text-sm text-[#F6F6F6]/70 text-right tabular-nums">{t.duration}</div>
                </div>
            ))}
            </div>

            {/* ✅ 담기 모달 */}
            {addOpen && (
            <div className="fixed inset-0 z-[999] whitespace-normal">
                <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setAddOpen(false)}
                aria-label="닫기"
                />
                <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                    <div className="text-base font-semibold text-[#F6F6F6]">플레이리스트 선택</div>
                    <button
                        type="button"
                        onClick={() => setAddOpen(false)}
                        className="text-[#F6F6F6]/70 hover:text-white transition"
                        aria-label="닫기"
                    >
                        ✕
                    </button>
                    </div>

                    <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">
                    선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
                    </div>

                    <div className="max-h-[360px] overflow-y-auto border-t border-[#464646]">
                    {addTargets.length === 0 ? (
                        <div className="px-6 py-6 text-sm text-[#aaa]">
                        담을 수 있는 플레이리스트가 없어요.
                        <div className="mt-2 text-xs text-[#777]">(liked 같은 시스템 플리는 제외됨)</div>
                        </div>
                    ) : (
                        addTargets
                        .filter((p) => p.id !== LIKED_SYSTEM_ID)
                        .map((p) => (
                            <button
                            key={p.id}
                            type="button"
                            onClick={() => addSelectedToPlaylist(p.id)}
                            className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                            >
                            <div className="text-sm font-semibold text-[#F6F6F6] truncate">{p.title}</div>
                            <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                                {p.owner} · {p.isPublic ? "공개" : "비공개"}
                            </div>
                            </button>
                        ))
                    )}
                    </div>

                    <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                    <button
                        type="button"
                        onClick={() => setAddOpen(false)}
                        className="px-4 py-2 rounded-2xl text-sm text-[#F6F6F6] hover:bg-white/10 transition"
                    >
                        취소
                    </button>
                    </div>
                </div>
                </div>
            </div>
            )}
        </section>
        </div>
    );
}
