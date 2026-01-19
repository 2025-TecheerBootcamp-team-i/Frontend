import axios from "axios";

const axiosInstance = axios.create({
    // 백엔드 및 서버 주소
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // 쿠키 기반 인증(세션/JWT 쿠키)을 쓴다면 true
  // 토큰을 Authorization 헤더로 쓰면 false여도 됨
  withCredentials: true,
});

// (선택) 디버깅용
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API ERROR]", err?.response?.status, err?.response?.data ?? err);
    return Promise.reject(err);
  }
);

export default axiosInstance;