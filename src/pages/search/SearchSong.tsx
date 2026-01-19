import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import { IoPlayCircle, IoShuffle } from "react-icons/io5";
import { MdPlaylistAdd, MdFavorite } from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";

import { usePlayer } from "../../player/PlayerContext";
import type { PlayerTrack } from "../../player/PlayerContext";

import {
  getPlaylistById,
  getUserPlaylists,
  subscribePlaylists,
  updatePlaylist,
  LIKED_SYSTEM_ID,
} from "../../mocks/playlistMock";

/* ===================== 타입 ===================== */

type Song = {
  id: string;
  musicId?: number; // 실제 재생에 사용할 음악 ID
  title: string;
  artist: string;
  album: string;
  duration: string;
  isAi?: boolean;
  albumId?: number | null;
  artistId?: number | null;
};

// API 응답 타입
type ApiSearchResult = {
  itunes_id: number;
  music_id: number; // 실제 재생에 사용할 음악 ID
  music_name: string;
  artist_name: string;
  artist_id: number | null;
  album_name: string;
  album_id: number | null;
  duration: number | null;
  is_ai: boolean;
  audio_url: string | null;
  album_image: string | null;
};

// 아티스트별 앨범 API 응답 타입
type ArtistAlbum = {
  id: string;
  title: string;
  year: string;
  album_image: string | null;
};

type ApiSearchResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiSearchResult[];
};

/* ===================== 더미 데이터 ===================== */

const ALL_SONGS: Song[] = Array.from({ length: 12 }).map((_, i) => ({
  id: String(i + 1),
  title: "곡 명",
  artist: "아티스트명",
  album: "앨범명",
  duration: "2:27",
  isAi: i % 4 === 0,
}));

/* ===================== 액션 ===================== */

const actions = [
  { key: "play", label: "재생", icon: <IoPlayCircle size={18} /> },
  { key: "shuffle", label: "셔플", icon: <IoShuffle size={18} /> },
  { key: "add", label: "담기", icon: <MdPlaylistAdd size={18} /> },
  { key: "like", label: "좋아요", icon: <MdFavorite size={18} /> },
] as const;

type ActionKey = (typeof actions)[number]["key"];

/* ===================== 컴포넌트 ===================== */

export default function SearchSong() {
  const { playTracks } = usePlayer();

  const [sp, setSp] = useSearchParams();
  const q = (sp.get("q") ?? "").trim();
  const excludeAi = sp.get("noai") === "1";

  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

  // API 데이터 상태
  const [apiSongs, setApiSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 앨범 정보 상태
  const [albums, setAlbums] = useState<Record<number, ArtistAlbum>>({});
  
  // 앨범 상세 정보 캐시 (music_id를 찾기 위해) - useRef로 관리하여 무한 루프 방지
  const albumDetailsCacheRef = useRef<Record<number, {
    tracks: Array<{ music_id: number; music_name: string }>;
  }>>({});

  const toggleExcludeAi = () => {
    const next = new URLSearchParams(sp);
    if (excludeAi) next.delete("noai");
    else next.set("noai", "1");
    setSp(next, { replace: true });
  };

  // 아티스트별 앨범 정보 가져오기
  const fetchArtistAlbums = useCallback(
    async (artistIds: number[]) => {
      if (!API_BASE) return;

      const albumMap: Record<number, ArtistAlbum> = {};

      try {
        console.log(`[SearchSong] 아티스트별 앨범 정보 가져오기 시작: ${artistIds.length}개 아티스트`);

        const promises = artistIds.map(async (artistId) => {
          try {
            const url = `${API_BASE}/artists/${artistId}/albums/`;
            console.log(`[SearchSong] 아티스트 ${artistId}의 앨범 목록 요청: ${url}`);

            const res = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

            if (res.ok) {
              const data: ArtistAlbum[] = await res.json();
              console.log(`[SearchSong] 아티스트 ${artistId}의 앨범 목록 수신:`, {
                artist_id: artistId,
                album_count: data.length,
                albums: data.map((a) => ({
                  id: a.id,
                  title: a.title,
                  has_image: !!a.album_image,
                })),
              });

              return { artistId, albums: data };
            }
            return null;
          } catch (e) {
            console.error(`[SearchSong] 아티스트 ${artistId}의 앨범 목록 가져오기 실패:`, e);
            return null;
          }
        });

        const results = await Promise.all(promises);

        // 각 앨범을 맵에 추가
        results.forEach((result) => {
          if (result) {
            result.albums.forEach((album) => {
              albumMap[Number(album.id)] = album;
            });
          }
        });

        console.log(`[SearchSong] 최종 앨범 맵: ${Object.keys(albumMap).length}개 앨범`);
        setAlbums(albumMap);
      } catch (e) {
        console.error("[SearchSong] 아티스트별 앨범 정보 가져오기 오류:", e);
      }
    },
    [API_BASE]
  );

  /* ===================== API 호출 ===================== */

  useEffect(() => {
    // API가 설정되지 않았거나 검색어가 없으면 더미 데이터 사용
    if (!API_BASE || !q.trim()) {
      setApiSongs([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 검색 API 호출
        const params = new URLSearchParams({
          q: q,
          exclude_ai: excludeAi ? "true" : "false",
          page_size: "100",
        });

        const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`API 오류: ${res.status}`);
        }

        const data: ApiSearchResponse = await res.json();

        console.log(`[SearchSong] 검색 결과 수신:`, {
          query: q,
          count: data.count,
          results_count: data.results.length,
        });

        // API 응답을 Song 형식으로 변환
        const converted: Song[] = data.results.map((r) => ({
          id: String(r.itunes_id), // 표시용 ID는 itunes_id 유지
          musicId: r.music_id, // 실제 재생에 사용할 music_id
          title: r.music_name,
          artist: r.artist_name,
          album: r.album_name,
          duration: r.duration
            ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, "0")}`
            : "0:00",
          isAi: r.is_ai,
          albumId: r.album_id,
          artistId: r.artist_id,
        }));

        console.log(`[SearchSong] 변환된 곡 데이터:`, converted.length, "개");
        setApiSongs(converted);

        // 고유한 artist_id 추출 (null 제외)
        const uniqueArtistIds = Array.from(
          new Set(
            data.results
              .map((r) => r.artist_id)
              .filter((id): id is number => id !== null)
          )
        );

        // 아티스트별 앨범 정보 가져오기
        if (uniqueArtistIds.length > 0) {
          await fetchArtistAlbums(uniqueArtistIds);
        } else {
          setAlbums({});
        }
      } catch (e: unknown) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("[SearchSong] 검색 API 오류:", e);
        setError(e instanceof Error ? e.message : "알 수 없는 오류");
        setApiSongs([]);
        setAlbums({});
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API_BASE, q, excludeAi, fetchArtistAlbums]);

  /* ===================== 검색/필터 ===================== */

  const songs = useMemo(() => {
    // API 데이터가 있으면 API 데이터 사용, 없으면 더미 데이터
    if (API_BASE && q.trim() && apiSongs.length > 0) {
      return apiSongs.filter((s) => !excludeAi || !s.isAi);
    }

    // 더미 데이터 필터링 (API가 없을 때만)
    let result = ALL_SONGS;

    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(lower) ||
          s.artist.toLowerCase().includes(lower) ||
          s.album.toLowerCase().includes(lower)
      );
    }

    if (excludeAi) result = result.filter((s) => !s.isAi);
    return result;
  }, [API_BASE, q, excludeAi, apiSongs]);

  /* ===================== 체크박스 ===================== */

  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const allChecked = songs.length > 0 && songs.every((s) => checkedIds[s.id]);
  const someChecked = songs.some((s) => checkedIds[s.id]) && !allChecked;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked;
    }
  }, [someChecked]);

  const toggleAll = (next: boolean) => {
    const obj: Record<string, boolean> = {};
    songs.forEach((s) => (obj[s.id] = next));
    setCheckedIds(obj);
  };

  const toggleOne = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ===================== 선택 트랙 ===================== */

  // 앨범 상세 정보 가져오기 (music_id 찾기 위해)
  const fetchAlbumDetail = useCallback(async (albumId: number) => {
    if (!API_BASE) return null;
    
    // 캐시에 있으면 캐시 반환
    if (albumDetailsCacheRef.current[albumId]) {
      return albumDetailsCacheRef.current[albumId];
    }

    try {
      const res = await axios.get<{
        album_id: number;
        tracks: Array<{ music_id: number; music_name: string }>;
      }>(`${API_BASE}/albums/${albumId}/`, {
        headers: { "Content-Type": "application/json" },
      });

      const detail = {
        tracks: res.data.tracks.map((t: { music_id: number; music_name: string }) => ({
          music_id: t.music_id,
          music_name: t.music_name,
        })),
      };

      // 캐시에 저장
      albumDetailsCacheRef.current[albumId] = detail;

      return detail;
    } catch (e) {
      console.error(`[SearchSong] 앨범 ${albumId} 상세 정보 가져오기 실패:`, e);
      return null;
    }
  }, [API_BASE]);

  // 곡의 music_id 찾기
  const findMusicId = useCallback(async (song: Song): Promise<number | null> => {
    // musicId가 있으면 사용
    if (song.musicId) {
      return song.musicId;
    }

    // albumId가 없으면 찾을 수 없음
    if (!song.albumId) {
      console.warn(`[SearchSong] 곡 ${song.title}의 albumId가 없습니다.`);
      return null;
    }

    // 앨범 상세 정보 가져오기
    const albumDetail = await fetchAlbumDetail(song.albumId);
    if (!albumDetail) {
      return null;
    }

    // 곡 이름으로 매칭해서 music_id 찾기
    const track = albumDetail.tracks.find((t: { music_name: string }) => t.music_name === song.title);
    if (track) {
      console.log(`[SearchSong] 곡 ${song.title}의 music_id 찾음: ${track.music_id}`);
      return track.music_id;
    }

    console.warn(`[SearchSong] 곡 ${song.title}을 앨범 ${song.albumId}의 트랙 목록에서 찾을 수 없습니다.`);
    return null;
  }, [fetchAlbumDetail]);

  // 곡의 오디오 URL 가져오기
  const fetchTrackAudioUrl = useCallback(async (musicId: string): Promise<string | undefined> => {
    if (!API_BASE) return undefined;

    try {
      const res = await axios.get<{ audio_url: string }>(`${API_BASE}/tracks/${musicId}/play`, {
        headers: { "Content-Type": "application/json" },
      });
      return res.data.audio_url;
    } catch (e) {
      console.error(`[SearchSong] 곡 ${musicId} 재생 URL 가져오기 실패:`, e);
      return undefined;
    }
  }, [API_BASE]);

  const toTrack = async (s: Song): Promise<PlayerTrack> => {
    // music_id 찾기
    const musicId = await findMusicId(s);
    
    if (!musicId) {
      console.warn(`[SearchSong] 곡 ${s.title}의 music_id를 찾을 수 없습니다.`);
      return {
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        audioUrl: undefined,
        coverUrl: undefined,
      };
    }

    // 오디오 URL 가져오기
    const audioUrl = await fetchTrackAudioUrl(String(musicId));
    
    // 앨범 이미지 찾기
    const apiSong = apiSongs.find((as) => as.id === s.id);
    let coverUrl: string | undefined = undefined;
    
    if (apiSong?.albumId) {
      const album = albums[apiSong.albumId];
      if (album?.album_image) {
        const albumImage = album.album_image;
        // URL 처리 (상대 경로를 절대 경로로 변환)
        if (albumImage.startsWith("http") || albumImage.startsWith("//")) {
          coverUrl = albumImage;
        } else if (API_BASE && albumImage.startsWith("/")) {
          coverUrl = `${API_BASE.replace("/api/v1", "")}${albumImage}`;
        } else {
          coverUrl = albumImage;
        }
      }
    }

    console.log(`[SearchSong] 곡 ${s.id} (music_id: ${musicId}) (${s.title})의 오디오 URL:`, audioUrl || "(없음)");
    
    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      audioUrl: audioUrl || undefined,
      coverUrl: coverUrl,
      musicId: musicId || undefined, // music_id 저장
    };
  };

  const checkedSongs = useMemo(
    () => songs.filter((s) => checkedIds[s.id]),
    [songs, checkedIds]
  );

  const selectedCount = checkedSongs.length;

  /* ===================== 담기 모달 ===================== */

  const [addOpen, setAddOpen] = useState(false);
  const [addTargets, setAddTargets] = useState(() => getUserPlaylists());

  useEffect(() => {
    const sync = () => setAddTargets(getUserPlaylists());
    sync();
    return subscribePlaylists(sync);
  }, []);

  const addSelectedToPlaylist = async (playlistId: string) => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(playlistId);
    if (!curr) return;

    const checkedTracks = await Promise.all(checkedSongs.map(toTrack));
    const incoming = checkedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album ?? "",
      duration: t.duration ?? "0:00",
      likeCount: 0,
      kind: "track" as const,
    }));

    const exists = new Set(curr.tracks.map((x) => x.id));
    const merged = [...curr.tracks];

    for (const tr of incoming) {
      if (exists.has(tr.id)) continue;
      merged.push(tr);
      exists.add(tr.id);
    }

    updatePlaylist(playlistId, { tracks: merged });
    setAddOpen(false);
    setCheckedIds({});
  };

  const addSelectedToLiked = async () => {
    if (selectedCount === 0) return;

    const curr = getPlaylistById(LIKED_SYSTEM_ID);
    if (!curr) return;

    const checkedTracks = await Promise.all(checkedSongs.map(toTrack));
    const incoming = checkedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album ?? "",
      duration: t.duration ?? "0:00",
      likeCount: 0,
      kind: "track" as const,
    }));

    const exists = new Set(curr.tracks.map((x) => x.id));
    const merged = [...curr.tracks];

    for (const tr of incoming) {
      if (exists.has(tr.id)) continue;
      merged.push(tr);
      exists.add(tr.id);
    }

    updatePlaylist(LIKED_SYSTEM_ID, { tracks: merged });
    setCheckedIds({});
  };

  /* ===================== 액션 ===================== */

  const handleAction = async (key: ActionKey) => {
    if (selectedCount === 0) return;

    if (key === "play") {
      const playerTracks = await Promise.all(checkedSongs.map(toTrack));
      playTracks(playerTracks);
      return;
    }
    if (key === "shuffle") {
      const playerTracks = await Promise.all(checkedSongs.map(toTrack));
      playTracks(playerTracks, { shuffle: true });
      return;
    }
    if (key === "add") {
      setAddOpen(true);
      return;
    }
    if (key === "like") {
      await addSelectedToLiked();
      return;
    }
  };

  /* ===================== JSX ===================== */

  return (
    <section className="mt-4 rounded-3xl bg-[#2d2d2d]/80 border border-[#464646] overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 pt-5 pb-4 border-b border-[#464646] overflow-x-auto whitespace-nowrap">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-[#F6F6F6]">곡</h2>
            {loading ? (
              <div className="text-sm text-[#999]">검색 중...</div>
            ) : error ? (
              <div className="text-sm text-red-400">오류: {error}</div>
            ) : (
            <div className="text-sm text-[#999]">총 {songs.length}곡</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={toggleExcludeAi}
            className={[
              "shrink-0 px-4 py-2 rounded-2xl text-sm flex items-center gap-2 outline outline-1",
              excludeAi
                ? "outline-[#AFDEE2] text-[#AFDEE2]"
                : "outline-[#f6f6f6] text-[#f6f6f6]",
            ].join(" ")}
          >
            <FaCheckCircle size={18} />
            AI 제외
          </button>

          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleAction(a.key)}
              className={[
                "px-4 py-2 rounded-2xl outline outline-1 text-sm flex items-center gap-2",
                selectedCount === 0
                  ? "text-white/30 cursor-not-allowed"
                  : "text-[#F6F6F6] hover:bg-white/10",
              ].join(" ")}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* 리스트 헤더 */}
      <div className="px-6 pt-4 border-b border-[#464646]">
        <div className="px-4 grid grid-cols-[28px_56px_1fr_90px] gap-x-4 pb-3 text-xs text-[#F6F6F6]/60">
          <input
            ref={selectAllRef}
            type="checkbox"
            className="accent-[#f6f6f6]"
            checked={allChecked}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          <div className="col-span-2 px-2 border-l border-[#464646]">곡정보</div>
          <div className="text-right px-2 border-r border-[#464646]">길이</div>
        </div>
      </div>

      {/* 리스트 */}
      <div className="px-4 divide-y divide-[#464646]">
        {loading && songs.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#999]">검색 중...</div>
        ) : error && songs.length === 0 ? (
          <div className="px-6 py-12 text-center text-red-400">
            오류가 발생했습니다: {error}
          </div>
        ) : songs.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#999]">
            {q ? "검색 결과가 없습니다." : "검색어를 입력해주세요."}
          </div>
        ) : (
          songs.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-[28px_56px_1fr_90px] items-center gap-x-4 px-6 py-3 hover:bg-white/5"
          >
            <input
              type="checkbox"
              className="accent-[#f6f6f6]"
              checked={!!checkedIds[s.id]}
              onChange={() => toggleOne(s.id)}
            />

            {/* 앨범 이미지 */}
            <div className="ml-1 w-10 h-10 rounded-xl bg-[#6b6b6b]/50 border border-[#464646] overflow-hidden relative flex-shrink-0">
              {(() => {
                // API에서 가져온 곡인지 확인하고 앨범 이미지 찾기
                const apiSong = apiSongs.find((as) => as.id === s.id);
                let albumImage: string | null = null;

                if (apiSong?.albumId) {
                  const album = albums[apiSong.albumId];
                  albumImage = album?.album_image || null;
                }

                return albumImage ? (
                  <>
                    <img
                      src={
                        albumImage.startsWith("http") || albumImage.startsWith("//")
                          ? albumImage
                          : API_BASE && albumImage.startsWith("/")
                          ? `${API_BASE.replace("/api/v1", "")}${albumImage}`
                          : albumImage
                      }
                      alt={s.title}
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => {
                        console.error(`[SearchSong] ❌ 곡 앨범 이미지 로드 실패:`, {
                          song: s.title,
                          album_id: apiSong?.albumId,
                          image_url: albumImage,
                        });
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      onLoad={(e) => {
                        console.log(`[SearchSong] ✅ 곡 앨범 이미지 로드 성공:`, {
                          song: s.title,
                          album_id: apiSong?.albumId,
                          image_url: albumImage,
                        });
                        const img = e.target as HTMLImageElement;
                        const fallback = img.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = "none";
                        }
                      }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-[#6b6b6b]/50 animate-pulse z-0" />
                  </>
                ) : (
                  <div className="w-full h-full bg-[#6b6b6b]/50" />
                );
              })()}
            </div>

            <div className="min-w-0">
              <div className="text-sm text-[#F6F6F6] truncate">
                {s.title}
                {s.isAi && (
                  <span className="ml-2 text-xs px-2 py-[1px] rounded-full bg-[#E4524D]/20 text-[#E4524D]">
                    AI
                  </span>
                )}
              </div>
              <div className="text-xs text-[#999] truncate">{s.artist}</div>
            </div>

            <div className="mr-1 text-sm text-[#F6F6F6]/70 text-right">{s.duration}</div>
          </div>
          ))
        )}
      </div>

      {/* ✅ 담기 모달 */}
      {addOpen && (
            <div className="fixed inset-0 z-[999] whitespace-normal">
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={() => setAddOpen(false)}
                aria-label="닫기"
            />
            <div className="absolute inset-0 grid place-items-center p-6">
                <div className="w-full max-w-[420px] rounded-3xl bg-[#2d2d2d] border border-[#464646] shadow-2xl overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#464646]">
                    <div className="text-base font-semibold text-[#F6F6F6]">플레이리스트 선택</div>
                    <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="text-[#F6F6F6]/70 hover:text-white transition"
                    aria-label="닫기"
                    >
                    ✕
                    </button>
                </div>

                <div className="px-6 py-4 text-sm text-[#F6F6F6]/70">
                    선택한 {selectedCount}곡을 담을 플레이리스트를 골라주세요
                </div>

                <div className="max-h-[360px] overflow-y-auto border-t border-[#464646]">
                    {addTargets.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-[#aaa]">
                        담을 수 있는 플레이리스트가 없어요.
                        <div className="mt-2 text-xs text-[#777]">(liked 같은 시스템 플리는 제외됨)</div>
                    </div>
                    ) : (
                    addTargets.map((p) => (
                        <button
                        key={p.id}
                        type="button"
                        onClick={() => addSelectedToPlaylist(p.id)}
                        className="w-full text-left px-6 py-4 hover:bg-white/5 transition border-b border-[#464646]"
                        >
                        <div className="text-sm font-semibold text-[#F6F6F6] truncate">{p.title}</div>
                        <div className="mt-1 text-xs text-[#F6F6F6]/60 truncate">
                            {p.owner} · {p.isPublic ? "공개" : "비공개"}
                        </div>
                        </button>
                    ))
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[#464646] flex justify-end">
                    <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="px-4 py-2 rounded-2xl text-sm text-[#F6F6F6] hover:bg-white/10 transition"
                    >
                    취소
                    </button>
                </div>
                </div>
            </div>
            </div>
      )}
    </section>
  );
}
