import { useEffect, useMemo, useRef, useState } from "react";

import { FaPlay } from "react-icons/fa6";
import { IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";

import { fetchChart, type ChartData, type ChartRow as ApiChartRow } from "../../api/chart";
import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { requireLogin } from "../../api/auth";

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

// ✅ 분초 변환 및 생성 일자
const formatDuration = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
};

const formatGeneratedAt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
        d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function ChartDaily() {
    const GRID = "grid-cols-[44px_90px_1.2fr_1fr_200px]";

    // ✅ PlayerContext
    // NOTE: enqueueTracks가 PlayerContext에 없으면 추가/노출 필요
    const { setTrackAndPlay, playTracks, enqueueTracks } = usePlayer();

    // ✅ API 상태
    const [chart, setChart] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ✅ musicId 기준 중복 제거
    const rows = useMemo(() => {
        if (!chart) return [];
        const seen = new Set<string>();
        return chart.items.filter((item) => {
        if (seen.has(item.musicId)) return false;
        seen.add(item.musicId);
        return true;
        });
    }, [chart]);

    // ✅ diff(순위 변동)
    const prevRankByIdRef = useRef<Record<string, number>>({});
    // const [diffById, setDiffById] = useState<Record<string, number>>({});

    useEffect(() => {
        let alive = true;

        const load = async () => {
        setLoading(true);
        setErrorMsg(null);

        try {
            const data = await fetchChart("daily"); // ✅ daily 호출
            if (!alive) return;

            // ✅ diff 계산(이전 스냅샷 대비)
            const prev = prevRankByIdRef.current;
            const nextDiff: Record<string, number> = {};

            for (const item of data.items) {
            const id = String(item.musicId);
            const prevRank = prev[id];
            nextDiff[id] = typeof prevRank === "number" ? prevRank - item.rank : 0;
            }

            // setDiffById(nextDiff);
            setChart(data);

            // ✅ 이번 순위를 다음 비교용으로 저장
            const nextPrev: Record<string, number> = {};
            for (const item of data.items) {
            nextPrev[String(item.musicId)] = item.rank;
            }
            prevRankByIdRef.current = nextPrev;
        } catch (err) {
            if (!alive) return;
            console.error(err);
            setChart(null);
            setErrorMsg("차트 데이터를 불러오지 못했어요.");
        } finally {
            if (alive) setLoading(false);
        }
        };

        // ✅ 일일 차트는 최초 1회만 로드 (하루마다 갱신)
        load();

        return () => {
        alive = false;
        };
    }, []);

    // ✅ PlayerTrack 변환 (ApiChartRow 필드 사용)
    const toTrack = (row: ApiChartRow): PlayerTrack => ({
        id: String(row.musicId),
        musicId: Number(row.musicId),
        title: row.musicName,
        artist: row.artistName,
        album: row.albumName,
        duration: formatDuration(row.durationSec),
        isAi: row.isAi,
        audioUrl: row.audioUrl || "/audio/sample.mp3",
        coverUrl: row.albumImage,
    });

    // ✅ 체크박스
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
    const allChecked = rows.length > 0 && rows.every((r) => checkedIds[String(r.musicId)]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        rows.forEach((r) => (obj[String(r.musicId)] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (musicId: string) => {
        setCheckedIds((prev) => ({ ...prev, [musicId]: !prev[musicId] }));
    };

    const checkedRows = useMemo(() => rows.filter((r) => !!checkedIds[String(r.musicId)]), [rows, checkedIds]);
    const checkedTracks = useMemo(() => checkedRows.map(toTrack), [checkedRows]);
    const selectedCount = checkedTracks.length;

    // ✅ 담기 모달
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

    // ✅ (추가) 재생 방식 선택 모달용 상태
    type PendingPlay = {
        key: ActionKey; // "play" | "shuffle"
        tracks: PlayerTrack[];
    };

    const [playConfirmOpen, setPlayConfirmOpen] = useState(false);
    const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);

    const runPendingPlay = (mode: "replace" | "enqueue") => {
        if (!pendingPlay) return;

        const isShuffle = pendingPlay.key === "shuffle";

        if (mode === "replace") {
        playTracks(pendingPlay.tracks, { shuffle: isShuffle });
        } else {
        enqueueTracks(pendingPlay.tracks, { shuffle: isShuffle });
        }

        setCheckedIds({});
        setPendingPlay(null);
        setPlayConfirmOpen(false);
    };

    // ✅ 액션
    const handleAction = (key: ActionKey) => {
        if (!requireLogin("로그인 후 이용 가능합니다.")) return;
        if (selectedCount === 0) return;

        // ✅ play/shuffle → 모달로 선택
        if (key === "play" || key === "shuffle") {
        setPendingPlay({ key, tracks: checkedTracks });
        setPlayConfirmOpen(true);
        return;
        }

        if (key === "add") setAddOpen(true);
        if (key === "like") addSelectedToLiked();
    };

    // ✅ 로딩/에러 UI
    if (loading) {
        return (
        <section className="whitespace-nowrap rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden p-10 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            차트 데이터를 불러오는 중...
        </section>
        );
    }

    if (errorMsg) {
        return (
        <section className="whitespace-nowrap rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden p-10 text-white shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            {errorMsg}
        </section>
        );
    }

    return (
        <section className="whitespace-nowrap rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
            <div className="min-w-[920px]">
            {/* 상단 헤더 */}
            <div className="px-10 py-8 border-b border-white/10">
                <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-8">
                    <h2 className="text-2xl font-black tracking-[0.2em] text-white uppercase opacity-90">실시간 일일 차트</h2>
                    <div className="text-sm font-medium text-white/40 tracking-wider">
                    {chart?.generatedAt ? formatGeneratedAt(chart.generatedAt) : ""}
                    </div>
                </div>
                </div>

                {/* 액션 버튼 */}
                <div className="mt-6 flex flex-nowrap gap-4 overflow-x-auto no-scrollbar">
                {actions.map((a) => {
                    const disabled = selectedCount === 0;

                    return (
                    <button
                        key={a.key}
                        type="button"
                        onClick={() => handleAction(a.key)}
                        disabled={disabled}
                        className={[
                        "shrink-0 px-5 py-2.5 rounded-2xl border border-white/10",
                        "text-sm font-bold transition-all duration-300 flex items-center gap-2.5",
                        disabled ? "text-white/20 border-white/5 cursor-not-allowed" : "text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20",
                        ].join(" ")}
                    >
                        <span className="text-xl">{a.icon}</span>
                        <span className="whitespace-nowrap tracking-tight">{a.label}</span>
                    </button>
                    );
                })}
                </div>
            </div>

            {/* 테이블 헤더 */}
            <div>
                <div className={`grid ${GRID} items-center justify-center py-4 px-10 text-[13px] font-black tracking-widest text-white/30 uppercase`}>
                {/* 전체선택 */}
                <div className="flex items-center justify-center">
                    <input
                    type="checkbox"
                    className="accent-[#AFDEE2] w-4 h-4 cursor-pointer"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="pl-2 whitespace-nowrap border-l border-white/10">순위</span>
                </div>

                <div className="pl-2 border-l border-white/10">곡정보</div>
                <div className="pl-2 border-l border-white/10">아티스트</div>
                <div className="pl-2 border-l border-white/10">앨범</div>
                </div>

                <div className="border-b border-white/10" />
            </div>

            {/* 리스트 */}
            <div className="px-4 py-4">
                <div className="space-y-1">
                {rows.map((row) => (
                    <div
                    key={row.musicId}
                    className={`
                        group grid ${GRID} items-center px-6 py-3 rounded-2xl
                        transition-all duration-300 hover:bg-white/[0.08]
                        ${row.rank % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"}
                    `}
                    >
                    {/* 체크 */}
                    <div className="flex items-center justify-center">
                        <input
                        type="checkbox"
                        className="accent-[#AFDEE2] w-4 h-4 cursor-pointer"
                        checked={!!checkedIds[String(row.musicId)]}
                        onChange={() => toggleOne(String(row.musicId))}
                        aria-label={`${row.rank}위 선택`}
                        />
                    </div>

                    {/* 순위 + 변동 + hover 재생 */}
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 flex items-center justify-center">
                        <span className="text-[15px] font-black text-white/90 transition-opacity group-hover:opacity-0 tabular-nums">
                            {row.rank}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                            e.stopPropagation();
                            setTrackAndPlay(toTrack(row));
                            }}
                            className="absolute opacity-0 transition-all duration-300 group-hover:opacity-100 text-[#AFDEE2] hover:scale-125"
                            aria-label={`${row.musicName} 재생`}
                            title="재생"
                        >
                            <FaPlay size={18} />
                        </button>
                        </div>

                        <div className="pl-1 text-[11px] font-black w-10">
                        {(() => {
                            const change = row.rankChange;

                            if (change === null || change === 0) return <span className="text-white/20">—</span>;
                            if (change > 0) return <span className="text-red-400">▲{change}</span>;
                            if (change < 0) return <span className="text-blue-400">▼{Math.abs(change)}</span>;
                            return <span className="text-white/20">—</span>;
                        })()}
                        </div>
                    </div>

                    {/* 곡정보 */}
                    <div className="flex pl-2 items-center gap-5 min-w-0">
                        <div className="relative h-14 w-14 rounded-xl bg-white/10 shrink-0 overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-500">
                            {row.albumImage ? (
                            <img
                                src={row.albumImage}
                                alt={row.albumName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = "block";
                                }}
                            />
                            ) : null}
                            <div className={`w-full h-full bg-white/5 shrink-0 ${row.albumImage ? "hidden" : ""}`} />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="min-w-0">
                        <div className="text-[15px] font-bold text-white/95 truncate tracking-tight group-hover:text-[#AFDEE2] transition-colors">
                            {row.musicName}
                            {row.isAi && (
                            <span className="shrink-0 ml-3 text-[10px] font-black px-2 py-0.5 rounded-md bg-[#E4524D]/20 text-[#E4524D] border border-[#E4524D]/20 uppercase">
                                AI
                            </span>
                            )}
                        </div>
                        <div className="text-[12px] font-medium text-white/40 truncate tracking-wide mt-1 md:hidden">{row.artistName}</div>
                        </div>
                    </div>

                    {/* 아티스트 */}
                    <div className="pl-2 text-[14px] font-semibold text-white/60 truncate group-hover:text-white/80 transition-colors">{row.artistName}</div>

                    {/* 앨범 */}
                    <div className="pl-2 text-[14px] font-semibold text-white/40 truncate group-hover:text-white/60 transition-colors">{row.albumName}</div>
                    </div>
                ))}
                </div>
            </div>
            </div>
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

        {/* ✅ 재생 방식 선택 모달 */}
        {playConfirmOpen && pendingPlay && (
            <div className="fixed inset-0 z-[999] whitespace-normal">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                setPlayConfirmOpen(false);
                setPendingPlay(null);
                }}
                aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[440px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                    <div className="text-base font-semibold text-[#F6F6F6]">재생 방식 선택</div>
                    <button
                    type="button"
                    onClick={() => {
                        setPlayConfirmOpen(false);
                        setPendingPlay(null);
                    }}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                    >
                    ✕
                    </button>
                </div>

                <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">
                    선택한 {pendingPlay.tracks.length}곡을 {pendingPlay.key === "shuffle" ? "셔플로 " : ""}어떻게
                    재생할까요?
                </div>

                <div className="px-6 pb-6 grid grid-cols-1 gap-3">
                    <button
                    type="button"
                    onClick={() => runPendingPlay("replace")}
                    className="w-full px-4 py-3 rounded-2xl text-sm text-[#F6F6F6] outline outline-1 outline-[#464646] hover:bg-white/10 transition text-left"
                    >
                    <div className="font-semibold text-[#afdee2]">현재 재생 대기목록 지우고 재생</div>
                    <div className="mt-1 text-xs text-[#999]">
                        지금 재생 대기목록을 초기화하고 선택한 곡들로 새로 재생합니다.
                    </div>
                    </button>

                    <button
                    type="button"
                    onClick={() => runPendingPlay("enqueue")}
                    className="w-full px-4 py-3 rounded-2xl text-sm text-[#F6F6F6] outline outline-1 outline-[#464646] hover:bg-white/10 transition text-left"
                    >
                    <div className="font-semibold text-[#afdee2]">재생 대기목록 맨 뒤에 추가</div>
                    <div className="mt-1 text-xs text-[#999]">
                        현재 재생은 유지하고, 선택한 곡들을 재생 대기 목록 마지막에 둡니다.
                    </div>
                    </button>
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                    <button
                    type="button"
                    onClick={() => {
                        setPlayConfirmOpen(false);
                        setPendingPlay(null);
                    }}
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
    );
}
