import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";

import {
    fetchArtistDetail,
    fetchArtistAlbums,
    type ArtistDetail,
    type ArtistAlbum,
} from "../../api/artist";

export default function ArtistAlbumsPage() {
    const navigate = useNavigate();
    const { artistId } = useParams();

    const [artist, setArtist] = useState<ArtistDetail | null>(null);
    const [album, setAlbums] = useState<ArtistAlbum[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    if (!artistId) {
        setError("아티스트 ID가 없습니다.");
        setArtist(null);
        setAlbums([]);
        return;
    }

    const idNum = Number(artistId);
    if (Number.isNaN(idNum)) {
        setError("유효하지 않은 아티스트 ID입니다.");
        setArtist(null);
        setAlbums([]);
        return;
    }

    let cancelled = false;

    (async () => {
        try {
        setLoading(true);
        setError(null);

        const [detail, albumlist] = await Promise.all([
            fetchArtistDetail(idNum),
            fetchArtistAlbums(idNum),
        ]);

        if (cancelled) return;

        setArtist(detail);
        setAlbums(albumlist);
        } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        setArtist(null);
        setAlbums([]);
        } finally {
        if (!cancelled) setLoading(false);
        }
    })();

    return () => {
        cancelled = true;
    };
    }, [artistId]);

    // 로딩 UI
        if (loading) {
    return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 text-[#aaa] hover:text-white transition">
            <IoChevronBack size={24} />
        </button>
        <div className="text-center py-12 text-[#999]">로딩 중...</div>
        </div>
    );
    }

    if (!artist || error) {
    return (
        <div className="w-full min-w-0 px-6 py-5 text-white">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 text-[#aaa] hover:text-white transition">
            <IoChevronBack size={24} />
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-xl font-semibold">아티스트를 찾을 수 없어요.</div>
            <div className="mt-2 text-sm text-[#aaa]">
            요청한 ID: <span className="text-white">{artistId ?? "(없음)"}</span>
            </div>
            {error && <div className="mt-2 text-sm text-red-400">오류: {error}</div>}
        </div>
        </div>
    );
    }

    return (
        <div className="w-full min-w-0">
            {/* 상단 sticky 헤더 */}
            <div className="sticky top-0 z-20 pt-5 px-4 pb-4 mb-4 bg-white/[0.05] backdrop-blur-2xl border border-white/10">
                <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2 text-[#F6F6F6] rounded-full hover:bg-white/10 transition"
                    aria-label="뒤로가기"
                >
                    <IoChevronBack size={22} />
                </button>
                <h1 className="text-xl font-semibold text-[#F6F6F6]">
                    {artist.artist_name} · 앨범
                </h1>
                </div>
            </div>
        
            {/* 메인 카드 */}
            <div className="px-4">
            <section className="w-full mt-4 rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 px-6 py-8">
                {/* 카드 헤더 */}
                <div className="px-2 pb-4 border-b border-white/10">
                <div className="flex items-end justify-between">
                    <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-[#F6F6F6]">앨범 전체보기</h2>
                    <div className="text-base text-white/40">총 {album.length}개</div>
                    </div>
                </div>
                </div>
        
                {/* 앨범 그리드 */}
                <div className="mt-6 overflow-x-auto no-scrollbar">
                <div
                    className="
                    grid
                    gap-x-10
                    gap-y-14
                    justify-between
                    [grid-template-columns:repeat(5,220px)]
                    px-4
                    "
                >
                    {album.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => navigate(`/album/${t.id}`)}
                        className="w-[220px] text-left group shrink-0"
                    >
                        {/* 커버 */}
                        <div
                        className="
                            w-52 h-52 rounded-2xl
                            bg-white/10 overflow-hidden relative
                            transition-all duration-700 ease-out
                            group-hover:shadow-[0_16px_28px_rgba(0,0,0,0.55)]
                        "
                        >
                        {t.album_image ? (
                            <img
                            src={t.album_image}
                            alt={t.title}
                            className="
                                w-full h-full object-cover
                                transition-all duration-1000
                                opacity-90 brightness-95
                                group-hover:scale-[1.15]
                                group-hover:opacity-100
                                group-hover:brightness-110
                            "
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                            }}
                            />
                        ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/30 text-4xl font-black">
                            {t.title?.[0] ?? "?"}
                            </div>
                        )}
                        </div>
        
                        {/* 텍스트 */}
                        <div className="mt-4 ml-1 text-lg font-semibold text-[#F6F6F6] truncate group-hover:text-[#AFDEE2] transition-colors">
                        {t.title}
                        </div>
                    </button>
                    ))}
                </div>
                </div>
            </section>
            </div>
        </div>
    );
}