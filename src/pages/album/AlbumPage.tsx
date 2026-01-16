import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import { ARTISTS } from "../../mocks/artistsMock";

import {
    getPlaylistById,
    updatePlaylist,
    subscribePlaylists,
    LIKED_SYSTEM_ID,
    getUserPlaylists,
    isAlbumLiked,
    getAlbumLikeCount,
    toggleAlbumLike,
} from "../../mocks/playlistMock";

type Track = { id: string; title: string; album: string; duration: string };
type Album = { id: string; title: string; year: string };
type ArtistData = { id: string; name: string; tracks: Track[]; albums: Album[] };
type Found = { artist: ArtistData; album: Album; tracks: Track[] } | null;

const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    // ✅ 액션바 like = 선택곡을 "나의 좋아요 플리"에 담기
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

const toSeconds = (duration: string) => {
    const [m, s] = duration.split(":").map((v) => Number(v));
    if (!Number.isFinite(m) || !Number.isFinite(s)) return 0;
    return m * 60 + s;
};

const formatTotal = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
};

function findAlbumById(albumId: string | undefined): Found {
    const id = albumId ?? "";
    const entries = Object.values(ARTISTS) as ArtistData[];

    for (const artist of entries) {
        const album = artist.albums.find((a) => a.id === id);
        if (!album) continue;

        const tracks = artist.tracks.filter((t) => t.album === album.title);
        return { artist, album, tracks };
    }
    return null;
    }

    export default function AlbumDetailPage() {
    const { albumId } = useParams();
    const { playTracks } = usePlayer();
    const navigate = useNavigate();

    const found = useMemo(() => findAlbumById(albumId), [albumId]);

    // ✅ found가 null이어도 hooks는 항상 같은 순서
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

    // ✅ 앨범 좋아요 초기 카운트(없으면 fallback으로 사용)
    const INITIAL_LIKE_COUNT = 12345;

    // ✅ 앨범 좋아요/카운트 store (playlistMock)
    const [albumLiked, setAlbumLiked] = useState(() =>
        albumId ? isAlbumLiked(albumId) : false
    );

    const [albumLikeCount, setAlbumLikeCount] = useState(() =>
        albumId ? getAlbumLikeCount(albumId, INITIAL_LIKE_COUNT) : INITIAL_LIKE_COUNT
    );

    useEffect(() => {
        if (!albumId) return;

        const sync = () => {
        setAlbumLiked(isAlbumLiked(albumId));
        setAlbumLikeCount(getAlbumLikeCount(albumId, INITIAL_LIKE_COUNT));
        };

        sync();
        return subscribePlaylists(sync); // ✅ albumLike도 emit()이므로 playlist 구독으로 충분
    }, [albumId]);

    const tracks = found?.tracks ?? [];
    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds(t.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // ✅ 담기 모달 (⚠️ if (!found) return 보다 위에 있어야 함)
    const [addOpen, setAddOpen] = useState(false);

    // ✅ 담기 대상(유저 플리만) - 구독 emit에 맞춰 목록도 동기화
    const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

    useEffect(() => {
        const syncTargets = () => setAddTargets(getUserPlaylists());
        syncTargets();
        return subscribePlaylists(syncTargets);
    }, []);

    if (!found) {
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
            <div className="text-xl font-semibold">앨범을 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{albumId ?? "(없음)"}</span>
            </div>
            </div>
        </div>
        );
    }

    const { artist, album } = found;

    const toPlayerTrack = (t: Track): PlayerTrack => ({
        id: t.id,
        title: t.title,
        artist: artist.name,
        album: t.album,
        duration: t.duration,
        audioUrl: "/audio/sample.mp3",
    });

    const checkedTracks = tracks.filter((t) => !!checkedIds[t.id]).map(toPlayerTrack);
    const selectedCount = checkedTracks.length;

    // ✅ 선택한 곡을 특정 플레이리스트에 추가
    const addSelectedToPlaylist = (playlistId: string) => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(playlistId);
        if (!curr) return;

        const incoming = checkedTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album ?? "",
        duration: t.duration ?? "0:00",
        likeCount: 0,
        kind: "track" as const,
        }));

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

    // ✅ 액션바 좋아요: 선택곡을 "나의 좋아요 플리"에 추가
    const addSelectedToLiked = () => {
        if (selectedCount === 0) return;

        const curr = getPlaylistById(LIKED_SYSTEM_ID);
        if (!curr) return;

        const incoming = checkedTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album ?? "",
        duration: t.duration ?? "0:00",
        likeCount: 0,
        kind: "track" as const,
        }));

        const exists = new Set(curr.tracks.map((t) => t.id));
        const merged = [...curr.tracks];

        for (const tr of incoming) {
        if (exists.has(tr.id)) continue;
        merged.push(tr);
        exists.add(tr.id);
        }

        updatePlaylist(LIKED_SYSTEM_ID, { tracks: merged });
        setCheckedIds({});
    };

    return (
        <div className="w-full min-w-0 overflow-x-auto">
        {/* 상단 */}
        <section className="relative mb-16 overflow-visible">
            <div className="relative h-72 bg-[#1D1D1D]/70 border-b border-[#3D3D3D] overflow-hidden">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-4 top-5 z-10 p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
                title="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>

            <div className="absolute inset-0 flex items-end">
                <div className="px-12 pb-8 flex items-end gap-10 min-w-[1100px] shrink-0">
                <div className="w-48 h-48 shrink-0" />

                <div className="flex items-end gap-5">
                    <div className="min-w-0">
                    {/* ✅ 헤더 좋아요 = "앨범 좋아요" 토글 (카드 생성 X) */}
                    <button
                        type="button"
                        onClick={() => {
                        if (!albumId) return;
                        toggleAlbumLike(albumId, INITIAL_LIKE_COUNT);
                        }}
                        className={[
                        "h-11 rounded-2xl",
                        "flex items-center gap-2",
                        "transition",
                        albumLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                        ].join(" ")}
                        aria-label="앨범 좋아요"
                        title="앨범 좋아요"
                    >
                        <MdFavorite
                        size={22}
                        className={albumLiked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"}
                        />
                        <span className="text-sm tabular-nums">
                        {albumLikeCount.toLocaleString()}
                        </span>
                    </button>

                    <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none truncate">
                        {album.title}
                    </div>
                    <div className="mt-2 text-sm text-[#F6F6F6]/60 truncate">
                        {artist.name} · {album.year} · {tracks.length}곡 · {totalPlaytime}
                    </div>
                    </div>

                    <button
                    type="button"
                    onClick={() => {
                        if (tracks.length === 0) return;
                        playTracks(tracks.map(toPlayerTrack));
                    }}
                    className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                    aria-label="앨범 재생"
                    title="재생"
                    >
                    <FaPlay size={16} />
                    </button>
                </div>
                </div>
            </div>
            </div>

            <div className="absolute left-12 top-32 w-52 h-52 rounded-3xl bg-[#777777] z-20 shadow-xl" />
        </section>

        {/* 본문 */}
        <div className="mt-12 px-4 space-y-6">
            <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#464646]">
                <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-semibold text-[#F6F6F6]">곡 전체보기</h2>
                    <div className="text-sm text-[#999999]">총 {tracks.length}곡</div>
                </div>
                </div>

                <div className="mt-4 flex flex-nowrap gap-3 overflow-x-auto no-scrollbar">
                {actions.map((a) => {
                    const disabled =
                    (a.key === "play" ||
                        a.key === "shuffle" ||
                        a.key === "like" ||
                        a.key === "add") &&
                    selectedCount === 0;

                    const onClick = () => {
                    if (a.key === "like") {
                        addSelectedToLiked();
                        return;
                    }
                    if (a.key === "play") {
                        if (selectedCount === 0) return;
                        playTracks(checkedTracks);
                        return;
                    }
                    if (a.key === "shuffle") {
                        if (selectedCount === 0) return;
                        playTracks(checkedTracks, { shuffle: true });
                        return;
                    }
                    if (a.key === "add") {
                        if (selectedCount === 0) return;
                        setAddOpen(true);
                        return;
                    }
                    };

                    return (
                    <button
                        key={a.key}
                        type="button"
                        onClick={onClick}
                        disabled={disabled}
                        className={[
                        "shrink-0 px-4 py-2 rounded-2xl",
                        "outline outline-1 outline-offset-[-1px] outline-stone-500",
                        "text-sm transition flex items-center gap-2",
                        disabled
                            ? "text-white/30 cursor-not-allowed"
                            : "text-[#F6F6F6] hover:bg-[#f6f6f6]/10",
                        ].join(" ")}
                    >
                        <span className="text-lg">{a.icon}</span>
                        <span className="whitespace-nowrap">{a.label}</span>
                    </button>
                    );
                })}
                </div>
            </div>

            <div className="px-6 pt-4">
                <div className="grid items-center grid-cols-[28px_56px_1fr_90px] gap-x-4 pb-3 text-xs text-[#F6F6F6]/60">
                <input
                    type="checkbox"
                    className="accent-[#f6f6f6]"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                />
                <div className="col-span-2 border-l px-2 border-[#464646]">곡정보</div>
                <div className="text-right border-r px-2 border-[#464646]">길이</div>
                </div>
            </div>

            <div className="border-b border-[#464646]" />

            <div className="pb-6">
                {tracks.map((t) => (
                <div
                    key={t.id}
                    className={[
                    "w-full text-left",
                    "grid grid-cols-[28px_42px_1fr_90px] items-center",
                    "gap-x-4",
                    "py-3 px-6",
                    "border-b border-[#464646]",
                    "hover:bg-white/5 transition",
                    ].join(" ")}
                >
                    <div
                    className="flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={!!checkedIds[t.id]}
                        onChange={() => toggleOne(t.id)}
                        aria-label={`${t.title} 선택`}
                        onClick={(e) => e.stopPropagation()}
                    />
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]" />

                    <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                        {t.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">{artist.name}</div>
                    </div>

                    <div className="text-sm text-[#F6F6F6]/70 text-right tabular-nums">
                    {t.duration}
                    </div>
                </div>
                ))}
            </div>
            </section>
        </div>

        {/* ✅ 담기 모달 */}
        {addOpen && (
            <div className="fixed inset-0 z-[999]">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setAddOpen(false)}
                aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                    <div className="text-base font-semibold text-[#F6F6F6]">
                    플레이리스트 선택
                    </div>
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
                        <div className="mt-2 text-xs text-[#777]">
                        (liked 같은 시스템 플리는 제외됨)
                        </div>
                    </div>
                    ) : (
                    addTargets.map((p) => (
                        <button
                        key={p.id}
                        type="button"
                        onClick={() => addSelectedToPlaylist(p.id)}
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                        >
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                            {p.title}
                        </div>
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
        </div>
    );
}
