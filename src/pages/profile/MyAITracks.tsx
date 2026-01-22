    // src/pages/profile/MyAiSongs.tsx
    import { useEffect, useMemo, useState } from "react";
    import { useNavigate } from "react-router-dom";
    import { FaPlus } from "react-icons/fa6";
    import { IoChevronBack } from "react-icons/io5";

    import { fetchUserAiMusic } from "../../api/user";
    import { getCurrentUserId } from "../../utils/auth";

    type CardItem = {
        id: string;
        title: string;
        desc: string;
        status: "Upload" | "Draft";
        duration: string;
        createdAt: string;
        coverUrl?: string;
    };

    // duration을 초 단위에서 "mm:ss" 형식으로 변환
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

// 날짜를 한국어 형식으로 변환 (연도 제외)
const formatKoreanDate = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch {
        return dateString;
    }
};

    export default function MyAiSongs() {
    const navigate = useNavigate();
    const [items, setItems] = useState<CardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAiMusic = async () => {
            const userId = getCurrentUserId();
            if (!userId) {
                setError("로그인이 필요합니다.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await fetchUserAiMusic(userId);
                
                // 최신순으로 정렬 (created_at 기준 내림차순)
                const sortedData = [...data].sort((a, b) => {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    return dateB - dateA;
                });
                
                // API 응답을 CardItem 형식으로 변환
                const mapped: CardItem[] = sortedData.map((music) => ({
                    id: music.music_id.toString(),
                    title: music.music_name || "제목 없음",
                    desc: music.ai_info?.input_prompt || music.ai_info?.converted_prompt || "설명 없음",
                    status: music.audio_url ? "Upload" : "Draft",
                    duration: formatDuration(music.duration || 0),
                    createdAt: formatKoreanDate(music.created_at),
                    coverUrl: music.album_image_square || undefined,
                }));

                setItems(mapped);
            } catch (err) {
                console.error("AI 음악 목록 조회 실패:", err);
                setError("AI 음악 목록을 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadAiMusic();
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
            {loading ? (
                <div className="col-span-full px-2 py-10 text-sm text-[#F6F6F6]/60 text-center">
                    로딩 중...
                </div>
            ) : error ? (
                <div className="col-span-full px-2 py-10 text-sm text-red-400 text-center">
                    {error}
                </div>
            ) : (
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

                                <div className="absolute left-3 right-3 bottom-3 flex items-center justify-end text-[11px] text-[#F6F6F6]/70">
                                    <span className="shrink-0">{it.duration}</span>
                                </div>
                            </div>

                            <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                                {it.title}
                            </div>
                        </button>
                    ))}

                    {items.length === 0 && (
                        <div className="col-span-full px-2 py-10 text-sm text-[#F6F6F6]/60 text-center">
                            아직 만든 AI 곡이 없어요. AI로 멋진 곡을 만들어보세요!
                        </div>
                    )}
                </div>
            )}
        </div>
        </section>
    );
    }
