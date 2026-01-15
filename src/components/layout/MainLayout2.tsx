    import { Outlet, useNavigate } from "react-router-dom";
    import { useEffect, useState } from "react";
    import Header from "./Header";
    import Sidebar from "./Sidebar";
    import Player from "./Player";

    import {
    getAllPlaylists,
    subscribePlaylists,
    createPlaylist,
    } from "../../mocks/playlistMock";

    export type Playlist = {
    id: string;
    title: string;
    coverUrl?: string;
    createdAt?: number; // UI용이라 optional
    };

    function MainLayout() {
    const PLAYER_H = 85;
    const navigate = useNavigate();

    // ✅ playlistMock(store)에서 가져온 걸로만 Sidebar에 내려줌
    const [playlists, setPlaylists] = useState<Playlist[]>([]);

    useEffect(() => {
        const sync = () => {
        const list = getAllPlaylists().sort((a, b) => b.createdAt - a.createdAt).map((p) => ({
            id: p.id,
            title: p.title,
            coverUrl: p.coverUrl ?? "",
            createdAt: Date.now(), // UI용 (정렬 등에 쓰면 mock에 createdAt 저장하는 게 더 좋음)
        }));
        setPlaylists(list);
        };

        sync();
        return subscribePlaylists(sync);
    }, []);

    // ✅ + 누르면 store에 "진짜로" 생성 + 생성 직후 상세로 이동
    const handleCreatePlaylist = () => {
        const p = createPlaylist({
        title: `새 플레이리스트`,
        owner: "사용자",
        isPublic: false,
        coverUrl: "",
        });

        // ✅ 생성하면 상세로 이동 (원하면 이동 빼도 됨)
        navigate(`/playlist/${p.id}`);
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

    export default MainLayout;
