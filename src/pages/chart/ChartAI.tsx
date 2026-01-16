import { useEffect, useMemo, useState } from "react";

import { FaPlay } from "react-icons/fa6";
import { IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";

import { AI } from "../../mocks/chart";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

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

export default function ChartAI() {
    const GRID = "grid-cols-[44px_90px_1.2fr_1fr_200px]";
    const rows = useMemo(() => AI, []);

    const { setTrackAndPlay, playTracks } = usePlayer();

    type ChartRow = (typeof AI)[number];

    const toTrack = (row: ChartRow): PlayerTrack => {
        const coverUrl =
        "coverUrl" in row && typeof row.coverUrl === "string" ? row.coverUrl : undefined;

        const audioUrl =
        "audioUrl" in row && typeof row.audioUrl === "string" ? row.audioUrl : "/audio/sample.mp3";

        return {
        id: row.id,
        title: row.title,
        artist: row.artist,
        album: "album" in row && typeof row.album === "string" ? row.album : undefined,
        duration: row.duration,
        coverUrl,
        audioUrl,
        };
    };

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const allChecked = rows.length > 0 && rows.every((r) => checkedIds[r.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        rows.forEach((r) => (obj[r.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const checkedRows = useMemo(() => rows.filter((r) => !!checkedIds[r.id]), [rows, checkedIds]);
    const checkedTracks = useMemo(() => checkedRows.map(toTrack), [checkedRows]);
    const selectedCount = checkedTracks.length;

    // ✅ 담기 모달 (section 밖에 렌더해서 whitespace-nowrap 영향 제거)
    const [addOpen, setAddOpen] = useState(false);
    const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

    useEffect(() => {
        const syncTargets = () => setAddTargets(getUserPlaylists());
        syncTargets();
        return subscribePlaylists(syncTargets);
    }, []);

    // ✅ 담기(선택곡 → 특정 플리)
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

    // ✅ 좋아요(선택곡 → liked 시스템 플리)
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

    const handleAction = (key: ActionKey) => {
        if (selectedCount === 0) return;

        if (key === "play") playTracks(checkedTracks);
        if (key === "shuffle") playTracks(checkedTracks, { shuffle: true });
        if (key === "add") setAddOpen(true);
        if (key === "like") addSelectedToLiked();
    };

    return (
        <>
        <section className="whitespace-nowrap rounded-2xl bg-[#2d2d2d]/80 overflow-hidden">
            <div className="overflow-x-auto">
            <div className="min-w-[920px]">
                {/* 상단 헤더 */}
                <div className="px-8 py-6 border-b border-[#464646]">
                <div className="flex items-end justify-between gap-4">
                    <div className="flex items-center gap-6">
                    <h2 className="text-xl font-semibold text-[#F6F6F6]">실시간 AI 음악 차트</h2>
                    <div className="text-sm text-[#999999]">26.01.07 14:00</div>
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
                        onClick={() => handleAction(a.key)}
                        disabled={disabled}
                        className={[
                            "shrink-0 px-4 py-2 rounded-2xl outline outline-1 outline-offset-[-1px] outline-stone-500",
                            "text-sm transition flex items-center gap-2",
                            disabled ? "text-white/30 cursor-not-allowed" : "text-[#F6F6F6] hover:bg-[#f6f6f6]/10",
                        ].join(" ")}
                        >
                        <span className="text-lg">{a.icon}</span>
                        <span className="whitespace-nowrap">{a.label}</span>
                        </button>
                    );
                    })}
                </div>
                </div>

                {/* 테이블 헤더 */}
                <div>
                <div className={`grid ${GRID} items-center justify-center py-3 px-3 text-sm text-[#f6f6f6]`}>
                    <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        className="accent-[#f6f6f6]"
                        checked={allChecked}
                        onChange={(e) => toggleAll(e.target.checked)}
                        aria-label="전체 선택"
                    />
                    </div>

                    <div className="flex items-center gap-2">
                    <span className="pl-2 whitespace-nowrap border-l border-[#E6E6E6]/20">순위</span>
                    </div>

                    <div className="pl-2 border-l border-[#E6E6E6]/20">곡정보</div>
                    <div className="pl-2 border-l border-[#E6E6E6]/20">아티스트</div>
                    <div className="pl-2 border-l border-[#E6E6E6]/20">앨범</div>
                </div>

                <div className="border-b border-[#464646]" />
                </div>

                {/* 리스트 */}
                <div>
                <div className="divide-y divide-[#464646]">
                    {rows.map((row) => (
                    <div
                        key={row.id}
                        className={`
                        group grid ${GRID} items-center px-3 py-3
                        ${row.rank % 2 === 0 ? "bg-[#2d2d2d]/80" : "bg-[#3b3b3b]/80"}
                        `}
                    >
                        {/* 체크 */}
                        <div className="flex items-center justify-center">
                        <input
                            type="checkbox"
                            className="accent-[#f6f6f6]"
                            checked={!!checkedIds[row.id]}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`${row.rank}위 선택`}
                        />
                        </div>

                        {/* 순위 + 변동 + hover 재생 */}
                        <div className="flex items-center gap-3">
                        <div className="relative w-8 flex items-center justify-center">
                            <span className="text-sm text-[#F6F6F6] transition-opacity group-hover:opacity-0">
                            {row.rank}
                            </span>
                            <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTrackAndPlay(toTrack(row));
                            }}
                            className="absolute opacity-0 transition-opacity group-hover:opacity-100 text-[#AFDEE2]"
                            aria-label={`${row.title} 재생`}
                            title="재생"
                            >
                            <FaPlay />
                            </button>
                        </div>

                        <div className="pl-1 text-xs font-medium w-10">
                            {row.diff > 0 && <span className="text-red-500">▲ {row.diff}</span>}
                            {row.diff < 0 && <span className="text-blue-500">▼ {Math.abs(row.diff)}</span>}
                            {row.diff === 0 && <span className="pl-1 text-[#AAAAAA]">—</span>}
                        </div>
                        </div>

                        {/* 곡정보 */}
                        <div className="pl-2 flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#777777] shrink-0" />
                        <div className="min-w-0">
                            <div className="text-sm text-[#F6F6F6] truncate">
                            {row.title}
                            {row.isAI && (
                                <span className="shrink-0 ml-3 text-xs px-2 py-[1px] rounded-full bg-[#E4524D]/20 text-[#E4524D]">
                                AI
                                </span>
                            )}
                            </div>
                            <div className="text-xs text-[#999999] truncate md:hidden">{row.artist}</div>
                        </div>
                        </div>

                        {/* 아티스트 */}
                        <div className="pl-2 text-sm text-[#F6F6F6] truncate">{row.artist}</div>

                        {/* 앨범 */}
                        <div className="pl-2 text-sm text-[#F6F6F6] truncate">{row.album}</div>
                    </div>
                    ))}
                </div>
                </div>
            </div>
            </div>
        </section>

        {/* ✅ 담기 모달 (section 밖이라 세로로 정상) */}
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

                <div className="max-h-[360px] overflow-y-auto overflow-x-hidden whitespace-normal border-t border-[#464646]">
                    {addTargets.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-[#aaa]">
                        담을 수 있는 플레이리스트가 없어요.
                        <div className="mt-2 text-xs text-[#777]">(liked 같은 시스템 플리는 제외됨)</div>
                    </div>
                    ) : (
                    addTargets.map((p) => (
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
        </>
    );
}
