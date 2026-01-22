import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Player from "./Player";
import { usePlaylists } from "../../contexts/PlaylistContext";

export type Playlist = {
    id: string;
    title: string;
    coverUrl?: string;
    createdAt?: number;
};

function MainLayout() {
    const PLAYER_H = 85;
    const { myPlaylists, createPlaylist } = usePlaylists();

    // Context의 플레이리스트를 Sidebar 형식으로 변환
    const playlists: Playlist[] = myPlaylists.map((p) => ({
        id: p.id,
        title: p.title,
        coverUrl: p.coverUrl,
        createdAt: p.createdAt,
    }));

    // + 버튼 클릭 시 플레이리스트 생성
    const handleCreatePlaylist = async () => {
        await createPlaylist();
    };

    return (
        <div className="relative h-screen overflow-hidden flex flex-col">
        {/* ✅ 움직이는 그라데이션 배경 레이어 */}
        <div
            className="
            pointer-events-none absolute inset-0
            bg-[linear-gradient(180deg,#1d1d1d_30%,#5D5D5D_100%)]
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
