import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa6";
import { usePlaylists } from "../../contexts/PlaylistContext";

import { getPlaylistDetail, isSystemPlaylist } from "../../api/playlist";

/* ===================== 타입 ===================== */
type PlaylistItem = {
  id: string;
  title: string;
  owner: string;
  coverUrl?: string | null;
};

type CoverState = Record<string, { coverUrls: string[]; coverUrl: string | null }>;

/* ===================== 유틸 ===================== */
function buildCoverFromPlaylistDetailItems(items: any[], limit = 4) {
  const urls = (items ?? [])
    .map((it) => it?.music?.album_image)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const unique = Array.from(new Set(urls)).slice(0, limit);
  return { coverUrls: unique, coverUrl: unique[0] ?? null };
}

export default function MyPlaylistsPersonal() {
  const navigate = useNavigate();
  const { myPlaylists, createPlaylist } = usePlaylists();

  // (1) 목록 만들기: id를 최대한 안전하게 뽑기
  const items = useMemo((): PlaylistItem[] => {
    return (myPlaylists ?? []).map((p: any) => {
      const id = String(p.id ?? p.playlist_id ?? "");
      return {
        id,
        title: p.title ?? "플레이리스트",
        owner: p.creator_nickname ?? "—",
      };
    });
  }, [myPlaylists]);

  // (2) 각 플레이리스트의 모자이크 커버(상세 조회 기반)
  const [covers, setCovers] = useState<CoverState>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const targets = (myPlaylists ?? [])
        .map((p: any) => ({
          id: String(p.id ?? p.playlist_id ?? ""),
          title: p.title ?? "",
          visibility: p.visibility,
        }))
        .filter((t) => t.id.length > 0)
        .filter((t) => t.visibility !== "system" && !isSystemPlaylist(t.title))
        .filter((t) => !covers[t.id]) // 이미 받아온 건 재요청 방지
        .filter((t) => Number.isFinite(Number(t.id))); // getPlaylistDetail 인자 안전성

      if (targets.length === 0) return;
        
      // 너무 많은 플리면 서버 부담이 커질 수 있어 동시요청을 제한(6개)
      try {
        const CONCURRENCY = 6;
        const queue = [...targets];
        const results: Array<{ id: string; cover: { coverUrls: string[]; coverUrl: string | null } } | null> = [];

        const worker = async () => {
          while (queue.length) {
            const t = queue.shift();
            if (!t) break;

            try {
              const detail = await getPlaylistDetail(Number(t.id));
              const cover = buildCoverFromPlaylistDetailItems(detail?.items, 4);
              results.push({ id: t.id, cover });
            } catch (e) {
              results.push(null);
            }
          }
        };

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || CONCURRENCY) }, worker));

        if (cancelled) return;

        setCovers((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (!r) continue;
            next[r.id] = r.cover;
          }
          return next;
        });
      } catch (e) {
        console.error("[MyPlaylistPersonal] covers fetch 실패:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [myPlaylists]);

  const handleCreate = async () => {
    await createPlaylist();
  };

  // ✅ 가로 5개(220px * 5) 고정 그리드
  const gridClass = useMemo(
    () =>
      `
        grid
        gap-x-5
        gap-y-12
        justify-between
        [grid-template-columns:repeat(5,220px)]
      `,
    []
  );

  return (
    <section className="rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10">
      <div className="px-8 pt-6 pb-2 flex items-center justify-between">
        <div className="text-2xl font-bold text-[#f6f6f6]">개인</div>

        <button
          type="button"
          onClick={handleCreate}
          className="
            w-10 h-10 rounded-full
            border border-white/10 bg-white/5
            text-white/40 grid place-items-center
            hover:bg-white/10 hover:text-[#AFDEE2]
            transition-all
          "
          aria-label="새 플레이리스트"
          title="새 플레이리스트"
        >
          <FaPlus size={18} />
        </button>
      </div>

      <div className="mb-4 mx-4 border-b border-white/10" />

      <div className="px-6 pb-6 overflow-x-auto">
        <div className={gridClass}>
          {items.map((it) => {
            const cover = covers[it.id];

            return (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(`/playlist/${it.id}`)}
                className="w-[220px] text-left group"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/20 group-hover:bg-white/10 transition-all duration-500 shadow-xl">
                  {/* 커버: (1) 모자이크 우선 → (2) 단일 커버 → (3) fallback */}
                  {cover?.coverUrls?.length ? (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                      {Array.from({ length: 4 }).map((_, idx) => {
                        const src = cover.coverUrls[idx];
                        return src ? (
                          <img
                            key={idx}
                            src={src}
                            alt={`${it.title} cover ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div key={idx} className="w-full h-full bg-white/5" />
                        );
                      })}
                    </div>
                  ) : (cover?.coverUrl || it.coverUrl) ? (
                    <img
                      src={(cover?.coverUrl ?? it.coverUrl) as string}
                      alt={`${it.title} cover`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  )}

                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="mx-1 mt-3">
                  <div className="text-base font-semibold text-[#f6f6f6]/95 truncate group-hover:text-[#AFDEE2] transition-colors">
                    {it.title}
                  </div>
                  <div className="mt-1 text-sm text-[#f6f6f6]/20">{it.owner}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
