import { useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useDragControls } from "framer-motion";
import type { CanvasAlbum } from "../../api/music";
import AlbumItem from "./AlbumItem";

interface InfiniteCanvasProps {
    albums: CanvasAlbum[];
    onViewChange?: (x: number, y: number) => void;
    onAlbumClick?: (album: CanvasAlbum) => void;
}

export default function InfiniteCanvas({ albums, onViewChange, onAlbumClick }: InfiniteCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // 1. Motion Values (The "Logic" Position)
    // driven by the drag gesture
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // 2. Smooth Values (The "Visual" Position)
    // driven by spring physics following the Logic Position
    const springConfig = { damping: 40, stiffness: 200, mass: 1 };
    const itemsX = useSpring(x, springConfig);
    const itemsY = useSpring(y, springConfig);

    // Sync view change for data loading
    // We use the 'spring' value to trigger loading so it matches visual position,
    // or 'x' for faster anticipation. Let's use 'x' (logic) for responsiveness.
    useEffect(() => {
        const unsubscribeX = x.on("change", (latestX) => {
            onViewChange?.(latestX, y.get());
        });
        const unsubscribeY = y.on("change", (latestY) => {
            onViewChange?.(x.get(), latestY);
        });
        return () => {
            unsubscribeX();
            unsubscribeY();
        };
    }, [x, y, onViewChange]);

    return (
        <div
            ref={containerRef}
            className="w-full h-screen overflow-hidden bg-[#f4f3ef] relative cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
                // Start dragging the proxy element when clicking anywhere on background
                dragControls.start(e);
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, #2C2C2C 0%, #121212 100%)'
                }}
            />

            {/* 3. Drag Proxy (Invisible) 
                This element actually gets dragged. It has no visual presence but
                updates the 'x' and 'y' motion values.
            */}
            <motion.div
                drag
                dragControls={dragControls}
                dragElastic={0.1}          // Slight resistance at edges
                dragMomentum={true}        // Inertia throw
                dragConstraints={{         // HARD LIMITS - stops at boundaries
                    top: -1600,
                    bottom: 1600,
                    left: -1600,
                    right: 1600
                }}
                style={{ x, y }}           // Binds drag to these values
                className="absolute top-1/2 left-1/2 w-0 h-0 opacity-0 pointer-events-none"
                aria-hidden="true"
            />

            {/* 4. Visual Content Layer 
                Follows the x/y values with a spring delay for "weighty" feel.
            */}
            <motion.div
                className="absolute top-1/2 left-1/2 w-0 h-0"
                style={{ x: itemsX, y: itemsY }}
            >
                {albums.map((album) => (
                    <AlbumItem
                        key={album.id}
                        album={album}
                        onClick={() => onAlbumClick?.(album)}
                    />
                ))}
            </motion.div>

            {/* UI Overlay */}
            <div className="absolute bottom-8 right-8 flex gap-2 pointer-events-none">
                <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-full text-xs font-mono text-white/50 border border-white/10 shadow-sm">
                    Drag anywhere to explore
                </div>
            </div>
        </div>
    );
}
