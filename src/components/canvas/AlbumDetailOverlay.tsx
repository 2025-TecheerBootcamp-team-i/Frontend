import { motion } from "framer-motion";
import type { CanvasAlbum } from "../../api/music";

interface AlbumDetailOverlayProps {
    album: CanvasAlbum;
    onClose: () => void;
    onPlay: () => void;
}

export default function AlbumDetailOverlay({ album, onClose, onPlay }: AlbumDetailOverlayProps) {
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
                        style={{ fontSize: 'clamp(3rem, 6vw, 8rem)' }}
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
                        <img
                            src={album.cover}
                            alt={album.title}
                            className="w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] object-cover rounded-full shadow-2xl border border-white/20"
                        />
                    </motion.div>
                </div>

                {/* Bottom - Play Button Only (Metadata Removed) */}
                <div className="mt-auto pt-8 flex justify-center md:justify-end">
                    <button
                        onClick={onPlay}
                        className="px-10 py-4 bg-black text-white text-lg font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-2xl"
                    >
                        PLAY NOW
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
