import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { listMyPlaylists, listLikedPlaylists, createPlaylist as createPlaylistAPI, deletePlaylist as deletePlaylistAPI } from "../api/playlist";
import type { PlaylistSummary } from "../api/playlist";
import { SYSTEM_LIKED_PLAYLIST_TITLE } from "../api/playlist";

// ==========================================
// 타입 정의
// ==========================================

export interface Playlist {
  id: string;
  title: string;
  coverUrl?: string;
  createdAt: number;
  visibility: "public" | "private" | "system";
  creator_nickname: string;
  item_count: number;
  like_count: number;
  is_liked: boolean;
}

interface PlaylistContextValue {
  // 내 플레이리스트 (개인 + 시스템)
  myPlaylists: Playlist[];

  // 좋아요한 플레이리스트
  likedPlaylists: Playlist[];

  // 로딩 상태
  isLoading: boolean;

  // 에러 상태
  error: string | null;

  // 플레이리스트 다시 불러오기
  refetch: () => Promise<void>;

  // 플레이리스트 생성
  createPlaylist: (title?: string, visibility?: "public" | "private") => Promise<Playlist>;

  // 플레이리스트 삭제
  deletePlaylist: (playlistId: string) => Promise<void>;
}

// ==========================================
// Context 생성
// ==========================================

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

// ==========================================
// Provider 컴포넌트
// ==========================================

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [likedPlaylists, setLikedPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 응답을 내부 타입으로 변환
  const mapToPlaylist = (p: PlaylistSummary): Playlist => ({
    id: String(p.playlist_id),
    title: p.title,
    coverUrl: "",
    createdAt: new Date(p.created_at).getTime(),
    visibility: p.visibility,
    creator_nickname: p.creator_nickname,
    item_count: p.item_count,
    like_count: p.like_count,
    is_liked: p.is_liked,
  });

  // 플레이리스트 데이터 가져오기
  const fetchPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 내 플레이리스트와 좋아요한 플레이리스트 동시 호출
      const [myData, likedData] = await Promise.all([
        listMyPlaylists(),
        listLikedPlaylists(),
      ]);

      // 내 플레이리스트 처리 - 시스템 플레이리스트를 맨 앞에 배치
      const myMapped = myData.map(mapToPlaylist);
      
      const likedListIdx = myMapped.findIndex((p) => p.visibility === "system");
      if (likedListIdx !== -1) {
        const [likedList] = myMapped.splice(likedListIdx, 1);
        myMapped.unshift(likedList);
      }

      setMyPlaylists(myMapped);

      // 좋아요한 플레이리스트 처리 - 시스템 플레이리스트는 제외 (내 플레이리스트에만 포함)
      const likedMapped = likedData
        .filter((p) => p.visibility !== "system") // 시스템 플레이리스트 제외
        .map(mapToPlaylist);

      setLikedPlaylists(likedMapped);
    } catch (err) {
      console.error("[PlaylistContext] 플레이리스트 로딩 실패:", err);
      const errorMessage = err instanceof Error ? err.message : "플레이리스트를 불러오는데 실패했습니다";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 플레이리스트 생성
  const createPlaylist = useCallback(async (
    title = "새 플레이리스트",
    visibility: "public" | "private" = "private"
  ): Promise<Playlist> => {
    try {
      const newPlaylist = await createPlaylistAPI({ title, visibility });
      
      const mapped = mapToPlaylist(newPlaylist);
      
      // 시스템 플레이리스트 다음에 삽입
      setMyPlaylists((prev) => {
        if (prev.length > 0 && prev[0].title === SYSTEM_LIKED_PLAYLIST_TITLE) {
          return [prev[0], mapped, ...prev.slice(1)];
        }
        return [mapped, ...prev];
      });
      
      return mapped;
    } catch (err) {
      console.error("[PlaylistContext] 플레이리스트 생성 실패:", err);
      throw err;
    }
  }, []);

  // 플레이리스트 삭제
  const deletePlaylist = useCallback(async (playlistId: string): Promise<void> => {
    try {
      await deletePlaylistAPI(playlistId);

      // 삭제된 플레이리스트를 상태에서 제거
      setMyPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch (err) {
      console.error("[PlaylistContext] 플레이리스트 삭제 실패:", err);
      throw err;
    }
  }, []);

  // 초기 로드 - 토큰이 있을 때만 실행
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    
    fetchPlaylists();
  }, [fetchPlaylists]);

  // 로그인/로그아웃 이벤트 감지
  useEffect(() => {
    const handleLogin = () => fetchPlaylists();
    
    const handleLogout = () => {
      setMyPlaylists([]);
      setLikedPlaylists([]);
      setError(null);
    };

    window.addEventListener("login", handleLogin as EventListener);
    window.addEventListener("logout", handleLogout as EventListener);
    
    return () => {
      window.removeEventListener("login", handleLogin as EventListener);
      window.removeEventListener("logout", handleLogout as EventListener);
    };
  }, [fetchPlaylists]);

  const value: PlaylistContextValue = {
    myPlaylists,
    likedPlaylists,
    isLoading,
    error,
    refetch: fetchPlaylists,
    createPlaylist,
    deletePlaylist,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}

// ==========================================
// Custom Hook
// ==========================================

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error("usePlaylists must be used within a PlaylistProvider");
  }
  return context;
}
