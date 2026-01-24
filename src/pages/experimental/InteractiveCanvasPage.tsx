import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import InfiniteCanvas from "../../components/canvas/InfiniteCanvas";
import AlbumDetailOverlay from "../../components/canvas/AlbumDetailOverlay";
import MusicPlayerBar from "../../components/canvas/MusicPlayerBar";
import { searchByTags, getCanvasAlbums, playTrack, type CanvasAlbum, type TagSearchResult } from "../../api/music";

const CHUNK_SIZE = 1200; // Larger chunks for more spread
const MAX_CHUNK_DIST = 2;
const ITEMS_PER_CHUNK = 3; // Keep sparse (3 * 49 chunks ≈ 147 slots)

// Helper for collision-free layout within a chunk
function generateNonOverlappingPositions(chunkX: number, chunkY: number, scales: number[]) {
    const positions: { x: number, y: number, rotation: number, scale: number }[] = [];
    const minDistance = 450; // Much larger minimum distance
    const padding = 150;
    const attemptsLimit = 50;

    for (let i = 0; i < scales.length; i++) {
        const itemScale = scales[i];
        let bestX = 0, bestY = 0;
        let valid = false;

        for (let attempt = 0; attempt < attemptsLimit; attempt++) {
            const centerX = chunkX * CHUNK_SIZE;
            const centerY = chunkY * CHUNK_SIZE;

            const offsetX = (Math.random() - 0.5) * (CHUNK_SIZE - padding * 2);
            const offsetY = (Math.random() - 0.5) * (CHUNK_SIZE - padding * 2);

            const x = centerX + offsetX;
            const y = centerY + offsetY;

            // Simple collision check (approximation using minDistance + scale factor could be better, but fixed minDistance works for now)
            let collision = false;
            for (const pos of positions) {
                const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
                // Add scale factor to minDistance to prevent overlap of large items
                const dynamicMinDist = minDistance * ((itemScale + pos.scale) / 2);
                if (dist < dynamicMinDist) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                bestX = x;
                bestY = y;
                valid = true;
                break;
            }
        }

        if (valid) {
            positions.push({
                x: bestX,
                y: bestY,
                rotation: (Math.random() - 0.5) * 30,
                scale: itemScale
            });
        }
    }
    return positions;
}

// Convert TagSearchResult to CanvasAlbum format
function mapToCanvasAlbum(item: TagSearchResult): CanvasAlbum | null {
    const cover = item.image_large_square || item.image_square || item.album_image;
    if (!cover) return null;

    const normalizedScore = item.score !== undefined ? Math.min(Math.max(item.score, 0), 1) : Math.random();
    const scale = 0.5 + (normalizedScore * 1.2); // Scale range 0.5 to 1.7 (More dramatic)

    return {
        id: item.music_id,
        title: item.music_name || "Unknown Track",
        artist: item.artist_name || "Unknown Artist",
        cover,
        x: 0,
        y: 0,
        rotation: 0,
        scale
    };
}

export default function InteractiveCanvasPage() {
    const navigate = useNavigate();
    const [albums, setAlbums] = useState<CanvasAlbum[]>([]);
    const [selectedAlbum, setSelectedAlbum] = useState<CanvasAlbum | null>(null);
    const [playingMusic, setPlayingMusic] = useState<{ album: CanvasAlbum, url: string } | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Cache for search results
    const searchCacheRef = useRef<CanvasAlbum[]>([]);
    const loadedChunksRef = useRef<Set<string>>(new Set());
    const currentTagsRef = useRef<string>("");
    const initialLoadDoneRef = useRef(false);

    // Initial load: random albums for background behind overlay
    useEffect(() => {
        if (initialLoadDoneRef.current) return;
        initialLoadDoneRef.current = true;

        const loadInitialBackground = async () => {
            try {
                // Load random albums for background effect
                const bgAlbums = await getCanvasAlbums(20);

                // Place them spread across the viewport area
                const cols = 5;
                const rows = 4;
                const spreadX = 1800; // Total width spread
                const spreadY = 1200; // Total height spread

                const positioned = bgAlbums.map((album, index) => {
                    // Grid position with random offset
                    const col = index % cols;
                    const row = Math.floor(index / cols);

                    const baseX = (col - cols / 2) * (spreadX / cols);
                    const baseY = (row - rows / 2) * (spreadY / rows);

                    // Add random offset within cell
                    const offsetX = (Math.random() - 0.5) * 300;
                    const offsetY = (Math.random() - 0.5) * 250;

                    return {
                        ...album,
                        x: baseX + offsetX,
                        y: baseY + offsetY,
                        rotation: (Math.random() - 0.5) * 30,
                        scale: 0.7 + Math.random() * 0.6
                    };
                });

                setAlbums(positioned);
            } catch (e) {
                console.error("Failed to load initial background", e);
            }
        };

        loadInitialBackground();
    }, []);

    // Load chunk from cached search results
    const loadChunkFromCache = useCallback((chunkX: number, chunkY: number) => {
        if (Math.abs(chunkX) > MAX_CHUNK_DIST || Math.abs(chunkY) > MAX_CHUNK_DIST) return;
        if (searchCacheRef.current.length === 0) return; // No items in cache

        const chunkKey = `${chunkX},${chunkY}`;
        if (loadedChunksRef.current.has(chunkKey)) return;

        loadedChunksRef.current.add(chunkKey);

        // Take items from cache
        const itemsToPlace = searchCacheRef.current.splice(0, ITEMS_PER_CHUNK);
        if (itemsToPlace.length === 0) return;

        // Create explicit scales array from items
        const itemScales = itemsToPlace.map(item => item.scale);
        const layout = generateNonOverlappingPositions(chunkX, chunkY, itemScales);

        const placedAlbums = itemsToPlace.map((album, index) => {
            const pos = layout[index] || { x: chunkX * CHUNK_SIZE, y: chunkY * CHUNK_SIZE, rotation: 0, scale: 1 };
            return {
                ...album,
                x: pos.x,
                y: pos.y,
                rotation: pos.rotation,
                scale: pos.scale
            };
        });

        setAlbums(prev => [...prev, ...placedAlbums]);
    }, []);

    // Handle view change (drag)
    const handleViewChange = useCallback((x: number, y: number) => {
        const centerX = -x;
        const centerY = -y;

        const chunkX = Math.round(centerX / CHUNK_SIZE);
        const chunkY = Math.round(centerY / CHUNK_SIZE);

        // Load current chunk + neighbors
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                loadChunkFromCache(chunkX + dx, chunkY + dy);
            }
        }
    }, [loadChunkFromCache]);

    // Handle search submission
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);

        try {
            // Parse tags (comma-separated)
            const tags = searchQuery.split(',').map(t => t.trim()).filter(Boolean).join(',');
            currentTagsRef.current = tags;

            // Fetch all results
            const results = await searchByTags(tags, 120);

            // Convert to CanvasAlbum format
            const canvasAlbums = results
                .map(mapToCanvasAlbum)
                .filter((a): a is CanvasAlbum => a !== null);

            // Shuffle for variety
            const shuffled = canvasAlbums.sort(() => Math.random() - 0.5);

            // Store in cache
            searchCacheRef.current = shuffled;

            // Reset state
            setAlbums([]);
            loadedChunksRef.current.clear();

            // Load initial chunks
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    loadChunkFromCache(dx, dy);
                }
            }

            setShowOverlay(false);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlay = async (album: CanvasAlbum) => {
        try {
            const url = await playTrack(album.id);
            if (url) {
                setPlayingMusic({ album, url });
            } else {
                alert("음악을 재생할 수 없습니다.");
            }
        } catch (e) {
            console.error("Playback error", e);
        }
    };

    return (
        <div className="w-full h-full relative">
            {/* Canvas Background */}
            <InfiniteCanvas
                albums={albums}
                onViewChange={handleViewChange}
                onAlbumClick={setSelectedAlbum}
            />

            {/* Album Detail Overlay */}
            <AnimatePresence>
                {selectedAlbum && (
                    <AlbumDetailOverlay
                        album={selectedAlbum}
                        onClose={() => {
                            setSelectedAlbum(null);
                            setPlayingMusic(null);
                        }}
                        onPlay={() => handlePlay(selectedAlbum)}
                    />
                )}
            </AnimatePresence>

            {playingMusic && (
                <MusicPlayerBar
                    album={playingMusic.album}
                    audioUrl={playingMusic.url}
                    onClose={() => setPlayingMusic(null)}
                />
            )}

            {/* Search Overlay */}
            {showOverlay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 backdrop-blur-md bg-white/30" />

                    {/* Search Box Container */}
                    <form
                        onSubmit={handleSearch}
                        className="relative z-10 w-full max-w-xl mx-4"
                    >
                        {/* Glassmorphism Search Box - Light Theme */}
                        <div className="bg-white/60 backdrop-blur-xl border border-black/10 rounded-2xl p-6 shadow-2xl">
                            {/* Title */}
                            <h2 className="text-black text-3xl font-bold mb-2 text-center tracking-tight">
                                Album Verse
                            </h2>
                            <p className="text-black/50 text-sm text-center mb-6">
                                태그를 검색하고 탐험하세요
                            </p>

                            {/* Search Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="summer, sad, happy..."
                                    className="w-full bg-transparent border border-black/20 rounded-xl px-5 py-4 text-black placeholder-black/40 focus:outline-none focus:border-black/50 focus:bg-black/5 transition-all text-lg"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/10 hover:bg-black/20 p-2 rounded-lg transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Hint */}
                            <p className="text-black/30 text-xs text-center mt-3">
                                쉼표로 여러 태그를 검색할 수 있습니다
                            </p>
                        </div>
                    </form>
                </div>
            )}

            {/* Header (shown when overlay is hidden) */}
            {!showOverlay && (
                <div className="fixed top-8 left-8 z-40 pointer-events-none">
                    <h1 className="text-5xl font-bold text-black tracking-tighter shadow-sm">
                        Album Verse
                    </h1>
                    <p className="text-sm text-black/60 mt-1 font-medium">
                        #{currentTagsRef.current.replace(/,/g, ' #')}
                    </p>
                </div>
            )}

            {/* Navigation Bar (Simple Button) */}
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-40">
                <button
                    onClick={() => navigate('/home')}
                    className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors text-sm flex items-center gap-2 shadow-xl border border-black/5"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    HomePage
                </button>
            </div>
        </div>
    );
}
