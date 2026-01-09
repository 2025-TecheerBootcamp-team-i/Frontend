import { Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/home/HomePage";
import ChartPage from "./pages/chart/ChartPage";
import MyPage from "./pages/profile/MyPage";
import AiCreatePage from "./pages/ai/AICreatePage";
import PlaylistPage from "./pages/song/PlaylistPage";

export default function App() {
  return (
    <div className="flex h-screen">

      {/* 페이지 영역 */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/ai" element={<AiCreatePage />} />
          <Route path="/playlist/:playlistId" element={<PlaylistPage />} />

          {/* 잘못된 주소 처리 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
