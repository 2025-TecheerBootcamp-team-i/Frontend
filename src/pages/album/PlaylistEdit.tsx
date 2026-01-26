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
  Modal Utils
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
    <div className="fixed inset-0 z-[99999]">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-6">
        <div
          className={`w-full ${maxWidthClass} rounded-3xl bg-[#3d3d3d]/80 border border-white/10 shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 flex justify-between border-b border-white/10">
            <div className="text-lg font-semibold text-[#F6F6F6]">{title}</div>
            <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
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

  useEffect(() => {
    if (!playlistId) return;

    (async () => {
      try {
        setLoading(true);
        const data = await getPlaylistDetail(playlistId);
        setPlaylist(data);
        setTitle(data.title);
      } catch {
        showError("플레이리스트를 불러올 수 없습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, [playlistId, showError]);

  const isSystemPlaylist = playlist?.title === "나의 좋아요 목록";
  const canSave = !!playlist && title.trim().length > 0 && !isSystemPlaylist;

  const handleClose = () => navigate(-1);

  const handleSave = async () => {
    if (!playlist || !canSave) return;

    try {
      await updatePlaylistAPI(playlist.playlist_id, {
        title: title.trim(),
      });

      showSuccess("플레이리스트가 수정되었습니다");
      await refetch();
      handleClose();
    } catch {
      showError("플레이리스트 수정에 실패했습니다");
    }
  };

  const handleDelete = async () => {
    if (!playlist || isSystemPlaylist) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deletePlaylist(String(playlist.playlist_id));
      showSuccess("플레이리스트가 삭제되었습니다");
      navigate("/my-playlists");
    } catch {
      showError("플레이리스트 삭제에 실패했습니다");
    }
  };

  return (
    <BaseModal open title="플레이리스트 편집" onClose={handleClose}>
      <div className="px-6 py-5 space-y-4">
        {loading || !playlist ? (
          <div className="text-white/60">로딩중...</div>
        ) : (
          <>
            <div>
              <div className="text-sm text-white/60 mb-2">플레이리스트명</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSystemPlaylist}
                className="w-full h-11 px-4 rounded-2xl bg-[#3a3a3a] border border-white/10 text-white"
              />
              {isSystemPlaylist && (
                <div className="mt-2 text-xs text-white/50">
                  시스템 플레이리스트는 수정할 수 없어요.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t border-white/10 flex items-center">
        <button
          onClick={handleDelete}
          disabled={isSystemPlaylist}
          className="px-4 h-10 rounded-2xl border border-[#E4524D] text-[#E4524D]"
        >
          삭제
        </button>

        <div className="ml-auto flex gap-2">
          <button onClick={handleClose} className="px-4 h-10 rounded-2xl text-white">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 h-10 rounded-2xl bg-[#AFDEE2] text-[#1d1d1d]"
          >
            완료
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
