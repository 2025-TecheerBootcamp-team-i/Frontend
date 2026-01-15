import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import PlainLayout from "./components/layout/PlainLayout";

import HomePage from "./pages/home/HomePage";
import ChartPage from "./pages/chart/ChartPage";
import MyPage from "./pages/profile/MyPage";

import AiCreatePage from "./pages/ai/AICreatePage";
import AiSongPage from "./pages/ai/AISongPage";

import PlaylistPage from "./pages/album/PlaylistPage";
import MyPlaylistPage from "./pages/profile/MyPlaylistPage";

import SearchPage from "./pages/search/SearchPage";
import SearchAll from "./pages/search/SearchAll";
import SearchArtist from "./pages/search/SearchArtist";
import SearchAlbum from "./pages/search/SearchAlbum";
import SearchSong from "./pages/search/SearchSong";


import ChartTop100 from "./pages/chart/ChartTop100";
import ChartDaily from "./pages/chart/ChartDaily";
import ChartAI from "./pages/chart/ChartAI";

import NowPlayingPage from "./pages/song/NowPlayingPage";

export default function App() {
  return (
    <Routes>
      {/* ✅ 사이드바가 필요한 모든 페이지 */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/chart" element={<ChartPage />}>
          <Route index element={<Navigate to="top100" replace />} />
          <Route path="top100" element={<ChartTop100 />} />
          <Route path="daily" element={<ChartDaily />} />
          <Route path="ai" element={<ChartAI />} />
        </Route>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
        <Route path="/my-playlists" element={<MyPlaylistPage />} />  
          <Route path="/ai" element={<AiCreatePage />} />
          <Route path="/aisong/:id" element={<AiSongPage />} />
        <Route path="/search" element={<SearchPage />}>
          <Route index element={<SearchAll />} />
          <Route path="artist" element={<SearchArtist />} />
          <Route path="album" element={<SearchAlbum />} />
          <Route path="song" element={<SearchSong />} />
      </Route>
      </Route>
      
      
      {/* ✅ 사이드바 없는 구간 (로그인/회원가입 같은 것만 두는 용도) */}
      <Route element={<PlainLayout />}>
        <Route path="/now-playing" element={<NowPlayingPage />} />
        {/* 예: <Route path="/login" element={<LoginPage />} /> */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
