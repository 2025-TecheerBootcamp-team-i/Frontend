import { motion } from "framer-motion";
import type { CanvasAlbum } from "../../api/music";

interface AlbumDetailOverlayProps {
    album: CanvasAlbum;
    onClose: () => void;
    onPlay: () => void;
    isPlaying?: boolean;
}

export default function AlbumDetailOverlay({ album, onClose, onPlay, isPlaying = false }: AlbumDetailOverlayProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 z-[100] h-full w-full md:w-[60%] shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
        >
            {/* Dynamic Background (Color Extraction Sim) - Light Theme */}
            <div className="absolute inset-0 bg-[#f8f8f8]" />
            <img
                src={album.cover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[80px] scale-125 saturate-150 pointer-events-none"
            />
            <div className="absolute inset-0 bg-white/40 pointer-events-none" /> {/* Lighten */}

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-8 right-8 p-4 rounded-full bg-black/5 hover:bg-black/10 transition-colors border border-black/5 z-50 backdrop-blur-md"
            >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="flex-1 flex flex-col p-8 md:p-16 relative z-10">

                {/* Typography Top */}
                <div className="relative">
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-black font-bold tracking-tighter leading-none mb-4 drop-shadow-sm"
                        style={{
                            fontSize: album.title.length > 40 ? 'clamp(1.5rem, 3vw, 3.5rem)'
                                : album.title.length > 25 ? 'clamp(2rem, 4.5vw, 5rem)'
                                    : album.title.length > 15 ? 'clamp(2.5rem, 5.5vw, 6.5rem)'
                                        : 'clamp(3rem, 6vw, 8rem)'
                        }}
                    >
                        {album.title}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-black/60 text-xl font-light tracking-widest uppercase ml-1"
                    >
                        {album.artist}
                    </motion.p>
                </div>

                {/* Centered Image with Hero Animation */}
                <div className="flex-1 flex items-center justify-center relative mt-8">
                    <motion.div
                        className="relative z-20"
                        layoutId={`album-cover-${album.id}`} // Shared layout ID for Magic Motion
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >


                        {/* Vinyl Disc Container */}
                        <motion.div
                            className="relative z-10 w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full shadow-2xl"
                            animate={{ rotate: isPlaying ? 360 : 0 }}
                            transition={{
                                duration: isPlaying ? 2 : 0.6, // Spin faster when playing
                                repeat: isPlaying ? Infinity : 0,
                                ease: "linear",
                            }}
                        >
                            <img
                                src={album.cover}
                                alt={album.title}
                                onClick={onPlay}
                                className="w-full h-full object-cover rounded-full border border-white/20 cursor-pointer"
                            />
                            {/* Vinyl Center Hole / Spindle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#1a1a1a] rounded-full border border-white/10 z-20 shadow-inner" />
                            {/* Vinyl Texture Gradient Overlay */}
                            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_35%,rgba(0,0,0,0.3)_60%,rgba(0,0,0,0.5)_95%)] pointer-events-none" />
                            <div className="absolute inset-0 rounded-full border-[15px] border-black/5 pointer-events-none" />
                        </motion.div>

                        {/* Tone Arm - Placed AFTER disc for z-index stacking */}
                        <div className="absolute -top-16 -right-12 z-50 w-32 h-40 pointer-events-none">
                            <motion.div
                                className="w-full h-full origin-[75%_12.5%]" // Pivot point
                                initial={{ rotate: 0 }}
                                animate={{ rotate: isPlaying ? 32 : 0 }}
                                transition={{ type: "spring", stiffness: 40, damping: 12 }}
                            >
                                <svg width="100%" height="100%" viewBox="0 0 100 120" style={{ overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
                                    {/* Pivot Base */}
                                    <circle cx="75" cy="15" r="14" fill="#e5e5e5" stroke="#999" strokeWidth="1" />
                                    <circle cx="75" cy="15" r="4" fill="#333" />

                                    {/* Arm Stick */}
                                    <path d="M75 15 L35 90" stroke="#d4d4d4" strokeWidth="5" strokeLinecap="round" />

                                    {/* Headshell (Needle Holder) */}
                                    <rect x="25" y="85" width="22" height="30" rx="4" fill="#222" transform="rotate(20 35 90)" />
                                    <rect x="30" y="110" width="4" height="6" fill="#000" transform="rotate(20 35 90)" /> {/* Needle */}
                                </svg>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom - Play Button Removed */}
                <div className="mt-auto pt-8 flex justify-center md:justify-end pointer-events-none opacity-0">
                </div>
            </div>
        </motion.div>
    );
}
