
    export type Track = { id: string; title: string; album: string; duration: string };
    export type Album = { id: string; title: string; year: string };

    export type ArtistData = {
    id: string;
    name: string;
    tracks: Track[];
    albums: Album[];
    };

    export const ARTISTS: Record<string, ArtistData> = {
    a1: {
        id: "a1",
        name: "아티스트 A",
        tracks: [
                { id: "a1-t1-01", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-01", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-01", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },
                { id: "a1-t1-02", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-02", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-02", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },

                { id: "a1-t1-03", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-03", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-03", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },

                { id: "a1-t1-04", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-04", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-04", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },
        ],
        albums: [
        { id: "a1-al1", title: "A - 앨범 1", year: "2024" },
        { id: "a1-al2", title: "A - 앨범 2", year: "2023" },
        { id: "a1-al3", title: "A - 앨범 3", year: "2022" },
        { id: "a1-al4", title: "A - 앨범 4", year: "2021" },
        { id: "a1-al5", title: "A - 앨범 5", year: "2022" },
        { id: "a1-al6", title: "A - 앨범 6", year: "2021" },
        ],
    },
    a2: {
        id: "a2",
        name: "아티스트 B",
        tracks: [
        { id: "a2-t1", title: "B - 인기곡 1", album: "B - 미니 1집", duration: "3:01" },
        { id: "a2-t2", title: "B - 인기곡 2", album: "B - 정규 1집", duration: "2:45" },
        { id: "a2-t3", title: "B - 인기곡 3", album: "B - 싱글 모음", duration: "4:10" },
        ],
        albums: [
        { id: "a2-al1", title: "B - 미니 1집", year: "2025" },
        { id: "a2-al2", title: "B - 정규 1집", year: "2024" },
        { id: "a2-al3", title: "B - 싱글 모음", year: "2023" },
        { id: "a2-al4", title: "B - EP", year: "2022" },
        ],
    },
    };

    // ================================
    // ✅ Album Like Store (in-memory)
    // ================================

    const albumLikedIds: Record<string, boolean> = {};
    const albumLikeCounts: Record<string, number> = {};

    // ✅ 구독/알림
    const albumListeners = new Set<() => void>();
    const emitAlbum = () => albumListeners.forEach((fn) => fn());

    export function subscribeAlbums(fn: () => void) {
    albumListeners.add(fn);
    return () => {
        albumListeners.delete(fn);
    };
    }

    // ✅ 좋아요 여부
    export function isAlbumLiked(albumId: string) {
    return !!albumLikedIds[albumId];
    }

    // ✅ 좋아요 카운트 (없으면 fallback 사용)
    export function getAlbumLikeCount(albumId: string, fallback = 0) {
    return albumLikeCounts[albumId] ?? fallback;
    }

    // ✅ 좋아요 토글 (+ 카운트 증감)
    export function toggleAlbumLike(albumId: string, fallbackInitial = 0) {
    const nextLiked = !albumLikedIds[albumId];
    albumLikedIds[albumId] = nextLiked;

    const curCount = albumLikeCounts[albumId] ?? fallbackInitial;
    const nextCount = Math.max(0, curCount + (nextLiked ? 1 : -1));
    albumLikeCounts[albumId] = nextCount;

    emitAlbum();
    return { liked: nextLiked, likeCount: nextCount };
    }

