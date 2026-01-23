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

function MainLayout2() {
    const PLAYER_H = 85;
    const { myPlaylists, createPlaylist } = usePlaylists();
    const { current } = usePlayer();
    const [bgColors, setBgColors] = useState<string[]>([]);

    const coverUrl = useMemo(() => {
        if (!current?.coverUrl) return null;
        const url = current.coverUrl;
        const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
        if (url.startsWith("http") || url.startsWith("//")) return url;
        if (API_BASE && url.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${url}`;
        return url;
    }, [current?.coverUrl]);

    useEffect(() => {
        if (coverUrl) {
            extractPastelColors(coverUrl, 3).then(colors => setBgColors(colors));
        } else {
            setBgColors([]);
        }
    }, [coverUrl]);

    const playlists: Playlist[] = myPlaylists.map((p) => ({
        id: p.id,
        title: p.title,
        coverUrl: p.coverUrl,
        createdAt: p.createdAt,
    }));

    const handleCreatePlaylist = async () => {
        await createPlaylist();
    };

    return (
        <div className="relative h-screen overflow-hidden flex flex-col bg-[#080808]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {bgColors.length > 0 ? (
                <>
                    <div 
                        className="absolute inset-[-20%] opacity-60 blur-[120px] animate-ambient"
                        style={{ 
                            background: `radial-gradient(circle at 25% 25%, ${bgColors[0]}, transparent 60%),
                                         radial-gradient(circle at 75% 75%, ${bgColors[1]}, transparent 60%),
                                         radial-gradient(circle at 50% 50%, ${bgColors[2]}, transparent 70%)`,
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
                    animate-bgGradient
                    "
                />
            )}
        </div>

        <div className="relative z-10 h-full flex flex-col">
            <Header />
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <Sidebar playlists={playlists} onCreatePlaylist={handleCreatePlaylist} />
                <main
                    className="flex-1 min-h-0 overflow-auto"
                    style={{ paddingBottom: PLAYER_H }}
                >
                    <Outlet />
                </main>
            </div>
        </div>
        <Player height={PLAYER_H} />
        </div>
    );
}

export default MainLayout2;
