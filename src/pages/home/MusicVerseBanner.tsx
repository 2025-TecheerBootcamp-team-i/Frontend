import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MdOutlineNavigateNext } from "react-icons/md";

export default function MusicVerseBanner() {
    const navigate = useNavigate();
    const [isEntering, setIsEntering] = useState(false);

    const handleClick = () => {
        setIsEntering(true);
        // Navigate after animation
        setTimeout(() => {
            navigate('/canvas');
        }, 700); // Wait for the "suck in" animation
    };

    return (
        <div
            onClick={handleClick}
            className="group ml-1.5 relative w-full h-[280px] rounded-[32px] overflow-hidden cursor-pointer shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        >
            {/* The Portal Container - Scales up drastically on click */}
            <motion.div
                className="absolute inset-0 w-full h-full"
                animate={isEntering ? {
                    scale: [1, 3, 80], // Stage 1: Fast to 3x. Stage 2: Explode to 80x
                    opacity: [1, 1, 0], // Fully visible until Stage 2 starts, then fade out
                    filter: ["blur(0px)", "blur(0px)", "blur(20px)"], // Blur starts after 3x
                } : {}}
                transition={isEntering ? {
                    duration: 0.8,
                    times: [0, 0.2, 1], // Reach 3x at 20% (very fast), then expand for the rest
                    ease: "easeInOut"
                } : {}}
            >
                {/* Background Image - Cosmic/Abstract */}
                <div className="absolute inset-0 bg-black">
                    <img
                        src="/images/album_verse_preview.webp"
                        alt="Music Universe"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                </div>
            </motion.div>

            {/* Content Container - Animate separately or let it scale? 
                If we want to "dive in", scaling everything is the most "portal-like".
            */}
            <motion.div
                className="absolute inset-0"
                animate={isEntering ? {
                    opacity: 0,
                    transition: { duration: 0.3 } // Fade out text quickly as we zoom
                } : {}}
            >
                {/* Arrow Button - Top Right */}
                <div className="absolute top-6 right-6 z-20">
                    <div
                        className="
                            w-12 h-12
                            rounded-full
                            bg-white/20 backdrop-blur-md
                            flex items-center justify-center
                            text-white
                            group-hover:bg-white/30
                            transition
                        "
                    >
                        <MdOutlineNavigateNext size={28} />
                    </div>
                </div>

                {/* Creating a 3D-like floating effect for elements */}
                <div className="absolute inset-0 flex flex-col justify-center p-10 z-10">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-xs font-bold tracking-widest mb-4">
                            INTERACTIVE CANVAS
                        </span>
                        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-4">
                            Music<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Verse</span>
                        </h2>
                    </motion.div>
                </div>

                {/* Decorative Floating Elements */}
                <div className="absolute top-10 right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-[50px] animate-pulse" />
                <div className="absolute bottom-[-20px] left-[20%] w-40 h-40 bg-blue-500/20 rounded-full blur-[60px]" />
            </motion.div>
        </div>
    );
}
