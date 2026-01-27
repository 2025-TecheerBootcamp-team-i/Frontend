import { useMemo } from "react";

/**
 * 랜덤한 별을 생성합니다.
 * @param count 별의 개수
 * @returns box-shadow CSS 값
 */
const generateStars = (count: number) => {
    let value = "";
    for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * 2000);
        const y = Math.floor(Math.random() * 2000);

        // 💫 약간의 색상 변주를 주어 더 풍성하게 (Pure White, Pale Blue, Soft Purple)
        const colors = ["#FFFFFF", "#E0F7FA", "#E1BEE7", "#FFFFFF"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        value += `${x}px ${y}px ${color}`;
        if (i < count - 1) {
            value += ", ";
        }
    }
    return value;
};

/**
 * ✅ StarBackground
 * - Deep Space Gradients: 깊이감 있는 우주 배경
 * - Twinkling Stars: 반짝이는 효과 추가
 * - Parallax Movement: 거리감이 느껴지는 3단 레이어 이동
 * - Shooting Stars: 간혈적으로 떨어지는 유성우 효과
 */
export default function StarBackground() {
    const starsSmall = useMemo(() => generateStars(1000), []);
    const starsMedium = useMemo(() => generateStars(300), []);
    const starsLarge = useMemo(() => generateStars(150), []);

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#050505]">
            {/* 🌌 배경 그라디언트 (Nebula Effect) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_#1a237e_0%,_#000000_60%)] opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_#311b92_0%,_transparent_40%)] opacity-30" />

            <style>{`
        /* 기존 이동 애니메이션 */
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }
        
        /* ✨ 반짝임 효과 */
        @keyframes twinkle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.3; }
        }

        /* 🌠 유성우 효과 */
        @keyframes shooting {
          0% { transform: translateX(0) translateY(0) rotate(315deg); opacity: 1; }
          100% { transform: translateX(-300px) translateY(300px) rotate(315deg); opacity: 0; }
        }
      `}</style>

            {/* ⭐ Small Stars (가장 먼 별, 천천히 이동, 빠르게 반짝임) */}
            <div
                className="absolute w-[1px] h-[1px] bg-transparent"
                style={{
                    boxShadow: starsSmall,
                    animation: "animStar 100s linear infinite, twinkle 3s ease-in-out infinite alternate",
                }}
            />
            <div
                className="absolute w-[1px] h-[1px] bg-transparent"
                style={{
                    boxShadow: starsSmall,
                    animation: "animStar 100s linear infinite, twinkle 3s ease-in-out infinite alternate",
                    marginBottom: "2000px"
                }}
            />

            {/* ⭐ Medium Stars (중간 별, 중간 속도, 천천히 반짝임) */}
            <div
                className="absolute w-[2px] h-[2px] bg-transparent"
                style={{
                    boxShadow: starsMedium,
                    animation: "animStar 150s linear infinite, twinkle 5s ease-in-out infinite alternate",
                }}
            />
            <div
                className="absolute w-[2px] h-[2px] bg-transparent"
                style={{
                    boxShadow: starsMedium,
                    animation: "animStar 150s linear infinite, twinkle 5s ease-in-out infinite alternate",
                    marginBottom: "2000px"
                }}
            />

            {/* ⭐ Large Stars (가까운 별, 가장 느리게 이동 - Parallax 역설) - 보통 가까운게 빠르지만 배경 별은 반대 느낌도 좋음 */}
            {/* 사실 Parallax 원리상 가까운게 더 빨리 움직여야 함 -> 속도 50s로 수정 */}
            <div
                className="absolute w-[3px] h-[3px] bg-transparent"
                style={{
                    boxShadow: starsLarge,
                    animation: "animStar 50s linear infinite",
                    opacity: 0.8
                }}
            />
            <div
                className="absolute w-[3px] h-[3px] bg-transparent"
                style={{
                    boxShadow: starsLarge,
                    animation: "animStar 50s linear infinite",
                    marginBottom: "2000px",
                    opacity: 0.8
                }}
            />

            {/* 🌠 Shooting Stars (유성) - 장식용 요소 */}
            <div className="absolute top-0 right-[-100px] w-1 h-1 bg-white rounded-full shadow-[0_0_10px_#fff,0_0_20px_#fff,0_0_40px_#fff] animate-[shooting_4s_linear_infinite] delay-1000" />
            <div className="absolute top-[20%] right-[-150px] w-[2px] h-[2px] bg-blue-200 rounded-full shadow-[0_0_5px_#fff] animate-[shooting_6s_linear_infinite] delay-3000" />
            <div className="absolute top-[50%] right-[-200px] w-[3px] h-[3px] bg-purple-200 rounded-full shadow-[0_0_8px_#fff] animate-[shooting_8s_linear_infinite] delay-5000" />
        </div>
    );
}
