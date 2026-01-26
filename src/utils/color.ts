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

    img.onload = () => {
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

        // 4. 빈도순 정렬 및 상위 색상 추출
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, count)
          .map(([rgbStr]) => {
            const [r, g, b] = rgbStr.split(",").map(Number);

            // 단색이 강해지는 것을 방지하는 보정 로직 (제거: 원색 그대로 사용)
            // 사용자의 요청대로 색 변화를 확실하게 하기 위해 보정 없이 원본 RGB 그대로 반환

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
