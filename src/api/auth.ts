// src/api/auth.ts
import axiosInstance from "./axiosInstance";

/** 회원가입 요청 타입 */
export type SignupRequest = {
  email: string;
  password: string;
  password_confirm: string;
  nickname: string;
};

/** 회원가입 응답 타입 */
export type SignupResponse = {
  id: number;
  email: string;
  nickname: string;
  created_at: string;
};

/** 로그인 요청 타입 */
export type LoginRequest = {
  email: string;
  password: string;
};

/** 로그인 응답 타입 */
export type LoginResponse = {
  access: string;
  refresh: string;
  user_id: number;
  email: string;
  nickname: string;
};

/** JWT 토큰 갱신 요청 타입 */
export type RefreshRequest = {
  refresh: string;
};

/** JWT 토큰 갱신 응답 타입 */
export type RefreshResponse = {
  access: string;
};

/**
 * 회원가입 API
 * POST /auth/users/
 */
export async function signup(data: SignupRequest): Promise<SignupResponse> {
  const res = await axiosInstance.post("/auth/users/", data);
  return res.data;
}

/**
 * 로그인 API
 * POST /auth/tokens/
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await axiosInstance.post("/auth/tokens/", data);
  return res.data;
}

/**
 * JWT 토큰 갱신 API
 * POST /auth/refresh/
 */
export async function refreshToken(data: RefreshRequest): Promise<RefreshResponse> {
  const res = await axiosInstance.post("/auth/refresh/", data);
  return res.data;
}

/** 프론트 로그아웃(토큰/유저정보 제거) */
const PROFILE_KEY = "profile";
// src/utils/auth.ts
export const isLoggedIn = () => !!localStorage.getItem("access_token");
export function requireLogin(
  message = "로그인 후 이용 가능합니다."
) {
  if (!isLoggedIn()) {
    alert(message);
    return false;
  }
  return true;
}

export function logoutClient() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");

  // ✅ 프로필 로컬 저장도 제거
  localStorage.removeItem(PROFILE_KEY);

  // (있으면) 다른 사용자 데이터도 같이 제거
  // localStorage.removeItem("liked_tracks");
  // localStorage.removeItem("playlists_cache");

  delete axiosInstance.defaults.headers.common.Authorization;

  // ✅ 로그아웃 이벤트 발생 (PlaylistContext가 상태를 초기화하도록)
  window.dispatchEvent(new Event("logout"));
}

