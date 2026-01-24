import { Outlet } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Player from "./Player";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { usePlayer } from "../../player/PlayerContext";
import { extractPastelColors } from "../../utils/color";

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
    const [bgColors, setBgColors] = useState<string[]>([]);

    // ✅ 앨범 커버 URL 처리 로직
    const coverUrl = useMemo(() => {
        if (!current?.coverUrl) return null;
        const url = current.coverUrl;
        const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

        if (url.startsWith("http") || url.startsWith("//")) return url;
        if (API_BASE && url.startsWith("/"))
            return `${API_BASE.replace("/api/v1", "")}${url}`;
        return url;
    }, [current?.coverUrl]);

    // ✅ 색상 추출: coverUrl 있을 때만 실행 (effect 안에서 동기 setState 제거)
    useEffect(() => {
        if (!coverUrl) return;

        let cancelled = false;

        extractPastelColors(coverUrl, 3).then((colors) => {
            if (!cancelled) setBgColors(colors);
        });

        return () => {
            cancelled = true;
        };
    }, [coverUrl]);

    // ✅ coverUrl 없을 땐 그냥 빈 배열로 취급 (setBgColors([]) 안 함)
    const effectiveBgColors = coverUrl ? bgColors : [];

    // ✅ Context의 플레이리스트를 Sidebar 형식으로 변환
    const playlists: Playlist[] = myPlaylists.map((p) => ({
        id: p.id,
        title: p.title,
        coverUrl: p.coverUrl,
        createdAt: p.createdAt,
    }));



    return (
        <div className="relative min-h-screen flex flex-col bg-[#080808]">
            {/* ✅ Ambient Background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden fixed">
                {effectiveBgColors.length > 0 ? (
                    <>
                        <div
                            className="absolute inset-[-20%] opacity-60 blur-[120px]"
                            style={{
                                background: `radial-gradient(circle at 25% 25%, ${effectiveBgColors[0]}, transparent 60%),
                                radial-gradient(circle at 75% 75%, ${effectiveBgColors[1]}, transparent 60%),
                                radial-gradient(circle at 50% 50%, ${effectiveBgColors[2]}, transparent 70%)`,
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-[#080808]/95" />
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

            <div className="relative z-10 flex flex-col flex-1">
                <Header />
                <div className="flex flex-1">
                    <Sidebar />
                    <main
                        className="flex-1 p-4 pt-3"
                        style={{ paddingBottom: PLAYER_H }}
                    >
                        <Outlet context={{ playlists }} />
                    </main>
                </div>
            </div>

            <div className="fixed bottom-0 w-full z-50">
                <Player height={PLAYER_H} />
            </div>
        </div>
    );
}

export default MainLayout;
