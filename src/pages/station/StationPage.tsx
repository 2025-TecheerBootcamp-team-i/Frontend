import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";
import { MdOutlineNavigateNext } from "react-icons/md";
import { FaPlay } from "react-icons/fa6";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";
import { fetchDjStations, type StationCategory, type StationTrack } from "../../api/station";
import { requireLogin } from "../../api/auth";
import { CATEGORY_STYLES } from "../home/DjStationSection";
import { GENRE_IMAGES } from "../home/GenreStationSection";

function formatSeconds(sec: number | null | undefined): string {
    if (typeof sec !== "number" || Number.isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function StationPage() {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const { playTracks, setTrackAndPlay } = usePlayer();

    const decodedCategory = category ? decodeURIComponent(category) : "";

    const [station, setStation] = useState<StationCategory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch Station
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const stations = await fetchDjStations();
                if (!alive) return;

                // Search through all sections to find the matching category
                // Flatten all station_data from all sections
                const allCategories = stations.flatMap(section => section.station_data);
                const found = allCategories.find((s) => s.category === decodedCategory);

                if (found) {
                    setStation(found);
                } else {
                    setError("스테이션을 찾을 수 없습니다.");
                }
            } catch (err) {
                if (!alive) return;
                setError("스테이션 로딩 실패");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [decodedCategory]);

    // Image for header
    const stationImage = useMemo(() => {
        if (!decodedCategory) return null;

        // 1. Try Mood Styles (DjStation)
        const style = CATEGORY_STYLES[decodedCategory];
        if (style) {
            const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            return match ? match[1] : null;
        }

        // 2. Try Genre Images (GenreStation)
        // Check exact match first, then case-insensitive match
        const exactGenre = GENRE_IMAGES[decodedCategory];
        if (exactGenre) return exactGenre;

        const lowerCategory = decodedCategory.toLowerCase();
        const foundKey = Object.keys(GENRE_IMAGES).find(k => k.toLowerCase() === lowerCategory);
        if (foundKey) return GENRE_IMAGES[foundKey];

        return null;
    }, [decodedCategory]);

    const handlePlayAll = () => {
        if (!station?.tracks.length) return;
        if (!requireLogin()) return;

        const tracks: PlayerTrack[] = station.tracks.map(t => ({
            id: String(t.music_id),
            musicId: t.music_id,
            title: t.music_name,
            artist: t.artist_name || t.artist,
            album: station.category,
            coverUrl: t.album_image ?? undefined,
            duration: t.duration ? formatSeconds(t.duration) : "0:00",
            audioUrl: t.audio_url || `/api/tracks/${t.music_id}/stream`
        }));
        playTracks(tracks);
    };

    const handlePlayById = (track: StationTrack) => {
        if (!requireLogin()) return;
        const playerTrack: PlayerTrack = {
            id: String(track.music_id),
            musicId: track.music_id,
            title: track.music_name,
            artist: track.artist_name || track.artist,
            album: station?.category ?? "",
            coverUrl: track.album_image ?? undefined,
            duration: track.duration ? formatSeconds(track.duration) : "0:00",
            audioUrl: track.audio_url || `/api/tracks/${track.music_id}/stream`
        };
        playTracks([playerTrack]);
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-[#1D1D1D] text-white flex items-center justify-center">
                <div className="text-white/60">로딩 중...</div>
            </div>
        );
    }

    if (!station || error) {
        return (
            <div className="w-full min-h-screen bg-[#1D1D1D] text-white p-6">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate("/home");
                    }}
                    className="mb-6 text-[#aaa] hover:text-white relative z-50"
                >
                    <IoChevronBack size={24} />
                </button>
                <div className="text-xl font-semibold">스테이션을 찾을 수 없어요.</div>
                {error && <div className="mt-2 text-red-400">{error}</div>}
            </div>
        );
    }

    // Top 5 tracks for preview
    const previewTracks = station.tracks.slice(0, 5);

    return (
        <div className="w-full min-w-0 overflow-x-auto pb-20">
            {/* Header / Banner */}
            <section className="relative overflow-visible">
                <div className="relative h-72 bg-[#1D1D1D]/70 border-b border-[#3D3D3D] overflow-hidden">
                    {/* Background Blur */}
                    {stationImage && (
                        <img
                            src={stationImage}
                            alt=""
                            className="absolute inset-0 z-0 w-full h-full object-cover scale-125 blur-3xl opacity-60"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1D1D1D]/10 via-[#1D1D1D]/65 to-[#1D1D1D] z-[1]" />

                    {/* Back Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate("/home");
                        }}
                        className="absolute left-4 top-5 z-[200] p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition cursor-pointer"
                    >
                        <IoChevronBack size={24} />
                    </button>

                    {/* Content */}
                    <div className="absolute inset-0 flex items-end z-10">
                        <div className="px-10 pb-8 flex items-end gap-8 min-w-[800px] shrink-0">
                            {/* Image Placeholder to maintain layout space (matching circle image pos) */}
                            <div className="w-[228px] h-[228px] shrink-0" />

                            <div className="flex items-end gap-5">
                                <div>
                                    <div className="text-4xl font-semibold text-[#F6F6F6] leading-none mb-2">
                                        {station.category}
                                    </div>
                                    <div className="text-base text-[#F6F6F6]/60">DJ 스테이션</div>
                                </div>
                                <button
                                    onClick={handlePlayAll}
                                    className="w-11 h-11 rounded-full bg-[#AFDEE2] text-[#1d1d1d] grid place-items-center hover:bg-[#87B2B6] transition"
                                >
                                    <FaPlay size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Circle Image (overlapping header) */}
                <div className="absolute left-10 top-28 w-[228px] h-[228px] rounded-full overflow-hidden z-20 shadow-xl border-4 border-[#1D1D1D]">
                    {stationImage ? (
                        <img src={stationImage} alt={station.category} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gray-700" />
                    )}
                </div>
            </section>

            {/* Body Content */}
            <div className="mt-[70px] px-4 space-y-6">
                {/* Songs Card */}
                <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="px-8 pt-8 pb-3 flex items-center justify-between">
                        <button
                            onClick={() => navigate(`/station/${encodeURIComponent(station.category)}/tracks`)}
                            className="text-3xl font-bold text-[#F6F6F6] hover:text-white/70 transition"
                        >
                            곡
                        </button>
                        <button
                            onClick={() => navigate(`/station/${encodeURIComponent(station.category)}/tracks`)}
                            className="text-[#F6F6F6] hover:text-white/70 transition"
                        >
                            <MdOutlineNavigateNext size={32} />
                        </button>
                    </div>

                    <div className="mx-8 border-b border-white/10" />

                    <div className="px-8 pb-4">
                        {previewTracks.map((t) => (
                            <div
                                key={t.music_id}
                                onDoubleClick={() => handlePlayById(t)}
                                className="grid grid-cols-[56px_1fr_90px] min-[1200px]:grid-cols-[56px_1fr_200px_450px] items-center py-2 px-3 gap-x-4 border-b border-white/5 hover:bg-white/10 transition group cursor-pointer"
                            >
                                <div className="w-14 h-14 rounded-xl bg-white/10 overflow-hidden relative shadow-lg">
                                    {t.album_image && <img src={t.album_image} className="w-full h-full object-cover" />}
                                    <div className="absolute inset-0 bg-white/5 group-hover:bg-transparent transition" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-base text-white font-semibold truncate">{t.music_name}</div>
                                    <div className="mt-1 text-sm text-white/40 truncate">{t.artist_name || t.artist}</div>
                                </div>
                                {/* Album hidden on small, visible on large */}
                                <div className="hidden min-[1200px]:block text-base text-white/50 truncate">
                                    {station.category}
                                </div>
                                <div className="text-base text-white/30 tabular-nums text-right">
                                    {t.duration ? formatSeconds(t.duration) : "0:00"}
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-center pt-6 pb-2">
                            <button
                                onClick={() => navigate(`/station/${encodeURIComponent(station.category)}/tracks`)}
                                className="text-white/40 hover:text-white font-semibold transition"
                            >
                                더보기
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
