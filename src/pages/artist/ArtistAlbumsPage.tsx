import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";

import { ARTISTS } from "../../mocks/artistsMock";

export default function ArtistAlbumsPage() {
    const navigate = useNavigate();
    const { artistId } = useParams();

    const artist = useMemo(() => ARTISTS[artistId ?? ""], [artistId]);

    if (!artist) {
        return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
            <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 text-[#aaa] hover:text-white transition"
            aria-label="뒤로가기"
            >
            <IoChevronBack size={24} />
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xl font-semibold">아티스트를 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{artistId ?? "(없음)"}</span>
            </div>
            </div>
        </div>
        );
    }
    return (
        <div className="w-full min-w-0">
        {/* 상단 간단 헤더(뒤로 + 타이틀) */}
        {/* 타이틀 라인 */}
        <div className="sticky bg-[#2d2d2d] border-b border-[#464646] pb-4 top-0 z-20 pt-5 px-4 mb-4">
            <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                aria-label="뒤로가기"
            >
                <IoChevronBack size={22} />
            </button>
            <h1 className="text-xl font-semibold text-[#F6F6F6]">{artist.name} · 앨범</h1>
            </div>
        </div>

        {/* ✅ MyPlaylistsPersonal UI 참고한 카드 섹션 */}
        <section className="mt-4 mx-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#2d2d2d]">
            {/* 헤더 */}
            <div className="px-8 pt-6 pb-2 flex items-center justify-between">
            <div className="text-lg font-semibold text-[#F6F6F6]">앨범 전체보기</div>
            </div>

            {/* ✅ 헤더랑 같은 기준선 */}
            <div className="mb-4 mx-4 border-b border-[#464646]" />

            {/* 카드 그리드 */}
            <div className="px-6 pb-8 overflow-x-auto">
            <div
                className="
                grid
                gap-x-6
                gap-y-12
                justify-between
                [grid-template-columns:repeat(4,220px)]
                "
            >
                {artist.albums.map((al) => (
                <button
                    key={al.id}
                    type="button"
                    onClick={() => navigate(`/album/${al.id}`)}
                    className="w-[220px] text-left group"
                >
                    <div className="aspect-square rounded-2xl bg-[#6b6b6b]/40 border border-[#464646] group-hover:bg-[#6b6b6b]/55 transition" />

                    <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                    {al.title}
                    </div>
                    <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                    {al.year}
                    </div>
                </button>
                ))}
            </div>
            </div>
        </section>
        </div>
    );
}