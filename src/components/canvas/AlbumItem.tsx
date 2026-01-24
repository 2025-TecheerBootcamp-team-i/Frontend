import { motion } from "framer-motion";
import type { CanvasAlbum } from "../../api/music";
import { useState } from "react";

interface AlbumItemProps {
    album: CanvasAlbum;
    onClick?: () => void;
}

export default function AlbumItem({ album, onClick }: AlbumItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            className="absolute top-0 left-0"
            initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 0
            }}
            animate={{
                x: album.x,
                y: album.y,
                scale: isHovered ? album.scale * 1.1 : album.scale,
                opacity: 1,
                rotate: isHovered ? 0 : album.rotation
            }}
            transition={{
                duration: 1.2,
                type: "spring",
                bounce: 0.4,
                delay: Math.random() * 0.5 // Stagger effect
            }}
            style={{
                zIndex: isHovered ? 50 : 1
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className="relative group cursor-pointer"
                onClick={onClick}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <motion.div
                    layoutId={`album-cover-${album.id}`}
                    className="rounded-full relative shadow-[30px_30px_60px_rgba(0,0,0,0.5)]"
                    style={{
                        width: `${Math.round(100 + album.scale * 100)}px`,
                        height: `${Math.round(100 + album.scale * 100)}px`
                    }}
                >
                    <img
                        src={album.cover}
                        alt={album.title}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                    />

                    {/* Glass Bead Effect Layers - ENHANCED */}

                    {/* 1. Base Darkening at Edges (Sphere shading) - Stronger */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] pointer-events-none" />

                    {/* 2. Top Specular Highligh (Main Gloss) - Brighter & Sharper */}
                    <div className="absolute top-0 left-0 w-full h-[45%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none"
                        style={{ backdropFilter: 'brightness(1.1)' }} />

                    {/* 3. Sharp Glint (Top-Left) - The "Marble" shine */}
                    <div className="absolute top-[12%] left-[12%] w-[35%] h-[20%] bg-gradient-to-br from-white to-transparent opacity-70 rounded-full blur-[2px] pointer-events-none transform -rotate-12" />

                    {/* 4. Bottom Reflection (Light passing through) */}
                    <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[30%] bg-gradient-to-tl from-white/30 to-transparent rounded-full blur-[6px] pointer-events-none opacity-40 transform rotate-45" />

                    {/* 5. Hard Rim Light / Border - Subtle but sharp */}
                    <div className="absolute inset-0 rounded-full border border-white/20 ring-1 ring-white/10 pointer-events-none mix-blend-overlay" />
                </motion.div>

                {/* Label on hover */}
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10, scale: isHovered ? 1 : 0.9 }}
                    className="absolute -bottom-24 left-1/2 -translate-x-1/2 bg-[#121212]/95 backdrop-blur-xl border border-white/20 px-5 py-4 rounded-2xl text-center min-w-[180px] pointer-events-none shadow-2xl z-50 flex flex-col justify-center gap-1"
                >
                    <h3 className="text-white font-bold text-base leading-tight break-keep">{album.title}</h3>
                    <p className="text-[#a0a0a0] text-xs font-medium">{album.artist}</p>
                </motion.div>
            </div>
        </motion.div >
    );
}
