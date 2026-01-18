    // src/pages/profile/MyAiSongs.tsx
    import { useEffect, useMemo, useState } from "react";
    import { useNavigate } from "react-router-dom";
    import { FaPlus } from "react-icons/fa6";
    import { IoChevronBack } from "react-icons/io5";

    import { getMyAiSongs, subscribeAiSongs } from "../../mocks/aiSongMock";
    import type { AiTrack } from "../../mocks/aiSongMock";

    type CardItem = Pick<
    AiTrack,
    "id" | "title" | "desc" | "status" | "duration" | "createdAt" | "coverUrl"
    >;

    export default function MyAiSongs() {
    const navigate = useNavigate();

    // ✅ 너희 로그인 유저로 교체
    const CURRENT_USER_ID = "me";

    const [items, setItems] = useState<CardItem[]>([]);

    useEffect(() => {
        const sync = () => {
        const list = getMyAiSongs(CURRENT_USER_ID).map((t) => ({
            id: t.id,
            title: t.title,
            desc: t.desc,
            status: t.status,
            duration: t.duration,
            createdAt: t.createdAt,
            coverUrl: t.coverUrl,
        }));
        setItems(list);
        };

        sync();
        return subscribeAiSongs(sync);
    }, []);

    const gridClass = useMemo(
        () =>
        `
            grid
            gap-x-6
            gap-y-12
            justify-between
            [grid-template-columns:repeat(4,220px)]
        `,
        []
    );

    const goCreate = () => navigate("/ai/create"); // ✅ + 누르면 AI 생성페이지
    const goBack = () => navigate(-1);

    return (
        <section className="rounded-3xl bg-[#2d2d2d]/80 border border-[#464646]">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
            {/* ✅ 왼쪽: 뒤로가기 + 타이틀 */}
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={goBack}
                className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
                title="뒤로가기"
            >
                <IoChevronBack size={20} />
            </button>

            <div className="text-lg font-semibold text-[#F6F6F6]">
                나의 AI 생성곡
            </div>
            </div>
            <button
            type="button"
            onClick={goCreate}
            className="w-9 h-9 rounded-full border border-[#464646] bg-[#3f3f3f] text-[#F6F6F6] grid place-items-center hover:bg-[#4a4a4a] transition"
            aria-label="AI 곡 생성"
            title="AI 곡 생성"
            >
            <FaPlus size={14} />
            </button>
        </div>

        <div className="mb-4 mx-4 border-b border-[#464646]" />

        <div className="px-6 pb-8 overflow-x-auto">
            <div className={gridClass}>
            {items.map((it) => (
                <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/aisong/${it.id}`)} // ✅ 상세로 연결
                className="w-[220px] text-left group"
                >
                <div className="aspect-square rounded-2xl border border-[#464646] overflow-hidden bg-[#6b6b6b]/40 group-hover:bg-[#6b6b6b]/55 transition relative">
                    {it.coverUrl ? (
                    <img src={it.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}

                    <div
                    className={[
                        "absolute left-3 top-3 px-2 py-1 rounded-full text-[11px] border backdrop-blur",
                        it.status === "Upload"
                        ? "border-[#AFDEE2]/60 bg-[#AFDEE2]/20 text-[#AFDEE2]"
                        : "border-[#5f5f5f] bg-black/25 text-[#F6F6F6]/90",
                    ].join(" ")}
                    >
                    {it.status}
                    </div>

                    <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between text-[11px] text-[#F6F6F6]/70">
                    <span className="truncate">{it.createdAt}</span>
                    <span className="ml-2 shrink-0">{it.duration}</span>
                    </div>
                </div>

                <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                    {it.title}
                </div>
                <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {it.desc || "설명 없음"}
                </div>
                </button>
            ))}

            {items.length === 0 && (
                <div className="col-span-full px-2 py-10 text-sm text-[#F6F6F6]/60">
                아직 만든 AI 곡이 없어. 오른쪽 위 + 로 만들어보자.
                </div>
            )}
            </div>
        </div>
        </section>
    );
    }
