import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import PlainLayout from "./components/layout/PlainLayout";

import HomePage from "./pages/home/HomePage";
import ChartPage from "./pages/chart/ChartPage";
import MyPage from "./pages/profile/MyPage";
import AiCreatePage from "./pages/ai/AICreatePage";
import PlaylistPage from "./pages/song/PlaylistPage";
import MyPlaylistPage from "./pages/profile/MyPlaylistPage";
import SearchPage from "./pages/search/SearchPage";


export default function App() {
  return (
    <Routes>
      {/* ✅ 사이드바가 필요한 모든 페이지 */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/ai" element={<AiCreatePage />} />
        <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
        <Route path="/my-playlists" element={<MyPlaylistPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>

      {/* ✅ 사이드바 없는 구간 (로그인/회원가입 같은 것만 두는 용도) */}
      <Route element={<PlainLayout />}>
        {/* 예: <Route path="/login" element={<LoginPage />} /> */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
