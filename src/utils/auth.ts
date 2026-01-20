/**
 * 인증 관련 유틸리티 함수
 */

/**
 * 현재 로그인한 사용자 ID 가져오기
 * @returns 사용자 ID (number) 또는 null (로그인 안 됨)
 */
export function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number };
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}
