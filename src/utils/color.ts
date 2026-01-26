/**
 * 이미지 URL에서 주요 색상을 추출하고 파스텔 톤으로 변환하는 유틸리티
 */

export async function extractPastelColors(url: string, count: number = 3): Promise<string[]> {
  return new Promise((resolve) => {
    // 1. 이미지 객체 생성 및 CORS 설정 (src 설정보다 먼저 와야 함)
    const img = new Image();
    img.crossOrigin = "anonymous";

    // 캐시 방지를 위해 타임스탬프 추가 (CORS 문제 해결에 도움)
    const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
    img.src = url + cacheBuster;

    // 타임아웃 설정 (이미지 로드 2.5초 이상 걸리면 기본값 반환)
    const timeoutId = setTimeout(() => {
      resolve(getDefaultPastels(count));
    }, 2500);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas context not found");

        // 2. 이미지를 10x10으로 아주 작게 그려서 전체적인 평균 색상 확보
        const sampleSize = 10;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        const colorCounts: { [key: string]: number } = {};
        const step = 4; // 모든 픽셀 조사

        // 3. 색상 분포 수집
        for (let i = 0; i < imageData.length; i += step) {
          // 투명도가 낮으면 무시
          if (imageData[i + 3] < 128) continue;

          // 색상을 약간 뭉뚱그려 빈도 계산 (비슷한 색상끼리 묶음)
          const r = Math.floor(imageData[i] / 16) * 16;
          const g = Math.floor(imageData[i + 1] / 16) * 16;
          const b = Math.floor(imageData[i + 2] / 16) * 16;
          const key = `${r},${g},${b}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // 4. 빈도순 정렬 및 상위 색상 추출 (비비드/밝은 색상 가중치 적용)
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => {
            const [r1, g1, b1] = a[0].split(",").map(Number);
            const [r2, g2, b2] = b[0].split(",").map(Number);

            const getScore = (r: number, g: number, b: number, count: number) => {
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const l = (max + min) / 2 / 255; // 0~1
              const d = max - min;
              const s = max === 0 ? 0 : d / max; // 0~1 (HSV style mostly)

              // 가중치 계산
              let score = count;

              // 1. 무채색(회색조) 페널티: 채도가 낮을수록 점수 대폭 감소
              if (s < 0.2) score *= 0.3;
              else if (s < 0.4) score *= 0.8;
              else score *= 1.5; // 채도 높으면 가점

              // 2. 너무 어둡거나 너무 밝은 색 페널티
              if (l < 0.15) score *= 0.3; // 너무 어두움
              else if (l > 0.9) score *= 0.5; // 너무 밝음 (흰색)
              else if (l > 0.4) score *= 1.2; // 중간 밝기 이상 선호

              return score;
            };

            const scoreA = getScore(r1, g1, b1, a[1]);
            const scoreB = getScore(r2, g2, b2, b[1]);

            return scoreB - scoreA;
          })
          .slice(0, count)
          .map(([rgbStr]) => {
            const [r, g, b] = rgbStr.split(",").map(Number);
            return `rgb(${r}, ${g}, ${b})`;
          });

        if (sortedColors.length === 0) {
          resolve(getDefaultPastels(count));
        } else {
          // 색상이 부족하면 채우기
          while (sortedColors.length < count) {
            sortedColors.push(sortedColors[0] || "#AFDEE2");
          }
          resolve(sortedColors);
        }
      } catch (err) {
        console.error("Color extraction error:", err);
        resolve(getDefaultPastels(count));
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(getDefaultPastels(count));
    };
  });
}

function getDefaultPastels(count: number): string[] {
  const palettes = [
    ["#AFDEE2", "#87B2B6", "#A5C7CC"],
    ["#D1C4E9", "#B39DDB", "#9575CD"],
    ["#F8BBD0", "#F48FB1", "#F06292"],
    ["#C8E6C9", "#A5D6A7", "#81C784"]
  ];
  const selected = palettes[Math.floor(Math.random() * palettes.length)];
  return selected.slice(0, count);
}

// RGB 문자열(rgb(r, g, b) 등)을 HSL 객체로 변환
export function rgbStringToHsl(rgbStr: string): { h: number; s: number; l: number } | null {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return null;

  const r = parseInt(match[0]) / 255;
  const g = parseInt(match[1]) / 255;
  const b = parseInt(match[2]) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * 주어진 기본 색상(RGB)을 바탕으로 유사한 색상 팔레트 생성
 * @param baseColor rgb(r, g, b) 형태의 문자열
 * @param count 생성할 색상 개수
 */
export function generateAnalogousPalette(baseColor: string, count: number = 3): string[] {
  const hsl = rgbStringToHsl(baseColor);
  if (!hsl) return Array(count).fill(baseColor);

  const colors: string[] = [];

  // 기본 색상 포함
  colors.push(`hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.5)`);

  // 색조(Hue)를 좌우로 조금씩 이동하여 유사 색상 생성
  for (let i = 1; i < count; i++) {
    // 15도 -> 8도로 줄여서 더 비슷한 색상 범위로 제한
    const hueShift = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 8;
    const newH = (hsl.h + hueShift + 360) % 360;

    // 채도와 명도를 약간 높여서 더 화사하게 (채도 +10, 명도 +5 보정)
    const newS = Math.max(30, Math.min(100, hsl.s + 10 + (Math.random() * 10 - 5)));
    const newL = Math.max(20, Math.min(90, hsl.l + 5 + (Math.random() * 10 - 5)));

    colors.push(`hsla(${newH}, ${newS}%, ${newL}%, 0.4)`);
  }

  return colors;
}
