import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Player from "./Player";

export type Playlist = {
    id: string;
    title: string;
    coverUrl?: string;
    createdAt: number;
    };

    function MainLayout() {
        const PLAYER_H = 85;

        const createInitialPlaylists = () => {
                const now = Date.now();
                return [
                { id: "p1", title: "운동할 때", createdAt: now - 30000 },
                { id: "p2", title: "새벽 감성", createdAt: now - 20000 },
                ];
        };
            
        const [playlists, setPlaylists] = useState(createInitialPlaylists);
            

    const handleCreatePlaylist = () => {
        const now = Date.now();
        const newPlaylist: Playlist = {
        id: `p-${now}`,
        title: `새 플레이리스트 ${playlists.length + 1}`,
        coverUrl: "",
        createdAt: now,
        };

        // ✅ 새로 만든 플리를 맨 앞에 넣으면, slice(0,2)에서 바로 노출됨
        setPlaylists((prev) => [newPlaylist, ...prev]);
    };

    return (
        <div className="relative h-screen overflow-hidden flex flex-col">
        {/* ✅ 움직이는 그라데이션 배경 레이어 */}
        <div
            className="
            pointer-events-none absolute inset-0
            bg-[linear-gradient(180deg,#2D2D2D_30%,#5D5D5D_100%)]
            bg-[length:200%_200%]
            animate-bgGradient
            "
        />

        {/* ✅ 실제 콘텐츠는 위에 */}
        <div className="relative z-10 h-full flex flex-col">
            <Header />

            <div className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar playlists={playlists} onCreatePlaylist={handleCreatePlaylist} />
            <main
            className="flex-1 min-h-0 overflow-auto p-4 pt-3"
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

export default MainLayout;
