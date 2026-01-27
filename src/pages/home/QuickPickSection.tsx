import { useEffect, useState } from "react";
import { HorizontalScroller } from "../../components/common/HorizontalScroller";
import { getCurrentUserId } from "../../utils/auth";
import { fetchTopTags, type TopTag } from "../../api/user";
import { searchByTags, type TagSearchResult } from "../../api/music";
import { usePlayer, type PlayerTrack } from "../../player/PlayerContext";

interface QuickPickItem {
    tag: TopTag;
    music: TagSearchResult;
}

// 배열 셔플 함수
function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function QuickPickSection() {
    const { setTrackAndPlay } = usePlayer();
    const [items, setItems] = useState<QuickPickItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);

    useEffect(() => {
        const id = getCurrentUserId();
        setUserId(id);
    }, []);

    useEffect(() => {
        if (!userId) return;

        let alive = true;

        (async () => {
            try {
                setLoading(true);

                // 1. 사용자 Top 태그 통계 조회
                const userTags = await fetchTopTags(userId, "all");

                if (!alive || userTags.length === 0) {
                    setItems([]);
                    return;
                }

                // 2. 8개가 안 되면 사용자 태그 중에서 랜덤으로 더 뽑기
                let allTags: TopTag[] = [...userTags];

                if (allTags.length < 8) {
                    const needed = 8 - allTags.length;
                    // 사용자 태그 중에서 랜덤으로 추가 선택
                    const shuffledUserTags = shuffleArray(userTags);
                    const extraTags = shuffledUserTags.slice(0, needed);
                    allTags = [...allTags, ...extraTags];
                }

                // 3. 각 태그로 음악 검색 (중복 방지를 위해 순차 처리)
                const usedMusicIds = new Set<number>();
                const validItems: QuickPickItem[] = [];

                for (const tag of allTags) {
                    if (!alive) break;
                    if (validItems.length >= 8) break;

                    try {
                        // 여러 곡을 가져와서 중복되지 않는 첫 번째 곡 선택
                        const searchResults = await searchByTags(tag.tag_key, 20);

                        for (const music of searchResults) {
                            if (!usedMusicIds.has(music.music_id)) {
                                usedMusicIds.add(music.music_id);
                                validItems.push({ tag, music });
                                break;
                            }
                        }
                    } catch {
                        // 검색 실패 시 해당 태그 스킵
                        continue;
                    }
                }

                if (!alive) return;

                setItems(validItems);
            } catch (err) {
                console.error("QuickPick load failed:", err);
                if (alive) setItems([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [userId]);

    // 로그인 안 됐으면 숨김
    if (!userId) return null;

    if (loading) {
        return (
            <section className="mb-6">
                <div className="flex items-center justify-between mb-0">
                    <h2 className="text-3xl font-bold text-white px-4 mt-2">빠른 선곡</h2>
                </div>
                <HorizontalScroller gradientFromClass="from-[#121212]">
                    <div className="flex gap-4 min-w-max px-2 pt-2 pb-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="w-[180px] h-[180px] rounded-[24px] bg-white/5 animate-pulse"
                            />
                        ))}
                    </div>
                </HorizontalScroller>
            </section>
        );
    }

    if (items.length === 0) return null;

    const handlePlay = (item: QuickPickItem) => {
        const track: PlayerTrack = {
            id: `quick-${item.music.music_id}`,
            title: item.music.music_name,
            artist: item.music.artist_name || "Unknown Artist",
            album: item.music.album_name || undefined,
            coverUrl:
                item.music.image_large_square ||
                item.music.image_square ||
                item.music.album_image ||
                undefined,
            audioUrl: item.music.audio_url || undefined,
            musicId: item.music.music_id,
        };
        setTrackAndPlay(track);
    };

    const getImageUrl = (music: TagSearchResult): string | undefined => {
        return music.image_large_square || music.image_square || music.album_image || undefined;
    };

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-0">
                <h2 className="text-3xl font-bold text-white px-4 mt-2">빠른 선곡</h2>
            </div>

            <HorizontalScroller gradientFromClass="from-[#121212]">
                <div className="flex gap-4 min-w-max px-2 pt-2 pb-8">
                    {items.map((item, idx) => {
                        const imageUrl = getImageUrl(item.music);

                        return (
                            <div
                                key={`${item.tag.tag_key}-${idx}`}
                                className={`
                                    relative
                                    w-[180px] h-[180px]
                                    rounded-[24px]
                                    cursor-pointer
                                    transition-transform duration-300 ease-out
                                    hover:scale-105
                                    overflow-hidden
                                    transform-gpu
                                    shadow-lg
                                    bg-cover bg-center
                                    group
                                `}
                                style={{
                                    backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined,
                                    backgroundColor: imageUrl ? undefined : "#333",
                                }}
                                onClick={() => handlePlay(item)}
                            >
                                {/* Gradient overlay for text readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                                {/* Tag label at top */}
                                <div className="absolute top-3 left-3 right-3 z-10">
                                    <span className="inline-block px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-xs font-medium truncate max-w-full">
                                        #{item.tag.tag_key}
                                    </span>
                                </div>

                                {/* Song info at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                                    <div className="text-white font-semibold text-sm leading-tight truncate">
                                        {item.music.music_name}
                                    </div>
                                    <div className="text-white/70 text-xs truncate mt-0.5">
                                        {item.music.artist_name || "Unknown Artist"}
                                    </div>
                                </div>

                                {/* Play overlay on hover */}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-white ml-1"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </HorizontalScroller>
        </section>
    );
}
