import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Player from "./Player";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { usePlayer } from "../../player/PlayerContext";
import { extractPastelColors, generateAnalogousPalette } from "../../utils/color";

import { getTrackVibe, type VibeConfig } from "../../utils/vibe";

export type Playlist = {
    id: string;
    title: string;
    coverUrl?: string;
    createdAt?: number;
};

function MainLayout() {
    const PLAYER_H = 85;
    const { myPlaylists } = usePlaylists();
    const { current } = usePlayer();
    const [dominantColor, setDominantColor] = useState<string>('#1d1d1d');
    const [blobColors, setBlobColors] = useState<string[]>([]);
    const [vibeConfig, setVibeConfig] = useState<VibeConfig>({ speed: 20, intensity: 1, mood: 'neutral' });

    const coverUrl = useMemo(() => {
        if (!current?.coverUrl) return null;
        const url = current.coverUrl;
        const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

        if (url.startsWith("http") || url.startsWith("//")) return url;
        if (API_BASE && url.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${url}`;
        return url;
    }, [current?.coverUrl]);

    useEffect(() => {
        if (!coverUrl) return;

        let cancelled = false;
        let blobTimeout: ReturnType<typeof setTimeout>;

        // 1. color extraction (1 color)
        // 2. vibe analysis
        Promise.all([
            extractPastelColors(coverUrl, 1),
            current?.musicId ? getTrackVibe(current.musicId).catch(() => null) : Promise.resolve(null)
        ]).then(([colors, vibe]) => {
            if (cancelled) return;

            if (colors.length > 0) {
                // Generate 3 harmonious colors
                const palette = generateAnalogousPalette(colors[0], 3);

                // 1. Change base color immediately (slow transition handled by CSS)
                setDominantColor(palette[0]);

                // 2. Change blobs after base color has mostly transitioned (e.g. 0.5s delay)
                blobTimeout = setTimeout(() => {
                    if (!cancelled) setBlobColors([palette[1], palette[2]]);
                }, 500);
            }

            if (vibe) {
                setVibeConfig(vibe);
            } else {
                setVibeConfig({ speed: 20, intensity: 1, mood: 'neutral' });
            }
        });

        return () => {
            cancelled = true;
            clearTimeout(blobTimeout);
        };
    }, [coverUrl, current?.musicId]);



    const playlists: Playlist[] = myPlaylists.map((p) => ({
        id: p.id,
        title: p.title,
        coverUrl: p.coverUrl,
        createdAt: p.createdAt,
    }));

    return (
        <div className="relative h-screen overflow-hidden flex flex-col bg-[#080808]">
            {/* ✅ Ambient Background (뷰포트 전체) - Enhanced Shimmer & Transition */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-[3000ms] ease-in-out"
                style={{ background: dominantColor || '#1d1d1d' }}
            >
                {blobColors.length > 0 ? (
                    <>
                        {/* Layer 0: Secondary Color Blob (Static Smooth Transition) */}
                        <div
                            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-40 blur-[120px] transition-colors duration-[3000ms] ease-in-out"
                            style={{
                                backgroundColor: blobColors[0] || 'transparent',
                            }}
                        />

                        {/* Layer 0.5: Tertiary Color Blob (Static Smooth Transition) */}
                        <div
                            className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full opacity-40 blur-[120px] transition-colors duration-[3000ms] ease-in-out"
                            style={{
                                backgroundColor: blobColors[1] || 'transparent',
                            }}
                        />

                        {/* Layer 1: Soft Light Overlay (Texture) - Static */}
                        <div
                            className="pointer-events-none absolute inset-0 
                            opacity-30 mix-blend-overlay
                            bg-[linear-gradient(120deg,rgba(255,255,255,0.3),rgba(255,255,255,0.1),transparent)]
                            bg-[length:260%_260%]"
                        />

                        {/* ✅ Ink Spread Effect (Transient on track change) - 3 Dispersed Blobs */}
                        <div key={current?.musicId || 'no-track'} className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                            {/* Blob 1: Top Left */}
                            <div
                                className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full blur-[80px] animate-ink"
                                style={{
                                    background: `radial-gradient(circle, ${dominantColor} 0%, transparent 70%)`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            />
                            {/* Blob 2: Middle Right */}
                            <div
                                className="absolute top-[40%] right-[10%] w-[450px] h-[450px] rounded-full blur-[80px] animate-ink"
                                style={{
                                    background: `radial-gradient(circle, ${dominantColor} 0%, transparent 70%)`,
                                    animationDelay: '0.2s',
                                    transform: 'translate(50%, -50%)'
                                }}
                            />
                            {/* Blob 3: Bottom Center/Left */}
                            <div
                                className="absolute bottom-[10%] left-[40%] w-[550px] h-[550px] rounded-full blur-[80px] animate-ink"
                                style={{
                                    background: `radial-gradient(circle, ${dominantColor} 0%, transparent 70%)`,
                                    animationDelay: '0.4s',
                                    transform: 'translate(-50%, 50%)'
                                }}
                            />
                        </div>

                        {/* Layer 2: Darker/Blur Overlay (Depth) */}
                        <div
                            className="pointer-events-none absolute inset-0 
                            opacity-40 blur-2xl
                            bg-[linear-gradient(to_bottom,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.5)_100%)]
                            animate-bgShift2"
                            style={{ animationDuration: `${vibeConfig.speed * 2}s` }}
                        />

                        {/* Layer 4: Bottom Fade */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-[#080808]" />
                    </>
                ) : (
                    <div
                        className="
                absolute inset-0
                bg-[linear-gradient(180deg,#1d1d1d_30%,#5D5D5D_100%)]
                bg-[length:200%_200%]
                "
                    />
                )}
            </div>

            {/* ✅ content 영역 */}
            <div className="relative z-10 flex flex-col flex-1 min-h-0">
                <Header />

                <div className="flex flex-1 min-h-0">
                    <Sidebar />

                    {/* ✅ 스크롤은 여기(main)만 */}
                    <main className="flex-1 p-4 pt-3 min-h-0 overflow-y-auto" style={{ paddingBottom: PLAYER_H }}>
                        <Outlet context={{ playlists }} />
                    </main>
                </div>
            </div>

            {/* ✅ Player는 고정 */}
            <div className="fixed bottom-0 left-0 w-full z-50">
                <Player height={PLAYER_H} />
            </div>
        </div>
    );
}

export default MainLayout;
