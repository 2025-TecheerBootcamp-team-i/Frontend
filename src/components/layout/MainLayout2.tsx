import { Outlet } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Player from "./Player";
import { usePlayer } from "../../player/PlayerContext";
import { extractPastelColors } from "../../utils/color";

function MainLayout2() {
    const PLAYER_H = 85;
    const { current } = usePlayer();
    const [bgColors, setBgColors] = useState<string[]>([]);

    const coverUrl = useMemo(() => {
        const raw = current?.coverUrl;
        if (!raw) return null;

        const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

        if (raw.startsWith("http") || raw.startsWith("//")) return raw;
        if (API_BASE && raw.startsWith("/")) return `${API_BASE.replace("/api/v1", "")}${raw}`;
        return raw;
    }, [current?.coverUrl]);

    useEffect(() => { 
        if (coverUrl) 
            { extractPastelColors(coverUrl, 3).then(colors => setBgColors(colors)); } 
        else { 
            // eslint-disable-next-line react-hooks/set-state-in-effect 
            setBgColors([]); 
        } 
    }, [coverUrl]);

    return (
        <div className="relative h-screen overflow-hidden flex flex-col bg-[#080808]">
        {/* background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {effectiveBgColors.length > 0 ? (
            <>
                <div
                className="absolute inset-[-20%] opacity-60 blur-[120px] animate-ambient"
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
                animate-bgGradient
                "
            />
            )}
        </div>

        {/* content */}
        <div className="relative z-10 h-full flex flex-col">
            <Header />
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <Sidebar />
                <main
                    className="flex-1 min-h-0 overflow-auto"
                    style={{ paddingBottom: PLAYER_H }}
                >
                    <Outlet />
                </main>
            </div>
        </div>

        {/* player */}
        <Player height={PLAYER_H} />
        </div>
    );
}

export default MainLayout2;
