import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
    getPlaylistDetail,
    updatePlaylist as updatePlaylistAPI,
    deletePlaylist as deletePlaylistAPI,
    type PlaylistDetail,
} from "../../api/playlist";
import { useToast } from "../../components/common/ToastProvider";

export default function PlaylistEditPage() {
    const navigate = useNavigate();
    const { playlistId } = useParams();
    const { showSuccess, showError } = useToast();

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
    }, [playlistId]);

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
            await deletePlaylistAPI(playlist.playlist_id);
            showSuccess("플레이리스트가 삭제되었습니다");
            navigate("/my-playlists");
        } catch (error) {
            console.error("플레이리스트 삭제 실패:", error);
            showError("플레이리스트 삭제에 실패했습니다");
        }
    };

    if (loading || !playlist) {
        return (
            <div className="fixed inset-0 z-[999]">
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-0 grid place-items-center p-6">
                    <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl p-6">
                        <div className="text-[#F6F6F6]">
                            {loading ? "로딩중..." : "플레이리스트를 찾을 수 없습니다"}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[999]">
        <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
            aria-label="닫기"
        />

        <div className="absolute inset-0 grid place-items-center p-6">
            <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                <div className="text-base font-semibold text-[#F6F6F6]">
                {isSystemPlaylist ? "시스템 플레이리스트" : "플레이리스트 편집"}
                </div>
                <button
                type="button"
                onClick={handleClose}
                className="text-[#F6F6F6]/70 hover:text-white transition"
                aria-label="닫기"
                >
                ✕
                </button>
            </div>

            <div className="px-6 py-5 space-y-4">
                <div>
                <div className="text-xs text-[#F6F6F6]/60 mb-2">플레이리스트명</div>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSystemPlaylist}
                    className={[
                    "w-full h-11 px-4 rounded-2xl",
                    "bg-[#3a3a3a] border border-[#464646]",
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
                <div className="text-xs text-[#F6F6F6]/60 mb-2">공개 설정</div>
                <div className="flex gap-2">
                    <button
                    type="button"
                    disabled={isSystemPlaylist}
                    onClick={() => setIsPublic(true)}
                    className={[
                        "flex-1 h-10 rounded-2xl border border-[#464646]",
                        "text-sm font-semibold transition",
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
                        "flex-1 h-10 rounded-2xl border border-[#464646]",
                        "text-sm font-semibold transition",
                        !isPublic
                        ? "bg-[#AFDEE2] text-[#1d1d1d]"
                        : "bg-[#3a3a3a] text-[#F6F6F6]/80 hover:bg-[#444]",
                        isSystemPlaylist ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                    >
                    비공개
                    </button>
                </div>
                </div>

                <div className="pt-2">
                {isSystemPlaylist && (
                    <div className="mt-2 text-xs text-[#F6F6F6]/50">
                    “나의 좋아요 목록”은 삭제/편집할 수 없어요.
                    </div>
                )}
                </div>
            </div>

            <div className="px-6 py-4 border-t border-[#464646] flex items-center">
            {/* 왼쪽: 삭제 */}
            <button
                type="button"
                onClick={handleDelete}
                disabled={isSystemPlaylist}
                className={[
                "px-4 h-10 rounded-2xl border",
                "text-sm font-semibold transition",
                "border-[#E4524D] text-[#E4524D] hover:bg-[#E4524D]/10",
                isSystemPlaylist ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
            >
                삭제
            </button>

            {/* 오른쪽 버튼들 */}
            <div className="ml-auto flex gap-2">
                <button
                type="button"
                onClick={handleClose}
                className="h-10 px-4 rounded-2xl bg-white/10 text-[#F6F6F6] hover:bg-white/15 transition"
                >
                취소
                </button>
                <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={[
                    "h-10 px-4 rounded-2xl font-semibold transition",
                    canSave
                    ? "bg-[#AFDEE2] text-[#1d1d1d] hover:bg-[#87B2B6]"
                    : "bg-white/10 text-white/30 cursor-not-allowed",
                ].join(" ")}
                >
                완료
                </button>
            </div>
            </div>
            </div>
        </div>
        </div>
    );
}
