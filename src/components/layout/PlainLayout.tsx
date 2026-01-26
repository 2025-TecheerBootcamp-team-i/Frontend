import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Player from "./Player";
import { usePlayer } from "../../player/PlayerContext";
import { useMemo, useState, useEffect, useCallback } from "react";
import { getBestAlbumCover } from "../../api/album";

export default function PlainLayout() {
    const PLAYER_H = 85;
    const location = useLocation();
    const isNowPlaying = location.pathname === "/now-playing";
    const { current } = usePlayer();

    const [mainAlbumImage, setMainAlbumImage] = useState<string | null>(null);

    // 이미지 URL 처리 함수
    const processImageUrl = useCallback((url: string | null | undefined): string | null => {
        if (!url) return null;
        const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) return url;
        if (base && url.startsWith("/")) return `${base.replace("/api/v1", "")}${url}`;
        return url;
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadAlbumCover() {
            if (!current) {
                setMainAlbumImage(null);
                return;
            }
            const albumId = (current as { albumId?: number | null }).albumId ?? null;
            const fallback = current.coverUrl ?? null;
            const best = await getBestAlbumCover(albumId, fallback);
            if (!cancelled) setMainAlbumImage(best);
        }
        loadAlbumCover();
        return () => { cancelled = true; };
    }, [current]);

    const blurredBackgroundImage = useMemo(() => {
        if (!mainAlbumImage) return null;
        return processImageUrl(mainAlbumImage);
    }, [mainAlbumImage, processImageUrl]);

    return (
        <div className="relative h-screen overflow-hidden flex flex-col bg-[#080808]">
            {/* ✅ Now Playing 일 때만 배경 블러 출력 (모든 레이아웃 구성 요소 뒤에 배치) */}
            {isNowPlaying && (
                <>
                    {blurredBackgroundImage ? (
                        <>
                            <div
                                className="pointer-events-none fixed inset-0 bg-center bg-cover z-0 transition-all duration-1000"
                                style={{
                                    backgroundImage: `url(${blurredBackgroundImage})`,
                                    filter: "blur(60px)",
                                    transform: "scale(1.2)",
                                }}
                            />
                            <div className="pointer-events-none fixed inset-0 bg-black/70 z-[1]" />
                        </>
                    ) : (
                        <div className="pointer-events-none fixed inset-0 bg-[#080808] z-0" />
                    )}
                </>
            )}

            {/* ✅ 실제 콘텐츠는 위에 (z-index 부여로 배경보다 위로) */}
            <div className="relative z-10 h-full flex flex-col">
                <Header />

                <div className="flex flex-1 min-h-0 overflow-hidden relative">
                    <main className="flex-1 min-h-0 overflow-auto relative z-10">
                        <Outlet />
                    </main>
                </div>

                <Player height={PLAYER_H} />
            </div>
        </div>
    );
}
