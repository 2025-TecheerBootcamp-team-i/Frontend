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
            <h1 className="text-xl font-semibold text-[#F6F6F6]">{artist.artist_name} · 앨범</h1>
            </div>
        </div>

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
                {album.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/album/${t.id}`)}
                    className="w-[220px] text-left group"
                >
                        <div className="aspect-square rounded-2xl bg-[#6b6b6b]/40 group-hover:bg-[#6b6b6b]/55 transition">
                            {t.album_image ? (
                                <img
                                src={t.album_image}
                                alt={t.title}
                                className="w-full h-full rounded-2xl object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#F6F6F6] text-xl">
                                {t.title?.[0] ?? "?"}
                                </div>
                            )}
                        </div>
                    <div className="mt-3 text-sm font-semibold text-[#F6F6F6] truncate">
                    {t.title}
                    </div>
                </button>
                ))}
            </div>
            </div>
        </section>
        </div>
    );
}