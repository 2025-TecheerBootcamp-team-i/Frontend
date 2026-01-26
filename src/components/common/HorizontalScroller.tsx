import { useRef, useState, useEffect } from "react";
import { MdOutlineNavigateNext } from "react-icons/md";

type HorizontalScrollerProps = {
    children: React.ReactNode;
    scrollStep?: number;
    gradientFromClass?: string;
};

export function HorizontalScroller({
    children,
    scrollStep = 300,
    gradientFromClass = "from-[#2d2d2d]",
}: HorizontalScrollerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = useState(false);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const ticking = useRef(false);

    const checkScroll = () => {
        const el = ref.current;
        if (!el) return;

        const can = el.scrollWidth > el.clientWidth + 1;
        setCanScroll(can);

        if (!can) {
            setShowLeft(false);
            setShowRight(false);
            return;
        }

        const left = el.scrollLeft;
        const max = el.scrollWidth - el.clientWidth;

        setShowLeft(left > 4);
        setShowRight(left < max - 4);
    };

    const update = () => {
        if (!ticking.current) {
            window.requestAnimationFrame(() => {
                checkScroll();
                ticking.current = false;
            });
            ticking.current = true;
        }
    };

    useEffect(() => {
        checkScroll(); // Initial check immediately
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return (
        <div className="relative mt-2">
            <div ref={ref} onScroll={update} className="overflow-x-auto overflow-y-hidden no-scrollbar">
                {children}
            </div>

            {canScroll && showLeft && (
                <button
                    type="button"
                    onClick={() => {
                        ref.current?.scrollBy({ left: -scrollStep, behavior: "smooth" });
                        setTimeout(update, 250);
                    }}
                    className="
            absolute left-1 top-1/2 -translate-y-1/2 z-10
            h-9 w-9 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
            rotate-180
          "
                    aria-label="왼쪽으로 이동"
                >
                    <MdOutlineNavigateNext size={22} />
                </button>
            )}

            {canScroll && showRight && (
                <button
                    type="button"
                    onClick={() => {
                        ref.current?.scrollBy({ left: scrollStep, behavior: "smooth" });
                        setTimeout(update, 250);
                    }}
                    className="
            absolute right-1 top-1/2 -translate-y-1/2 z-10
            h-9 w-9 rounded-full
            bg-[#1d1d1d]/50 text-[#f6f6f6]
            flex items-center justify-center
            hover:bg-[#1d1d1d]/70 transition
          "
                    aria-label="오른쪽으로 이동"
                >
                    <MdOutlineNavigateNext size={22} />
                </button>
            )}

            {canScroll && showRight && (
                <div
                    className={[
                        "pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l to-transparent",
                        gradientFromClass,
                    ].join(" ")}
                />
            )}
            {canScroll && showLeft && (
                <div
                    className={[
                        "pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r to-transparent",
                        gradientFromClass,
                    ].join(" ")}
                />
            )}
        </div>
    );
}
