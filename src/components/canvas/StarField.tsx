import { useEffect, useRef } from "react";

interface Star {
    x: number;
    y: number;
    z: number;
    size: number;
    opacity: number;
    vel: number;
}

interface Meteor {
    x: number;
    y: number;
    length: number;
    size: number;
    speed: number;
    angle: number;
    opacity: number;
}

export default function StarField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: Star[] = [];
        let meteors: Meteor[] = [];
        const STAR_COUNT = 400;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        };

        const initStars = () => {
            stars = [];
            for (let i = 0; i < STAR_COUNT; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    z: Math.random() * 2 + 0.5,
                    size: Math.random() * 1.5,
                    opacity: Math.random(),
                    vel: (Math.random() * 0.5 + 0.1)
                });
            }
        };

        const createMeteor = (): Meteor => {
            const x = Math.random() * canvas.width;
            const y = -100; // Start above screen
            const length = Math.random() * 80 + 10;
            const size = Math.random() * 1 + 0.5;
            const speed = Math.random() * 10 + 5;
            // 45 degree angle (falling right-down)
            const angle = Math.PI / 4;

            return {
                x,
                y,
                length,
                size,
                speed,
                angle,
                opacity: 1
            };
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Stars
            ctx.fillStyle = "white";
            stars.forEach(star => {
                star.y -= star.vel * star.z;

                if (star.y < 0) {
                    star.y = canvas.height;
                    star.x = Math.random() * canvas.width;
                }

                ctx.globalAlpha = star.opacity * (0.5 + Math.sin(Date.now() * 0.001 * star.vel) * 0.3);
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * star.z, 0, Math.PI * 2);
                ctx.fill();
            });

            // Handle Meteors
            // Randomly spawn meteor (approx 2.5% chance per frame)
            if (Math.random() < 0.025) {
                meteors.push(createMeteor());
            }

            // Update and draw meteors
            for (let i = meteors.length - 1; i >= 0; i--) {
                const meteor = meteors[i];

                meteor.x += meteor.speed * Math.cos(meteor.angle);
                meteor.y += meteor.speed * Math.sin(meteor.angle);
                meteor.opacity -= 0.01;

                if (meteor.y > canvas.height || meteor.x > canvas.width || meteor.opacity <= 0) {
                    meteors.splice(i, 1);
                    continue;
                }

                // Draw Meteor Trail
                const gradient = ctx.createLinearGradient(
                    meteor.x,
                    meteor.y,
                    meteor.x - meteor.length * Math.cos(meteor.angle),
                    meteor.y - meteor.length * Math.sin(meteor.angle)
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.strokeStyle = gradient;
                ctx.lineWidth = meteor.size;
                ctx.moveTo(meteor.x, meteor.y);
                ctx.lineTo(
                    meteor.x - meteor.length * Math.cos(meteor.angle),
                    meteor.y - meteor.length * Math.sin(meteor.angle)
                );
                ctx.stroke();

                // Draw Meteor Head
                ctx.beginPath();
                ctx.fillStyle = `rgba(255, 255, 255, ${meteor.opacity})`;
                ctx.arc(meteor.x, meteor.y, meteor.size, 0, Math.PI * 2);
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ mixBlendMode: 'screen', opacity: 0.6 }}
        />
    );
}
