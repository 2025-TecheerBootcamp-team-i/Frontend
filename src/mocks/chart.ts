
// Chart.ts 코드
export type ChartRow = {
        id: string;
        rank: number;
        title: string;
        artist: string;
        album: string;
        diff: number;
        duration: string;
        isAI: boolean;
    };
    
    export const TOP100 = Array.from({ length: 100 }).map((_, i) => {
        const isAI = (i+1)%10===0;
        return {
        id: `top-${i + 1}`,
        rank: i + 1,
        title: `곡 명 ${i + 1}`,
        artist: `아티스트명 ${i + 1}`,
        album: `앨범명 ${i + 1}`,
        diff: i === 0 ? 0 : Math.floor(Math.random() * 7) - 3,
        duration: "3:05",
        isAI,
        };
    });
    
    export const DAILY = Array.from({ length: 100 }).map((_, i) => {
        const isAI = (i+1)%6===0;
        return {
        id: `daily-${i + 1}`,
        rank: i + 1,
        title: `일일 곡 ${i + 1}`,
        artist: `일일 아티스트 ${i + 1}`,
        album: `일일 앨범 ${i + 1}`,
        diff: i === 0 ? 0 : Math.floor(Math.random() * 7) - 3,
        duration: "3:12",
        isAI,
    };
});
    
    export const AI = Array.from({ length: 50 }).map((_, i) => {
        const isAI = (i+1)%1===0;
        return {
        id: `ai-${i + 1}`,
        rank: i + 1,
        title: `AI 곡 ${i + 1}`,
        artist: `AI 아티스트 ${i + 1}`,
        album: `AI 앨범 ${i + 1}`,
        diff: i === 0 ? 0 : Math.floor(Math.random() * 7) - 3,
        duration: "2:58",
        isAI,
    };
});
    