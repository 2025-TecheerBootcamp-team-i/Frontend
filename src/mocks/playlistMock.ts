    // src/mocks/playlistMock.ts

    export type Track = {
        id: string;
        title: string;
        artist: string;
        album?: string;
        duration: string;
        likeCount: number;
    
        kind?: "track" | "album";
        albumId?: string;
    };
    
    export type Playlist = {
        id: string;
        title: string;
        owner: string;
        isPublic: boolean;
        likeCount: number;
        tracks: Track[];
        coverUrl?: string;
        createdAt: number;
    };
    
    export const LIKED_SYSTEM_ID = "liked";
    
    const now = Date.now();
    
    const PLAYLISTS: Record<string, Playlist> = {
        [LIKED_SYSTEM_ID]: {
        id: LIKED_SYSTEM_ID,
        title: "나의 좋아요 목록",
        owner: "—",
        isPublic: false,
        likeCount: 0,
        tracks: [],
        createdAt: now,
        },
    
        p1: {
        id: "p1",
        title: "운동할 때",
        owner: "사용자",
        isPublic: true,
        likeCount: 12345,
        tracks: [
            {
            id: "t1",
            title: "대표곡 1",
            artist: "아티스트 A",
            album: "A - 앨범 1",
            duration: "2:34",
            likeCount: 34223,
            },
            {
            id: "t2",
            title: "대표곡 2",
            artist: "아티스트 B",
            album: "B - 앨범 3",
            duration: "3:12",
            likeCount: 234,
            },
            {
            id: "t3",
            title: "대표곡 3",
            artist: "아티스트 C",
            album: "C - 앨범 2",
            duration: "2:58",
            likeCount: 1342556,
            },
        ],
        coverUrl: "",
        createdAt: now - 30000,
        },
    
        p2: {
        id: "p2",
        title: "새벽 감성",
        owner: "사용자",
        isPublic: false,
        likeCount: 4321,
        tracks: [
            {
            id: "t4",
            title: "감성곡 1",
            artist: "아티스트 D",
            album: "D - 앨범 1",
            duration: "3:40",
            likeCount: 4563,
            },
            {
            id: "t5",
            title: "감성곡 2",
            artist: "아티스트 E",
            album: "E - 앨범 2",
            duration: "4:02",
            likeCount: 64532,
            },
        ],
        coverUrl: "",
        createdAt: now - 20000,
        },
    };
    
    // ✅ 구독/알림
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((fn) => fn());
    
    export function subscribePlaylists(fn: () => void) {
        listeners.add(fn);
        return () => {
        listeners.delete(fn);
        };
    }
    
    /** helper */
    export function getPlaylistById(id?: string) {
        if (!id) return null;
        return PLAYLISTS[id] ?? null;
    }
    
    /** ✅ 시스템 liked 제외한 "유저가 만든 플리" 목록 (p로 시작하는 것만) */
    export function getUserPlaylists(): Playlist[] {
        return Object.values(PLAYLISTS).filter(
        (p) => p.id !== LIKED_SYSTEM_ID && p.id.startsWith("p")
        );
    }
    
    /** (혹시 전체 필요하면) */
    export function getAllPlaylists(): Playlist[] {
        return Object.values(PLAYLISTS);
    }
    
    /** ✅ 새 플레이리스트 생성 */
    export function createPlaylist(
        input?: Partial<Pick<Playlist, "title" | "owner" | "isPublic" | "coverUrl">>
    ) {
        const nums = Object.keys(PLAYLISTS)
        .filter((k) => k.startsWith("p"))
        .map((k) => Number(k.replace(/^p/, "")))
        .filter((n) => Number.isFinite(n));
    
        const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
        const id = `p${nextNum}`;
    
        const newPlaylist: Playlist = {
        id,
        title: input?.title?.trim() || `새 플레이리스트 ${nextNum}`,
        owner: input?.owner?.trim() || "사용자",
        isPublic: input?.isPublic ?? false,
        likeCount: 0,
        tracks: [],
        coverUrl: input?.coverUrl ?? "",
        createdAt: Date.now(),
        };
    
        PLAYLISTS[id] = newPlaylist;
        console.log("✅ 플레이리스트 생성:", newPlaylist);
        emit();
        return newPlaylist;
    }
    
    export function updatePlaylist(id: string, patch: Partial<Omit<Playlist, "id">>) {
        const cur = PLAYLISTS[id];
        if (!cur) return;
        PLAYLISTS[id] = { ...cur, ...patch };
        emit();
    }
    
    export function deletePlaylist(id: string) {
        if (id === LIKED_SYSTEM_ID) return; // 시스템 플리 삭제 방지
        if (!PLAYLISTS[id]) return;
    
        delete PLAYLISTS[id];
        delete playlistLikedIds[id];
        emit();
    }
    
    /**
     * ✅ "플레이리스트 좋아요" 상태 (플리 p1/p2 같은거)
     */
    const playlistLikedIds: Record<string, boolean> = {};
    
    /** ✅ 좋아요 여부 */
    export function isPlaylistLiked(id: string) {
        return !!playlistLikedIds[id];
    }
    
    /** ✅ 내가 좋아요한 플레이리스트 목록 id 얻기 */
    export function getLikedPlaylistIds() {
        return { ...playlistLikedIds };
    }
    
    /** ✅ 좋아요 토글 (+ likeCount도 실제로 증감) */
    export function togglePlaylistLike(id: string) {
        if (id === LIKED_SYSTEM_ID) return;
    
        const cur = PLAYLISTS[id];
        if (!cur) return;
    
        const nextLiked = !playlistLikedIds[id];
        playlistLikedIds[id] = nextLiked;
    
        const nextCount = Math.max(0, cur.likeCount + (nextLiked ? 1 : -1));
        PLAYLISTS[id] = { ...cur, likeCount: nextCount };
    
        emit();
    }
    
    /** ✅ "곡 좋아요(트랙 좋아요)" 여부: liked 시스템 플리의 tracks로 판단 */
    export function isTrackLiked(trackId: string) {
        return PLAYLISTS[LIKED_SYSTEM_ID].tracks.some((t) => t.id === trackId);
    }
    
    /** ✅ 곡 좋아요 토글: liked 시스템 플리에 추가/삭제 */
    export function toggleTrackLike(track: Track) {
        const likedPl = PLAYLISTS[LIKED_SYSTEM_ID];
        const idx = likedPl.tracks.findIndex((t) => t.id === track.id);
    
        if (idx >= 0) {
        likedPl.tracks.splice(idx, 1);
        emit();
        return false;
        }
    
        likedPl.tracks.unshift(track);
        emit();
        return true;
    }
    
    /** (옵션) liked 시스템 플리 트랙만 바로 가져오고 싶으면 */
    export function getLikedTracks() {
        return PLAYLISTS[LIKED_SYSTEM_ID].tracks;
    }
    
    /* =========================================================
    * ✅ 앨범 좋아요 (플리 좋아요와 같은 "map" 방식)
    * - PLAYLISTS에 alb: 같은 가짜 플레이리스트를 만들지 않음
    * ========================================================= */
    
    const albumLikedIds: Record<string, boolean> = {};
    const albumLikeCounts: Record<string, number> = {};
    
    /** ✅ 앨범 좋아요 여부 */
    export function isAlbumLiked(albumId: string) {
        return !!albumLikedIds[albumId];
    }
    
    /** ✅ 내가 좋아요한 앨범 id 목록 */
    export function getLikedAlbumIds() {
        return { ...albumLikedIds };
    }
    
    /** ✅ 앨범 likeCount 얻기 (없으면 fallback 사용) */
    export function getAlbumLikeCount(albumId: string, fallback = 0) {
        return albumLikeCounts[albumId] ?? fallback;
    }
    
    /** ✅ 앨범 좋아요 토글 (+ likeCount 증감) */
    export function toggleAlbumLike(albumId: string, fallbackInitial = 0) {
        const nextLiked = !albumLikedIds[albumId];
        albumLikedIds[albumId] = nextLiked;
    
        const curCount = albumLikeCounts[albumId] ?? fallbackInitial;
        const nextCount = Math.max(0, curCount + (nextLiked ? 1 : -1));
        albumLikeCounts[albumId] = nextCount;
    
        emit();
        return { liked: nextLiked, likeCount: nextCount };
}
