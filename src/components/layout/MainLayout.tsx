import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export type Playlist = {
    id: string;
    title: string;
    coverUrl?: string;
    createdAt: number;
    };

    function MainLayout() {
    const [playlists, setPlaylists] = useState<Playlist[]>([
        { id: "p1", title: "운동할 때", coverUrl: "", createdAt: Date.now() - 30000 },
        { id: "p2", title: "새벽 감성", coverUrl: "", createdAt: Date.now() - 20000 },
        { id: "p3", title: "출근 BGM", coverUrl: "", createdAt: Date.now() - 10000 },
    ]);

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
        <div className="h-screen overflow-hidden bg-white flex flex-col">
        <Header />

        <div className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar playlists={playlists} onCreatePlaylist={handleCreatePlaylist} />

            <main className="flex-1 min-h-0 overflow-auto p-6 pt-3">
            <Outlet />
            </main>
        </div>
        </div>
    );
}

export default MainLayout;
