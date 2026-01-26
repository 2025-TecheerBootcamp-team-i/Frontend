import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getPlaylistDetail,
  updatePlaylist as updatePlaylistAPI,
  type PlaylistDetail,
} from "../../api/playlist";
import { useToast } from "../../components/common/ToastProvider";
import { usePlaylists } from "../../contexts/PlaylistContext";

/* =====================
  Modal (Portal) - SearchSong 담기 모달과 동일 패턴
===================== */

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
}

function BaseModal({
  open,
  title,
  onClose,
  maxWidthClass = "max-w-[420px]",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  useEscToClose(open, onClose);
  useLockBodyScroll(open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] whitespace-normal">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="닫기" />
      <div className="absolute inset-0 grid place-items-center p-6">
        <div
          className={`w-full ${maxWidthClass} rounded-3xl bg-[#3d3d3d]/80 border border-white/10 shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
            <div className="text-lg font-semibold text-[#F6F6F6]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#F6F6F6]/70 hover:text-white transition"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* =====================
  Component
===================== */

export default function PlaylistEditPage() {
  const navigate = useNavigate();
  const { playlistId } = useParams();
  const { showSuccess, showError } = useToast();
  const { deletePlaylist, refetch } = usePlaylists();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // 플레이리스트 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!playlistId) return;

      try {
        setLoading(true);
        const data = await getPlaylistDetail(playlistId);
        setPlaylist(data);
        setTitle(data.title);
        setIsPublic(data.visibility === "public");
      } catch (error) {
        console.error("플레이리스트 로딩 실패:", error);
        showError("플레이리스트를 불러올 수 없습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playlistId, showError]);

  const isSystemPlaylist = playlist?.title === "나의 좋아요 목록";
  const canSave = title.trim().length > 0 && !!playlist && !isSystemPlaylist;

  const handleClose = () => navigate(-1);

  const handleSave = async () => {
    if (!playlist) return;
    if (isSystemPlaylist) return;
    if (!canSave) return;

    try {
      await updatePlaylistAPI(playlist.playlist_id, {
        title: title.trim(),
        visibility: isPublic ? "public" : "private",
      });

      showSuccess("플레이리스트가 수정되었습니다");

      // 플레이리스트 목록 새로고침 후 닫기
      await refetch();
      handleClose();
    } catch (error) {
      console.error("플레이리스트 수정 실패:", error);
      showError("플레이리스트 수정에 실패했습니다");
    }
  };

  const handleDelete = async () => {
    if (!playlist) return;
    if (isSystemPlaylist) return;

    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await deletePlaylist(playlist.playlist_id.toString());
      showSuccess("플레이리스트가 삭제되었습니다");
      navigate("/my-playlists");
    } catch (error) {
      console.error("플레이리스트 삭제 실패:", error);
      showError("플레이리스트 삭제에 실패했습니다");
    }
  };

  // ✅ SearchSong 담기 모달처럼: 로딩/없음 상태도 모달 안에서 처리
  const modalTitle = isSystemPlaylist ? "시스템 플레이리스트" : "플레이리스트 편집";

  return (
    <BaseModal open={true} onClose={handleClose} title={modalTitle} maxWidthClass="max-w-[420px]">
      {/* body */}
      <div className="px-6 py-5 space-y-4">
        {loading || !playlist ? (
          <div className="text-base text-[#F6F6F6]/70">
            {loading ? "로딩중..." : "플레이리스트를 찾을 수 없습니다"}
          </div>
        ) : (
          <>
            <div>
              <div className="text-sm text-[#F6F6F6]/60 mb-2">플레이리스트명</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSystemPlaylist}
                className={[
                  "w-full h-11 px-4 rounded-2xl",
                  "bg-[#3a3a3a] border border-white/10",
                  "text-[#F6F6F6] placeholder:text-[#999]",
                  "outline-none focus:border-[#AFDEE2] transition",
                  isSystemPlaylist ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
                placeholder="플레이리스트명"
              />
              {title.trim().length === 0 && !isSystemPlaylist && (
                <div className="px-2 mt-2 text-xs text-[#ffb4b4]">플리명은 비울 수 없어요.</div>
              )}
            </div>

            <div>
              <div className="text-sm text-[#F6F6F6]/60 mb-2">공개 설정</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSystemPlaylist}
                  onClick={() => setIsPublic(true)}
                  className={[
                    "flex-1 h-10 rounded-2xl border border-white/10",
                    "text-base font-semibold transition",
                    isPublic
                      ? "bg-[#AFDEE2] text-[#1d1d1d]"
                      : "bg-[#3a3a3a] text-[#F6F6F6]/80 hover:bg-[#444]",
                    isSystemPlaylist ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  공개
                </button>
                <button
                  type="button"
                  disabled={isSystemPlaylist}
                  onClick={() => setIsPublic(false)}
                  className={[
                    "flex-1 h-10 rounded-2xl border border-white/10",
                    "text-base font-semibold transition",
                    !isPublic
                      ? "bg-[#AFDEE2] text-[#1d1d1d]"
                      : "bg-[#3a3a3a] text-[#F6F6F6]/80 hover:bg-[#444]",
                    isSystemPlaylist ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  비공개
                </button>
              </div>

              {isSystemPlaylist && (
                <div className="mt-3 text-xs text-[#F6F6F6]/50">“나의 좋아요 목록”은 삭제/편집할 수 없어요.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* footer */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSystemPlaylist || loading || !playlist}
          className={[
            "px-4 h-10 rounded-2xl border",
            "text-base font-semibold transition",
            "border-[#E4524D] text-[#E4524D] hover:bg-[#E4524D]/10",
            isSystemPlaylist || loading || !playlist ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          삭제
        </button>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 px-4 rounded-2xl text-base text-[#F6F6F6] hover:bg-white/10 transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || loading || !playlist}
            className={[
              "h-10 px-4 rounded-2xl font-semibold transition text-base",
              canSave && !loading && !!playlist
                ? "bg-[#AFDEE2] text-[#1d1d1d] hover:bg-[#87B2B6]"
                : "bg-white/10 text-white/30 cursor-not-allowed",
            ].join(" ")}
          >
            완료
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
