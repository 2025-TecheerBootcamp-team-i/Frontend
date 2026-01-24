import { useEffect, useRef, useState } from "react";
import type { CanvasAlbum } from "../../api/music";

interface MusicPlayerBarProps {
    album: CanvasAlbum;
    audioUrl: string;
    onClose: () => void;
}

export default function MusicPlayerBar({ album, audioUrl, onClose }: MusicPlayerBarProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    // Auto-play when url changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.error("Playback failed", e));
        }
    }, [audioUrl]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration || 1;
            setProgress((current / duration) * 100);
        }
    };

    return (
        <div className="fixed bottom-0 left-[30%] -translate-x-1/2 z-[200] flex justify-center pb-12 pointer-events-none transition-all duration-500">
            <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
            />

            {/* Player Container - Glassmorphism (Larger & Wider) */}
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full pl-3 pr-8 py-4 flex items-center gap-6 shadow-2xl pointer-events-auto w-[600px] max-w-[50vw] relative data-[playing=true]:shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-500">

                {/* Album Art (Rotating - Larger) */}
                <div className="relative w-16 h-16 flex-shrink-0">
                    <img
                        src={album.cover}
                        className="w-full h-full rounded-full object-cover border border-white/20"
                        style={{
                            animation: 'spin 10s linear infinite',
                            animationPlayState: isPlaying ? 'running' : 'paused'
                        }}
                        alt="cover"
                    />
                    {/* Center hole for vinyl look */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-white/10" />
                </div>

                {/* Info (Larger Text) */}
                <div className="flex flex-col flex-1 overflow-hidden gap-1">
                    <span className="text-white text-lg font-bold truncate">{album.title}</span>
                    <span className="text-white/60 text-sm truncate">{album.artist}</span>
                </div>

                {/* Controls (Larger Buttons) */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={togglePlay}
                        className="w-12 h-12 bg-white rounded-full text-black flex items-center justify-center hover:scale-105 transition-transform active:scale-95 shadow-lg"
                    >
                        {isPlaying ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Progress Bar (Positioned) */}
                <div className="absolute bottom-1 left-20 right-8 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
