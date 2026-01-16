import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack } from "react-icons/io5";

import {
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    subscribePlaylists,
    LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";

export default function PlaylistEditPage() {
    const navigate = useNavigate();
    const { playlistId } = useParams(); // ✅ 여기 바뀜

    const playlist = useMemo(() => getPlaylistById(playlistId), [playlistId]); // ✅

    const [title, setTitle] = useState("");
    const [isPublic, setIsPublic] = useState(false);

    useEffect(() => {
        const sync = () => {
        const p = getPlaylistById(playlistId); // ✅
        if (!p) return;
        setTitle(p.title ?? "");
        setIsPublic(!!p.isPublic);
        };

        sync();
        return subscribePlaylists(sync);
    }, [playlistId]); // ✅

    const isSystemLiked = playlist?.id === LIKED_SYSTEM_ID;
    const canSave = title.trim().length > 0 && !!playlist && !isSystemLiked;

    const handleClose = () => navigate(-1);

    const handleSave = () => {
        if (!playlist) return;
        if (isSystemLiked) return;

        updatePlaylist(playlist.id, {
        title: title.trim(),
        isPublic,
        });

        handleClose();
    };

    const handleDelete = () => {
        if (!playlist) return;
        if (isSystemLiked) return;

        const ok = window.confirm(`"${playlist.title}" 플레이리스트를 삭제할까요?`);
        if (!ok) return;

        deletePlaylist(playlist.id);
        navigate("/my-playlists");
    };

    if (!playlist) {
        return (
        <div className="w-full min-w-0 px-6 py-6 text-white">
            <button
            type="button"
            onClick={handleClose}
            className="mb-6 text-[#aaa] hover:text-white transition"
            aria-label="뒤로가기"
            >
            <IoChevronBack size={24} />
            </button>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            플레이리스트를 찾을 수 없어요.
            <div className="mt-2 text-sm text-[#aaa]">
                요청한 ID: <span className="text-white">{playlistId ?? "(없음)"}</span>
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
                {isSystemLiked ? "시스템 플레이리스트" : "플레이리스트 편집"}
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
                    disabled={isSystemLiked}
                    className={[
                    "w-full h-11 px-4 rounded-2xl",
                    "bg-[#3a3a3a] border border-[#464646]",
                    "text-[#F6F6F6] placeholder:text-[#999]",
                    "outline-none focus:border-[#AFDEE2] transition",
                    isSystemLiked ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                    placeholder="플레이리스트명"
                />
                {title.trim().length === 0 && !isSystemLiked && (
                    <div className="px-2 mt-2 text-xs text-[#ffb4b4]">플리명은 비울 수 없어요.</div>
                )}
                </div>

                <div>
                <div className="text-xs text-[#F6F6F6]/60 mb-2">공개 설정</div>
                <div className="flex gap-2">
                    <button
                    type="button"
                    disabled={isSystemLiked}
                    onClick={() => setIsPublic(true)}
                    className={[
                        "flex-1 h-10 rounded-2xl border border-[#464646]",
                        "text-sm font-semibold transition",
                        isPublic
                        ? "bg-[#AFDEE2] text-[#1d1d1d]"
                        : "bg-[#3a3a3a] text-[#F6F6F6]/80 hover:bg-[#444]",
                        isSystemLiked ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                    >
                    공개
                    </button>
                    <button
                    type="button"
                    disabled={isSystemLiked}
                    onClick={() => setIsPublic(false)}
                    className={[
                        "flex-1 h-10 rounded-2xl border border-[#464646]",
                        "text-sm font-semibold transition",
                        !isPublic
                        ? "bg-[#AFDEE2] text-[#1d1d1d]"
                        : "bg-[#3a3a3a] text-[#F6F6F6]/80 hover:bg-[#444]",
                        isSystemLiked ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                    >
                    비공개
                    </button>
                </div>
                </div>

                <div className="pt-2">
                {isSystemLiked && (
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
                disabled={isSystemLiked}
                className={[
                "px-4 h-10 rounded-2xl border",
                "text-sm font-semibold transition",
                "border-[#E4524D] text-[#E4524D] hover:bg-[#E4524D]/10",
                isSystemLiked ? "opacity-50 cursor-not-allowed" : "",
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
