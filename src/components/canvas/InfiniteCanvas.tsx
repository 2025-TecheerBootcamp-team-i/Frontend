import { useRef, useEffect, useState } from "react";
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

    // Zoom state
    const scale = useMotionValue(1);
    const smoothScale = useSpring(scale, springConfig);

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

    // Drag constraints state
    const [constraints, setConstraints] = useState({ left: -1600, right: 1600, top: -1600, bottom: 1600 });
    const BASE_CONSTRAINT = 1600;

    // Apply scaling to constraints when zooming
    const updateScale = (newScale: number) => {
        scale.set(newScale);
        // Adjust constraints based on scale to keep content accessible but bounded
        // Simple proportional scaling matches the visual expansion
        const newConstraint = BASE_CONSTRAINT * newScale;
        setConstraints({
            left: -newConstraint,
            right: newConstraint,
            top: -newConstraint,
            bottom: newConstraint
        });
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-screen overflow-hidden bg-[#f5f5f7] relative cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
                // Start dragging the proxy element when clicking anywhere on background
                dragControls.start(e);
            }}
            onWheel={(e) => {
                // Zoom on wheel
                const newScale = scale.get() - e.deltaY * 0.001;
                const clampedScale = Math.min(Math.max(newScale, 0.4), 2.0);
                updateScale(clampedScale);
            }}
        >

            {/* 3. Drag Proxy (Invisible) 
                This element actually gets dragged. It has no visual presence but
                updates the 'x' and 'y' motion values.
            */}
            <motion.div
                drag
                dragControls={dragControls}
                dragElastic={0.1}          // Slight resistance at edges
                dragMomentum={true}        // Inertia throw
                dragConstraints={constraints} // Dynamic constraints
                style={{ x, y }}           // Binds drag to these values
                className="absolute top-1/2 left-1/2 w-0 h-0 opacity-0 pointer-events-none"
                aria-hidden="true"
            />

            {/* 4. Visual Content Layer 
                Follows the x/y values with a spring delay for "weighty" feel.
            */}
            <motion.div
                className="absolute top-1/2 left-1/2 w-0 h-0"
                style={{ x: itemsX, y: itemsY, scale: smoothScale }}
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
            <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 pointer-events-none z-50">
                {/* Zoom Controls */}
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <button
                        onClick={() => {
                            const newScale = Math.min(scale.get() + 0.2, 2.0);
                            updateScale(newScale);
                        }}
                        className="w-10 h-10 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:bg-white/90 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5 text-black/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            const newScale = Math.max(scale.get() - 0.2, 0.4);
                            updateScale(newScale);
                        }}
                        className="w-10 h-10 bg-white/70 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20 hover:bg-white/90 transition-all active:scale-95"
                    >
                        <svg className="w-5 h-5 text-black/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                </div>

                <div className="bg-white/60 backdrop-blur-md px-4 py-2 rounded-full text-xs font-mono text-black/50 border border-black/5 shadow-sm">
                    드래그하여 탐색 • 휠로 줌 조절
                </div>
            </div>
        </div>
    );
}
