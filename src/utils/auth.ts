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

/**
 * 현재 로그인한 사용자 닉네임 가져오기
 * @returns 사용자 닉네임 (string) 또는 기본값 "Name"
 */
export function getCurrentUserNickname(): string {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return "Name";
    const parsed = JSON.parse(raw) as { nickname?: string };
    return typeof parsed.nickname === "string" && parsed.nickname.trim() 
      ? parsed.nickname 
      : "Name";
  } catch {
    return "Name";
  }
}

/**
 * 현재 로그인한 사용자 전체 정보 가져오기
 * @returns 사용자 정보 객체 또는 null
 */
export function getCurrentUser(): { id: number; email: string; nickname: string } | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number; email?: string; nickname?: string };
    if (typeof parsed.id === "number" && parsed.email && parsed.nickname) {
      return {
        id: parsed.id,
        email: parsed.email,
        nickname: parsed.nickname,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 현재 로그인한 사용자의 닉네임 업데이트
 * @param newNickname 새로운 닉네임
 * @returns 성공 여부
 */
export function updateCurrentUserNickname(newNickname: string): boolean {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return false;
    
    const user = JSON.parse(raw) as { id?: number; email?: string; nickname?: string };
    if (typeof user.id !== "number" || !user.email) return false;
    
    // 닉네임 업데이트
    user.nickname = newNickname.trim() || "Name";
    localStorage.setItem("user", JSON.stringify(user));
    
    return true;
  } catch {
    return false;
  }
}

/**
 * 프로필 정보 가져오기 (프로필 사진 포함)
 * @returns 프로필 정보 (name, avatar)
 */
export function getProfile(): { name: string; avatar: string } {
  try {
    const raw = localStorage.getItem("profile");
    if (raw) {
      const profile = JSON.parse(raw) as { name?: string; avatar?: string };
      return {
        name: profile.name || getCurrentUserNickname(),
        avatar: profile.avatar || "",
      };
    }
  } catch {
    // ignore
  }
  return {
    name: getCurrentUserNickname(),
    avatar: "",
  };
}
