import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiArrowRight, FiSearch, FiX } from "react-icons/fi";
import { BiLibrary } from "react-icons/bi";
import { usePlaylists } from "../../contexts/PlaylistContext";
import { getPlaylistDetail } from "../../api/playlist";

const PLAYER_H = 85;

// 🔹 Sidebar PlaylistItem Component
function SidebarPlaylistItem({
  playlist,
  onNavigate
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playlist: any;
  onNavigate: (id: string, isSystem: boolean) => void
}) {
  const isSystemLiked = playlist.title === "나의 좋아요 목록" || playlist.visibility === "system";
  const [coverUrls, setCoverUrls] = useState<string[]>([]);
  const [singleCover, setSingleCover] = useState<string | null>(null);

  useEffect(() => {
    // 시스템 플레이리스트거나 이미 커버가 있으면 패스
    if (isSystemLiked || playlist.coverUrl) {
      setSingleCover(playlist.coverUrl ?? null);
      return;
    }

    // 개인 플레이리스트의 경우 상세 조회를 통해 커버 생성
    let cancelled = false;
    (async () => {
      try {
        const detail = await getPlaylistDetail(playlist.id);
        if (cancelled) return;

        // items에서 앨범 이미지 추출
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const images = (detail.items || []).map((item: any) =>
          item.music?.album?.cover_image || item.music?.album_image
        ).filter((url: string) => !!url);

        const uniqueImages = Array.from(new Set(images)).slice(0, 4);
        setCoverUrls(uniqueImages);
        if (uniqueImages.length > 0) {
          setSingleCover(uniqueImages[0]);
        }
      } catch (err) {
        console.error("Failed to fetch playlist cover for sidebar:", playlist.title, err);
      }
    })();

    return () => { cancelled = true; };
  }, [playlist.id, isSystemLiked, playlist.coverUrl, playlist.title]);

  return (
    <div
      onClick={() => onNavigate(playlist.id, isSystemLiked)}
      className="
          group
          flex items-center gap-3
          p-2
          rounded-none
          hover:bg-[#f6f6f6]/10
          cursor-pointer
          transition-colors
          border-b border-white/20
        "
    >
      {/* 썸네일 */}
      <div className="relative w-12 h-12 flex-none rounded bg-[#333] overflow-hidden shadow-lg group-hover:shadow-xl transition-all">
        {coverUrls.length >= 4 ? (
          // 4분할 그리드
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {coverUrls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        ) : singleCover ? (
          <img
            src={singleCover}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          // 기본 아이콘 (좋아요 목록 등)
          <div className={`w-full h-full flex items-center justify-center ${isSystemLiked ? 'bg-gradient-to-br from-[#450af5] to-[#c4efd9]' : 'bg-[#282828]'}`}>
            {isSystemLiked ? (
              <span className="text-white text-lg">♥</span>
            ) : (
              <span className="text-[#797979]">♫</span>
            )}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <p className={`text-[15px] truncate ${isSystemLiked ? 'text-white font-medium' : 'text-white'}`}>
          {playlist.title}
        </p>
        <p className="text-[13px] text-[#b3b3b3] truncate">
          {isSystemLiked ? '자동 생성됨' : `플레이리스트 • ${playlist.creator_nickname}`}
        </p>
      </div>
    </div>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const { myPlaylists, createPlaylist } = usePlaylists();

  // 🔹 시스템 플레이리스트 타입 정의 (Context에서 가져오거나 여기서 정의)
  // 임시로 any 사용하거나 구조 맞춰줌
  const systemPlaylistRaw = {
    id: "liked",
    title: "나의 좋아요 목록",
    coverUrl: "",
    createdAt: 0,
    visibility: "system",
    creator_nickname: "",
    item_count: 0,
    like_count: 0,
    is_liked: true,
  };

  // 검색 상태
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 필터링된 플레이리스트
  const filteredPlaylists = useMemo(() => {
    // 1. 실제 플레이리스트 목록 (중복 제거: 이미 있는 시스템 리스트 제외)
    let list = myPlaylists.filter(p => p.title !== "나의 좋아요 목록" && p.visibility !== "system");

    // 2. 검색 필터
    if (searchQuery.trim()) {
      list = list.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 3. 좋아요 목록 표시 여부 (검색어 없거나, 검색어에 포함될 때)
    const showSystem = !searchQuery.trim() || "나의 좋아요 목록".includes(searchQuery);

    // 4. 합치기 (좋아요 목록을 항상 맨 앞에)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (showSystem ? [systemPlaylistRaw as any, ...list] : list);
  }, [myPlaylists, searchQuery]);

  // 플레이리스트 생성 핸들러
  const handleCreatePlaylist = async () => {
    try {
      const newPlaylist = await createPlaylist("새 플레이리스트");
      // 생성 후 해당 페이지로 이동 (선택사항)
      navigate(`/playlist/${newPlaylist.id}`);
    } catch (err) {
      console.error("플레이리스트 생성 실패:", err);
      // TODO: 토스트 메시지
    }
  };

  // 상세 페이지 이동 핸들러
  const handleNavigate = (id: string, isLiked: boolean = false) => {
    if (isLiked) {
      navigate("/my-playlists/liked"); // 좋아요한 목록 페이지
    } else {
      navigate(`/playlist/${id}`);
    }
  };

  return (
    <aside
      className="
        w-[360px]
        flex-none shrink-0
        bg-transparent
        border-r border-white/5
        backdrop-blur-xl
        flex flex-col
        sticky top-0
        z-40
        overflow-y-auto
        overscroll-contain
        no-scrollbar
      "
      style={{
        height: `calc(100vh - ${PLAYER_H}px)`,
      }}
    >
      {/* 🔹 라이브러리 영역 컨테이너 */}
      <div className="flex-1 flex flex-col pt-2">

        {/* 헤더 */}
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm bg-transparent">
          <button
            className="px-2 flex items-center gap-3 text-[#f6f6f6] hover:text-[#f6f6f6]/50 transition-colors group"
            onClick={() => {
              // "내 라이브러리" 클릭 시 라이브러리 닫기/열기 기능이 있다면 여기에 추가
              // 지금은 그냥 타이틀
            }}
          >
            <BiLibrary className="text-2xl" />
            <span className="font-bold text-lg">내 라이브러리</span>
          </button>

          <div className="flex items-center gap-1">
            {/* 검색 토글 */}
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery(""); // 닫을 때 검색어 초기화
              }}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-all"
              title="플레이리스트 검색"
            >
              <FiSearch size={18} />
            </button>

            {/* 플레이리스트 생성 */}
            <button
              onClick={handleCreatePlaylist}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-all"
              title="새 플레이리스트 만들기"
            >
              <FiPlus size={20} />
            </button>

            {/* 내 라이브러리 페이지로 이동 */}
            <button
              onClick={() => navigate("/my-playlists")}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-all"
              title="라이브러리 확장"
            >
              <FiArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* 검색바 */}
        {isSearchOpen && (
          <div className="px-4 pb-2 animate-fadeIn">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색하기"
                className="w-full bg-[#2a2a2a] text-white text-sm rounded-md pl-8 pr-8 py-1.5 outline-none focus:bg-[#333] transition-colors placeholder:text-[#b3b3b3]/50"
                autoFocus
              />
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b3b3b3]" size={14} />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 필터 (간단하게 텍스트로) */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar mask-linear-x">
          {/* 필요시 태그 필터 추가 가능 */}
        </div>

        {/* 리스트 */}
        <div className="flex-1 overflow-y-auto hover-scrollbar px-2 pb-4">
          <div className="flex flex-col">
            {filteredPlaylists.map((playlist) => (
              <SidebarPlaylistItem
                key={playlist.id}
                playlist={playlist}
                onNavigate={handleNavigate}
              />
            ))}

            {filteredPlaylists.length === 0 && (
              <div className="py-8 text-center text-[#b3b3b3] text-sm">
                {searchQuery ? "검색 결과가 없습니다." : "플레이리스트가 없습니다."}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
