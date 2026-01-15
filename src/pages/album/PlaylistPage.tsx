    import { useEffect, useState } from "react";
    import { useNavigate, useParams } from "react-router-dom";
    import {
    getPlaylistById,
    subscribePlaylists,
    isPlaylistLiked,
    togglePlaylistLike,
    } from "../../mocks/playlistMock";

    import { IoChevronBack, IoPlayCircle, IoShuffle } from "react-icons/io5";
    import { MdFavorite } from "react-icons/md";
    import { FaPlay } from "react-icons/fa6";
    import { FiEdit3 } from "react-icons/fi";

    const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
    ];

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

   export default function PlaylistDetailPage() {
    const { playlistId } = useParams();
    const navigate = useNavigate();

    // store 변경(emit)에도 반응하게 playlist를 state로 들고 sync
    const [playlist, setPlaylist] = useState(() => getPlaylistById(playlistId));

    useEffect(() => {
        const sync = () => setPlaylist(getPlaylistById(playlistId));
        sync();
        return subscribePlaylists(sync);
    }, [playlistId]);

    

    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

    const tracks = playlist?.tracks ?? [];

    const totalSeconds = tracks.reduce((acc, t) => acc + toSeconds(t.duration), 0);
    const totalPlaytime = formatTotal(totalSeconds);

    if (!playlist) {
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
            <div className="text-xl font-semibold">플레이리스트를 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{playlistId ?? "(없음)"}</span>
            </div>
            </div>
        </div>
        );
    }
    
    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) =>
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));

    // ✅ 플리 좋아요 상태: store에서 읽기 (페이지 이동해도 유지됨)
    const liked = isPlaylistLiked(playlist.id);

    // ✅ 표시 카운트: store에 반영된 값을 그대로 사용
    const shownLikeCount = playlist.likeCount;

    // ✅ 플리 좋아요 토글: store로 (emit됨)
    const toggleLike = () => togglePlaylistLike(playlist.id);

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

            {/* 편집 버튼 */}
            <button
                type="button"
                onClick={() => navigate(`/playlist/${playlist.id}/edit`)}
                className="absolute right-4 top-5 z-10 px-4 py-2 rounded-2xl bg-white/10 text-[#F6F6F6] hover:bg-white/15 transition flex items-center gap-2"
                aria-label="플레이리스트 편집"
                title="편집"
            >
                <FiEdit3 size={16} />
                <span className="text-sm font-semibold">편집</span>
            </button>

            <div className="absolute inset-0 flex items-end">
                <div className="px-12 pb-8 flex items-end gap-10 min-w-[1100px] shrink-0">
                <div className="w-48 h-48 shrink-0" />

                <div className="flex items-end gap-5">
                    <div className="min-w-0">
                    {/* ✅ 좋아요 (플리 좋아요 토글) */}
                    {playlist.isPublic && (
                        <button
                            type="button"
                            onClick={toggleLike}
                            className={[
                            "h-11 rounded-2xl",
                            "flex items-center gap-2",
                            "transition",
                            liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/80",
                            ].join(" ")}
                            aria-label="좋아요"
                            title="좋아요"
                        >
                            <MdFavorite
                            size={22}
                            className={liked ? "text-[#AFDEE2]" : "text-[#F6F6F6]/70"}
                            />
                            <span className="text-sm tabular-nums">
                            {shownLikeCount.toLocaleString()}
                            </span>
                        </button>
                    )}


                    <div className="text-3xl font-extrabold text-[#F6F6F6] leading-none truncate">
                        {playlist.title}
                    </div>

                    <div className="mt-2 text-sm text-[#F6F6F6]/60 truncate">
                        {playlist.owner} · {playlist.isPublic ? "공개" : "비공개"} ·{" "}
                        {tracks.length}곡 · {totalPlaytime}
                    </div>
                    </div>

                    <button
                    type="button"
                    className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                    aria-label="플레이리스트 재생"
                    title="재생"
                    >
                    <FaPlay size={16} />
                    </button>
                </div>
                </div>
            </div>
            </div>

            <div
            className="
                absolute left-12 top-32
                w-52 h-52
                rounded-3xl bg-[#777777]
                z-20
                shadow-xl
            "
            />
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
                {actions.map((a) => (
                    <button
                    key={a.key}
                    type="button"
                    className="
                        shrink-0 px-4 py-2
                        rounded-2xl
                        outline outline-1 outline-offset-[-1px] outline-stone-500
                        text-sm text-[#F6F6F6] hover:bg-[#f6f6f6]/10
                        transition
                        flex items-center gap-2
                    "
                    onClick={() => {
                        const selectedIds = Object.keys(checkedIds).filter((id) => checkedIds[id]);
                        if (a.key === "like") toggleLike(); // ✅ 여기서도 플리 좋아요 토글
                        else console.log(a.key, selectedIds);
                    }}
                    >
                    <span className="text-lg text-[#F6F6F6]">{a.icon}</span>
                    <span className="whitespace-nowrap">{a.label}</span>
                    </button>
                ))}
                </div>
            </div>

            <div className="px-6 pt-4">
                <div className="grid items-center grid-cols-[28px_56px_1fr_90px] gap-x-4 pb-3 text-xs text-[#F6F6F6]/60">
                <label className="flex items-center justify-center">
                    <input
                    type="checkbox"
                    className="accent-[#f6f6f6]"
                    checked={allChecked}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="전체 선택"
                    onClick={(e) => e.stopPropagation()}
                    />
                </label>
                <div className="col-span-2 border-l px-2 border-[#464646]">곡정보</div>
                <div className="text-right border-r px-2 border-[#464646]">길이</div>
                </div>
            </div>

            <div className="border-b border-[#464646]" />

            <div className="pb-6">
                {tracks.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/track/${t.id}`)}
                    className="w-full text-left grid grid-cols-[28px_42px_1fr_90px] items-center gap-x-4 py-3 px-6 border-b border-[#464646] hover:bg-white/5 transition"
                >
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">{t.title}</div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                        {t.artist}
                        {t.album ? ` · ${t.album}` : ""}
                    </div>
                    </div>

                    <div className="text-sm text-[#F6F6F6]/70 text-right tabular-nums">{t.duration}</div>
                </button>
                ))}
            </div>
            </section>
        </div>
        </div>
    );
   }
