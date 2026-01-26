import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDjStations, type StationCategory } from "../../api/station";
import { HorizontalScroller } from "../../components/common/HorizontalScroller";

// Category style mapping
// We map known category names to specific background styles (gradients or solid colors)
// Category style mapping
// We map known category names to specific background styles (gradients or solid colors)
export const CATEGORY_STYLES: Record<string, string> = {
    // Premium dark fluid abstract - no overlay needed, naturally dark
    // User provided image 'smile.jpg' with 40% dark overlay for text visibility
    "신나는 노래": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/smile.webp')] bg-cover bg-center",
    "우울할 때": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/Melancholy.webp')] bg-cover bg-center",
    "달달한 노래": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/sweet.webp')] bg-cover bg-center",
    "운전할 때": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/drive.webp')] bg-cover bg-center",
    "운동할 때": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/sports.webp')] bg-cover bg-center",
    "집중 할때": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/Focus.webp')] bg-cover bg-center",
    "이별 노래": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/broken.webp')] bg-cover bg-center",
    "잠 안 올때": "bg-[linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4)),url('/images/music_station/midnight.webp')] bg-cover bg-center",
};

// Fallback style for unknown categories
const DEFAULT_STYLE = "bg-gradient-to-br from-gray-700/50 to-gray-900/50";

export default function DjStationSection() {
    const navigate = useNavigate();
    const [stations, setStations] = useState<StationCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const data = await fetchDjStations();
                if (alive) {
                    setStations(data);
                }
            } catch (err) {
                if (alive) {
                    console.error("DJ Station load failed:", err);
                    setError("스테이션 로딩 실패");
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    if (loading) {
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-0">
                    <h2 className="text-4xl font-bold text-white px-2">DJ 스테이션</h2>
                </div>
                <HorizontalScroller gradientFromClass="from-[#121212]">
                    <div className="flex gap-4 min-w-max px-2 pt-2 pb-8">
                        {/* Generate 5 skeleton items */}
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="
                                    w-[180px] h-[180px] 
                                    rounded-[24px] 
                                    bg-white/5 
                                    animate-pulse
                                "
                            />
                        ))}
                    </div>
                </HorizontalScroller>
            </section>
        );
    }

    if (error) return null; // Hide section on error
    if (stations.length === 0) return null;

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-0">
                <h2 className="text-4xl font-bold text-white px-2">DJ 스테이션</h2>
                <span className="text-gray-400 text-sm cursor-pointer hover:text-white transition px-2">
                    더보기
                </span>
            </div>

            <HorizontalScroller gradientFromClass="from-[#121212]">
                {/* Added padding to ensure ample space for hover scaling and shadows without clipping */}
                <div className="flex gap-4 min-w-max px-2 pt-2 pb-8">
                    {stations.map((station, idx) => {
                        const styleClass = CATEGORY_STYLES[station.category] || DEFAULT_STYLE;
                        return (
                            <div
                                key={station.category + idx}
                                className={`
                  relative 
                  w-[180px] h-[180px] 
                  rounded-[24px] 
                  flex flex-col justify-between p-5
                  cursor-pointer 
                  transition-transform duration-300 ease-out 
                  hover:scale-105 
                  overflow-hidden 
                  transform-gpu
                  shadow-lg
                  ${styleClass}
                `}
                                onClick={() => {
                                    // Navigate to detail page
                                    navigate(`/station/${encodeURIComponent(station.category)}`);
                                }}
                            >
                                {/* Title centered/stylized - Pure White, no shadow for cleanliness */}
                                <div className="mt-2 text-2xl font-bold text-white opacity-100 leading-tight break-keep">
                                    {station.category}
                                </div>

                                {/* Icon or decorative element could go here */}
                                <div className="self-end text-white/50 text-sm font-medium">
                                    {/* Placeholder for 'Play' or track count */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </HorizontalScroller>
        </section>
    );
}
