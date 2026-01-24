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
                    className="rounded-full relative shadow-[20px_20px_40px_rgba(0,0,0,0.15),-10px_-10px_30px_rgba(255,255,255,0.8)]"
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

                    {/* Glass Bead Effect Layers - ENHANCED FOR WHITE THEME */}

                    {/* 1. Base Darkening at Edges - Much subtler for light theme */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />

                    {/* 2. Top Specular Highligh - Stronger white reflection */}
                    <div className="absolute top-0 left-0 w-full h-[45%] bg-gradient-to-b from-white/90 to-transparent rounded-t-full pointer-events-none"
                        style={{ backdropFilter: 'brightness(1.2)' }} />

                    {/* 3. Sharp Glint (Top-Left) */}
                    <div className="absolute top-[12%] left-[12%] w-[35%] h-[20%] bg-gradient-to-br from-white to-transparent opacity-90 rounded-full blur-[1px] pointer-events-none transform -rotate-12" />

                    {/* 4. Bottom Reflection */}
                    <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[30%] bg-gradient-to-tl from-white/60 to-transparent rounded-full blur-[4px] pointer-events-none opacity-60 transform rotate-45" />

                    {/* 5. Hard Rim Light / Border - Darker ring for definition against white */}
                    <div className="absolute inset-0 rounded-full border border-black/5 ring-1 ring-white/40 pointer-events-none" />
                </motion.div>

                {/* Label on hover - Light Theme */}
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10, scale: isHovered ? 1 : 0.9 }}
                    className="absolute -bottom-24 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-black/5 px-5 py-4 rounded-2xl text-center min-w-[180px] pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.1)] z-50 flex flex-col justify-center gap-1"
                >
                    <h3 className="text-black font-bold text-base leading-tight break-keep">{album.title}</h3>
                    <p className="text-gray-500 text-xs font-medium">{album.artist}</p>
                </motion.div>
            </div>
        </motion.div >
    );
}
