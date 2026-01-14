    import { useMemo, useState } from "react";
    import { useNavigate, useParams } from "react-router-dom";
    import { IoChevronBack } from "react-icons/io5";
    import { IoPlayCircle, IoShuffle } from "react-icons/io5";
    import { MdPlaylistAdd, MdFavorite } from "react-icons/md";

    import { ARTISTS } from "../../mocks/artistsMock";

    const actions = [
    { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
    { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
    { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
    { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
    ];

    export default function ArtistTracksPage() {
    const { artistId } = useParams();
    const navigate = useNavigate();

    const artist = useMemo(() => ARTISTS[artistId ?? ""], [artistId]);

    // ✅ 체크박스 상태
    const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

    const tracks = artist?.tracks ?? [];
    const allChecked = tracks.length > 0 && tracks.every((t) => checkedIds[t.id]);

    const toggleAll = (next: boolean) => {
        const obj: Record<string, boolean> = {};
        tracks.forEach((t) => (obj[t.id] = next));
        setCheckedIds(obj);
    };

    const toggleOne = (id: string) => {
        setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    if (!artist) {
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
            </div>
        </div>
        );
    }

    return (
        <div className="w-full min-w-0">
        {/* 상단 sticky 헤더 */}
        <div className="sticky top-0 z-20 pt-5 px-4 mb-4">
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
                {artist.name} · 전체 곡
            </h1>
            </div>
        </div>

        {/* ✅ ChartDaily 톤 + 체크박스 + 리스트 */}
        <section className="mt-4 mx-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d] overflow-hidden">
            {/* 상단 헤더 */}
            <div className="px-8 py-6 border-b border-[#464646]">
            <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-6">
                <h2 className="text-xl font-semibold text-[#F6F6F6]">곡 전체보기</h2>
                <div className="text-sm text-[#999999]">총 {tracks.length}곡</div>
                </div>
            </div>

            {/* 액션 버튼 */}
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
                    // TODO: 나중에 선택된 곡들 기준으로 동작 연결
                    const selectedIds = Object.keys(checkedIds).filter((id) => checkedIds[id]);
                    console.log(a.key, selectedIds);
                    }}
                >
                    <span className="text-lg text-[#F6F6F6]">{a.icon}</span>
                    <span className="whitespace-nowrap">{a.label}</span>
                </button>
                ))}
            </div>
            </div>

            {/* ✅ 리스트 헤더(전체선택) */}
            <div className="px-6 pt-4">
            <div
                className={[
                "grid items-center",
                "grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px]",
                "gap-x-4",
                "pb-3",
                "text-xs text-[#F6F6F6]/60",
                ].join(" ")}
            >
                {/* 전체 선택 */}
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

                {/* 1200px 이상에서만 앨범 컬럼 표시 */}
                <div className="hidden min-[1200px]:block text-left border-l px-2 border-[#464646]">앨범</div>

                <div className="text-right border-r px-2 border-[#464646]">길이</div>
            </div>
            </div>

            <div className="border-b border-[#464646]" />

            {/* 리스트 */}
            <div className="pb-6">
            {tracks.map((t) => (
                <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/track/${t.id}`)}
                className={[
                    "w-full text-left",
                    "grid grid-cols-[28px_56px_1fr_90px] min-[1200px]:grid-cols-[28px_56px_1fr_450px_90px] items-center",
                    "gap-x-4",
                    "py-3 px-6",
                    "border-b border-[#464646]",
                    "hover:bg-white/5 transition",
                ].join(" ")}
                >
                {/* 체크박스 */}
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
                    />
                </div>

                <div className="ml-4 w-10 h-10 rounded-xl bg-[#6b6b6b]/50 border border-[#464646]" />

                {/* 곡정보 */}
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#F6F6F6] truncate">
                    {t.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {artist.name}
                    </div>
                </div>

                {/* 앨범 */}
                <div className="hidden min-[1200px]:block text-sm text-[#F6F6F6]/70 text-left truncate">
                    {t.album}
                </div>

                {/* 길이 */}
                <div className="text-sm text-[#F6F6F6]/70 text-right tabular-nums">
                    {t.duration}
                </div>
                </button>
            ))}
            </div>

        </section>
        </div>
    );
}
