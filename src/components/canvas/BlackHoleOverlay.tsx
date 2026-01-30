import React from 'react';
import { motion } from 'framer-motion';

const BlackHoleOverlay: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px] pointer-events-none"
        >
            {/* Black Hole System */}
            <motion.div
                // Pop-up Animation: Starts small and expands with a bounce (spring) or strong ease
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{
                    scale: { type: "spring", stiffness: 120, damping: 15, duration: 1.5 },
                    rotate: { duration: 60, repeat: Infinity, ease: "linear" }
                }}
                className="relative flex items-center justify-center scale-150 md:scale-125"
            >

                {/* 1. Gravitational Lensing / Distortion Field (Subtle warping) */}
                <div className="absolute w-[600px] h-[600px] rounded-full border-[40px] border-white/5 blur-[20px] mix-blend-overlay" />

                {/* 2. Outer Accretion Disk (The Halo) - Warm/Orange Glow like Interstellar */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute w-[450px] h-[450px] rounded-full mix-blend-screen"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, rgba(255, 200, 150, 0.1) 15%, transparent 30%, rgba(255, 100, 50, 0.1) 50%, transparent 70%, rgba(255, 220, 180, 0.1) 85%)',
                        filter: 'blur(8px)',
                        opacity: 0.6
                    }}
                />

                {/* 3. Photon Ring (The Bright Sharp Ring) */}
                {/* Inner glowing edge */}
                <div className="absolute w-[310px] h-[310px] rounded-full bg-gradient-to-r from-orange-100 via-yellow-100 to-orange-200 blur-[8px] opacity-70" />

                {/* Sharp Ring Definition */}
                <div className="absolute w-[304px] h-[304px] rounded-full border-[3px] border-white/90 shadow-[0_0_30px_rgba(255,200,150,0.6),inset_0_0_20px_rgba(255,150,100,0.4)]" />

                {/* 4. Event Horizon (The Void) */}
                <div className="absolute w-[300px] h-[300px] rounded-full bg-black z-10 overflow-hidden box-border border border-black">
                    {/* Inner darkness depth */}
                    <div className="absolute inset-0 bg-black shadow-[inset_0_0_40px_rgba(0,0,0,1)]" />
                </div>

            </motion.div>
        </motion.div>
    );
};

export default BlackHoleOverlay;
