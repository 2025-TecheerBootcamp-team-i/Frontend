import type { ReactNode } from "react";
import { useEffect } from "react";
import { logoutClient } from "../../api/auth"; // 경로 맞게

export default function RequireAuth({ children }: { children: ReactNode }) {
    const token = localStorage.getItem("access_token");

    // ✅ 토큰 없을 때 "로컬 프로필/유저정보"도 같이 정리 (한 번만)
    useEffect(() => {
        if (!token) {
        logoutClient();
        }
    }, [token]);

    if (!token) {
        return (
        <div className="w-full h-full min-h-[60vh] flex items-center justify-center">
            <div className="rounded-3xl border border-[#2d2d2d] bg-[#2d2d2d]/80 p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
            <div className="text-[#afdee2] text-xl font-semibold">
                로그인 후 이용 가능합니다.
            </div>
            <div className="mt-2 text-sm text-[#999999]">
                해당 기능은 회원 전용입니다.
            </div>
            </div>
        </div>
        );
    }

    return <>{children}</>;
}
