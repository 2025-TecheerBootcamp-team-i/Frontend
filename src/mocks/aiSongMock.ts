    // src/mocks/aiSongMock.ts
    export type AiTrackStatus = "Upload" | "Draft";

    export type AiTrack = {
    musicId: number; // music_id를 숫자로 저장 (앨범 API 호출에 필요)
    status: AiTrackStatus;

    title: string;
    desc: string;
    duration: string;
    createdAt: string;

    isAi: boolean;

    artist: string;
    plays: number;
    lyrics: string;

    coverUrl?: string;
    audioUrl?: string;
    prompt?: string;

    ownerId?: string;
    ownerName?: string;
    };

    type Listener = () => void;
    const listeners = new Set<Listener>();
    const emit = () => listeners.forEach((fn) => fn());

    const fmtKoreanDate = (d = new Date()) =>
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

    {/*
    const genId = () =>
    `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    */}

    // ✅ 초기 더미: 지금 네 DUMMY_TRACKS랑 비슷하게
    let TRACKS: AiTrack[] = [
    {
        musicId: 1,
        status: "Upload",
        title: "테커의 새벽",
        desc:
        "rap, Boom-bap inspired hip-hop with crisp drums, round bass, and warm synth pads over a steady 110 groove, Piano chords punctuate the pocket while male vocals deliver storytelling verses up front",
        duration: "2:27",
        createdAt: "2026년 1월 10일",
        isAi: true,
        artist: "Andrew Park",
        plays: 100,
        lyrics: `[Verse 1]\n퇴근 시간 한참 전에\n우리 하루 이제 시작\n모니터 불빛 아래\n눈은 빨갛지만 입꼬린 살아 있어\n\n커피 줄 서 있는 사이에러 메시지 또 뜨네\n"이건 어제도 봤는데"\n웃으면서 다시 로그를 따라가\n\n[Chorus]`,
        prompt: "새벽 감성, 로파이 힙합, 잔잔한 피아노와 드럼, 한국어 보컬...",
        ownerId: "me",
        ownerName: "나",
    },
    ...Array.from({ length: 10 }).map((_, i) => ({
        musicId: i + 2,
        status: "Draft" as const,
        title: "곡 이름",
        desc: "곡 설명",
        duration: "2:27",
        createdAt: "2026년 1월 10일",
        isAi: true,
        artist: "Unknown",
        plays: 0,
        lyrics: "가사가 아직 없습니다.",
        prompt: "예시 프롬프트",
        ownerId: "other",
        ownerName: "누군가",
    })),
    ];

    export function subscribeAiSongs(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener) };
    }

    export function getAllAiSongs() {
    // 최신이 위로 보이게
    return [...TRACKS].reverse();
    }

    export function getMyAiSongs(ownerId: string) {
    return getAllAiSongs().filter((t) => (t.ownerId ?? "") === ownerId);
    }

    export function getAiSongById(musicId: number) {
    return TRACKS.find((t) => t.musicId === musicId) ?? null;
    }

    export function createAiSong(input: {
    title: string;
    desc: string;
    prompt: string;
    coverUrl?: string; // (지금은 미리보기 URL 넣어도 됨)
    ownerId: string;
    ownerName: string;

    // 선택
    status?: AiTrackStatus;
    duration?: string;
    artist?: string;
    lyrics?: string;
    audioUrl?: string;
    }) {
    const maxMusicId = TRACKS.length > 0 ? Math.max(...TRACKS.map(t => t.musicId)) : 0;
    const t: AiTrack = {
        musicId: maxMusicId + 1,
        status: input.status ?? "Draft",
        title: input.title || "제목 없음",
        desc: input.desc || "곡 설명",
        duration: input.duration ?? "2:27",
        createdAt: fmtKoreanDate(),
        isAi: true,
        artist: input.artist ?? "AI Artist",
        plays: 0,
        lyrics: input.lyrics ?? "가사가 아직 없습니다.",
        prompt: input.prompt,
        coverUrl: input.coverUrl,
        audioUrl: input.audioUrl,
        ownerId: input.ownerId,
        ownerName: input.ownerName,
    };

    TRACKS.push(t);
    emit();
    return t;
    }

    export function updateAiSong(musicId: number, patch: Partial<Omit<AiTrack, "musicId" | "isAi">>) {
    const idx = TRACKS.findIndex((t) => t.musicId === musicId);
    if (idx < 0) return null;
    TRACKS[idx] = { ...TRACKS[idx], ...patch };
    emit();
    return TRACKS[idx];
    }

    export function deleteAiSong(musicId: number) {
    const prev = TRACKS.length;
    TRACKS = TRACKS.filter((t) => t.musicId !== musicId);
    const ok = TRACKS.length !== prev;
    if (ok) emit();
    return ok;
    }