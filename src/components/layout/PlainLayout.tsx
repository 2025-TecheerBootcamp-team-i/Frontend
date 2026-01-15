import { Outlet } from "react-router-dom";
import Header from "./Header";
import Player from "./Player";

export default function PlainLayout() {
    const PLAYER_H = 85;

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
