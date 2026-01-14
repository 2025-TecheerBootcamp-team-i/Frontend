
    export type Track = { id: string; title: string; album: string; duration: string };
    export type Album = { id: string; title: string; year: string };

    export type ArtistData = {
    id: string;
    name: string;
    tracks: Track[];
    albums: Album[];
    };

    export const ARTISTS: Record<string, ArtistData> = {
    a1: {
        id: "a1",
        name: "아티스트 A",
        tracks: [
                { id: "a1-t1-01", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-01", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-01", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },
                { id: "a1-t1-02", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-02", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-02", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },

                { id: "a1-t1-03", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-03", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-03", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },

                { id: "a1-t1-04", title: "A - 대표곡 1", album: "A - 앨범 1", duration: "2:34" },
                { id: "a1-t2-04", title: "A - 대표곡 2", album: "A - 앨범 2", duration: "3:12" },
                { id: "a1-t3-04", title: "A - 대표곡 3", album: "A - 앨범 3", duration: "2:58" },
        ],
        albums: [
        { id: "a1-al1", title: "A - 앨범 1", year: "2024" },
        { id: "a1-al2", title: "A - 앨범 2", year: "2023" },
        { id: "a1-al3", title: "A - 앨범 3", year: "2022" },
        { id: "a1-al4", title: "A - 앨범 4", year: "2021" },
        { id: "a1-al5", title: "A - 앨범 5", year: "2022" },
        { id: "a1-al6", title: "A - 앨범 6", year: "2021" },
        ],
    },
    a2: {
        id: "a2",
        name: "아티스트 B",
        tracks: [
        { id: "a2-t1", title: "B - 인기곡 1", album: "B - 미니 1집", duration: "3:01" },
        { id: "a2-t2", title: "B - 인기곡 2", album: "B - 정규 1집", duration: "2:45" },
        { id: "a2-t3", title: "B - 인기곡 3", album: "B - 싱글 모음", duration: "4:10" },
        ],
        albums: [
        { id: "a2-al1", title: "B - 미니 1집", year: "2025" },
        { id: "a2-al2", title: "B - 정규 1집", year: "2024" },
        { id: "a2-al3", title: "B - 싱글 모음", year: "2023" },
        { id: "a2-al4", title: "B - EP", year: "2022" },
        ],
    },
    };
