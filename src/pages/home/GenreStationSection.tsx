import { useNavigate } from "react-router-dom";
import { HorizontalScroller } from "../../components/common/HorizontalScroller";
import { useEffect, useState } from "react";
import { fetchDjStations, type StationCategory } from "../../api/station";

// Image mapping only (keys must match API category names)
export const GENRE_IMAGES: Record<string, string> = {
    "요즘 k-pop": "/images/genre_station/k_pop.webp",
    "요즘 pop": "/images/genre_station/pop.webp",
    "슬픈 발라드": "/images/genre_station/ballade.webp",
    "편안한 알앤비": "/images/genre_station/r&b.webp",
    "요즘 국힙": "/images/genre_station/k_hip.webp",
    "요즘 외힙": "/images/genre_station/hip.webp",
    "잔잔한 클래식": "/images/genre_station/classic.webp",
    "EDM": "/images/genre_station/edm.webp",
};

export default function GenreStationSection() {
    const navigate = useNavigate();
    const [stations, setStations] = useState<StationCategory[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const sections = await fetchDjStations();
                if (alive) {
                    // Extract "Genre Station" (look for "장르")
                    const genreSection = sections.find((s) => s.theme.includes("장르"));
                    if (genreSection) {
                        setStations(genreSection.station_data);
                    } else {
                        // Optionally fallback to Mock list if API has structure but misses this section?
                        // But we updated MOCK_STATIONS, so fetchDjStations should return it if using mock.
                    }
                }
            } catch (err) {
                console.error("Genre Station load failed:", err);
            } finally {
                if (alive) setLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    if (loading) {
        // Skeleton
        return (
            <section className="mb-6">
                <div className="flex items-center justify-between mb-0">
                    <h2 className="text-3xl font-bold text-white px-2">장르별 스테이션</h2>
                </div>
                <HorizontalScroller gradientFromClass="from-[#121212]">
                    <div className="flex gap-4 min-w-max px-2 pt-2 pb-8">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="w-[180px] h-[180px] rounded-[24px] bg-white/5 animate-pulse" />
                        ))}
                    </div>
                </HorizontalScroller>
            </section>
        );
    }

    if (stations.length === 0) return null;

    return (
        <section className="mb-6">
            <div className="flex items-center justify-between mb-0">
                <h2 className="text-3xl font-bold text-white px-2">장르별 스테이션</h2>
            </div>

            <HorizontalScroller gradientFromClass="from-[#121212]">
                <div className="flex gap-4 min-w-max px-2 pt-2 pb-8">
                    {stations.map((station, idx) => {
                        const categoryName = station.category;
                        const image =
                            GENRE_IMAGES[categoryName] ||
                            GENRE_IMAGES[categoryName.toLowerCase()] ||
                            GENRE_IMAGES["요즘 k-pop"]; // Fallback to K-pop if absolutely nothing matches

                        return (
                            <div
                                key={station.category + idx}
                                className={`
                  relative 
                  w-[180px] h-[180px] 
                  rounded-[24px] 
                  cursor-pointer 
                  transition-transform duration-300 ease-out 
                  hover:scale-105 
                  overflow-hidden 
                  transform-gpu
                  shadow-lg
                  bg-cover bg-center
                  brightness-125 hover:brightness-150
                `}
                                style={{
                                    backgroundImage: image ? `url('${image}')` : undefined,
                                    backgroundColor: image ? undefined : '#333'
                                }}
                                onClick={() => {
                                    navigate(`/station/${encodeURIComponent(station.category)}`);
                                }}
                            >
                                {/* Image already contains text */}
                            </div>
                        );
                    })}
                </div>
            </HorizontalScroller>
        </section>
    );
}
