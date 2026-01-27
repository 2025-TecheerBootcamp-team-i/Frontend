import { useEffect, useRef } from "react";

interface Star {
    x: number;
    y: number;
    z: number;
    color: string;
}

interface StarFieldProps {
    speed?: number; // External speed control
    starCount?: number;
    starColor?: string;
}

export default function StarField({
    speed = 2,
    starCount = 600, // Reduced for smooth performance
    starColor = "white"
}: StarFieldProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Use Ref to track speed without re-triggering effect
    const speedRef = useRef(speed);

    // Update ref when speed prop changes
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: Star[] = [];

        // Canvas center for perspective
        let cx = canvas.width / 2;
        let cy = canvas.height / 2;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            cx = canvas.width / 2;
            cy = canvas.height / 2;
        };

        const initStars = () => {
            stars = [];
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: (Math.random() - 0.5) * canvas.width * 2,
                    y: (Math.random() - 0.5) * canvas.height * 2,
                    z: Math.random() * canvas.width,
                    color: starColor
                });
            }
        };

        const animate = () => {
            const currentSpeed = speedRef.current;

            // OPTIMIZATION: ClearRect (No Smears)
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const width = canvas.width;
            const height = canvas.height;

            stars.forEach(star => {
                star.z -= currentSpeed;
                if (star.z <= 0) {
                    star.z = width;
                    star.x = (Math.random() - 0.5) * width * 2;
                    star.y = (Math.random() - 0.5) * height * 2;
                }

                // Projection
                const invZ = 1 / star.z;
                const x2d = star.x * invZ * cx + cx;
                const y2d = star.y * invZ * cy + cy;

                if (x2d > 0 && x2d < width && y2d > 0 && y2d < height) {
                    const size = (1 - star.z / width) * 3;
                    const alpha = Math.min(1, (1 - star.z / width) + 0.2);

                    // SMOOTH TRANSITION & VECTOR TRAIL
                    const tailLen = Math.max(0.1, currentSpeed * 2);
                    const prevZ = star.z + tailLen;

                    if (prevZ < width * 2) {
                        const prevInvZ = 1 / prevZ;
                        const prevX = star.x * prevInvZ * cx + cx;
                        const prevY = star.y * prevInvZ * cy + cy;

                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.lineWidth = size;
                        ctx.lineCap = "round";
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(x2d, y2d);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        initStars();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [starCount, starColor]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
        />
    );
}
