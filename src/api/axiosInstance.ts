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

// ✅ 요청 인터셉터: 토큰을 헤더에 자동 추가
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ 응답 인터셉터: 401 에러 시 토큰 갱신 시도
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    
    // 401 에러이고, 재시도하지 않은 요청인 경우
    if (err?.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          // 토큰 갱신 시도
          const response = await axiosInstance.post("/auth/refresh/", {
            refresh: refreshToken,
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem("access_token", newAccessToken);
          
          // 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // 토큰 갱신 실패 시 로그아웃 처리
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }
    
    console.error("[API ERROR]", err?.response?.status, err?.response?.data ?? err);
    return Promise.reject(err);
  }
);

export default axiosInstance;