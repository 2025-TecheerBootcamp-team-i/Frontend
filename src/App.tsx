import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import MainLayout2 from "./components/layout/MainLayout2";
import PlainLayout from "./components/layout/PlainLayout";
import Nolayout from "./components/layout/Nolayout";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignupPage"));
import RequireAuth from "./pages/auth/RequireAuth";

import HomePage from "./pages/home/HomePage";
import ChartPage from "./pages/chart/ChartPage";
import MyPage from "./pages/profile/MyPage";

import AiCreatePage from "./pages/ai/AICreatePage";
import AiSongPage from "./pages/ai/AISongPage";

import PlaylistPage from "./pages/album/PlaylistPage";
import MyPlaylistPage from "./pages/profile/MyPlaylistPage";
import MyPlaylistPersonal from "./pages/profile/MyPlaylistPersonal";
import MyPlaylistLiked from "./pages/profile/MyPlaylistLiked";
import PlaylistEdit from "./pages/album/PlaylistEdit";
import MyAITracks from "./pages/profile/MyAITracks";


import ArtistPage from "./pages/artist/ArtistPage";
import ArtistTracksPage from "./pages/artist/ArtistTracksPage";
import ArtistAlbumsPage from "./pages/artist/ArtistAlbumsPage";
import AlbumPage from "./pages/album/AlbumPage";

import SearchPage from "./pages/search/SearchPage";
import SearchAll from "./pages/search/SearchAll";
import SearchArtist from "./pages/search/SearchArtist";
import SearchAlbum from "./pages/search/SearchAlbum";
import SearchSong from "./pages/search/SearchSong";
import SearchPlaylist from "./pages/search/SearchPlaylist.tsx";

import ChartTop100 from "./pages/chart/ChartTop100";
import ChartDaily from "./pages/chart/ChartDaily";
import ChartAI from "./pages/chart/ChartAI";

import NowPlayingPage from "./pages/song/NowPlayingPage";
import { PlayerProvider } from "./player/PlayerContext";

const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

function AuthFallback() {
  return (
    <div className="min-h-[100dvh] w-full grid place-items-center bg-[#2d2d2d]">
      <div className="text-sm text-white/60">Loading...</div>
    </div>
  );
}

// 검색 페이지 쿼리 파라미터 유지하면서 리다이렉트
function SearchRedirect() {
  const location = useLocation();
  const search = location.search || "";
  return <Navigate to={`all${search}`} replace />;
}

export default function App() {
  return (
    <PlayerProvider>
      <Routes>

      {/* ✅ 사이드바가 필요한 모든 페이지 */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/chart" element={<ChartPage />}>
          <Route index element={<Navigate to="top100" replace />} />
          <Route path="top100" element={<ChartTop100 />} />
          <Route path="daily" element={<ChartDaily />} />
          <Route path="ai" element={<ChartAI />} />
        </Route>
        <Route path="/mypage" element={<RequireAuth><MyPage /></RequireAuth>} />
        <Route path="/my-playlists" element={<RequireAuth><MyPlaylistPage /></RequireAuth>}>
          <Route path="personal" element={<MyPlaylistPersonal />} />
          <Route path="liked" element={<MyPlaylistLiked />} />
        </Route>
        <Route path="/ai/create" element={<RequireAuth><AiCreatePage /></RequireAuth>} />
        <Route path="/ai" element={<Navigate to="/ai/create" replace />} />
        <Route path="/aisong/:id" element={<RequireAuth><AiSongPage /></RequireAuth>} />
        <Route path="/my/ai-songs" element={<RequireAuth><MyAITracks /></RequireAuth>} />
        <Route path="/search" element={<SearchPage />}>
          <Route index element={<SearchRedirect />} />
          <Route path="all" element={<SearchAll />} />
          <Route path="artist" element={<SearchArtist />} />
          <Route path="album" element={<SearchAlbum />} />
          <Route path="song" element={<SearchSong />} />
          <Route path="playlist" element={<SearchPlaylist />} />
        </Route>
      </Route>

      {/* ✅ 메인 레이아웃에 패딩이 없는 버전 */}
      <Route element={<MainLayout2 />}>
        <Route path="/artists/:artistId" element={<ArtistPage />} />
        <Route path="/artists/:artistId/tracks" element={<ArtistTracksPage />} />
        <Route path="/artists/:artistId/albums" element={<ArtistAlbumsPage />} />
        <Route path="/album/:albumId" element={<AlbumPage />} />
        <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
        <Route path="/playlist/:playlistId/edit" element={<PlaylistEdit />} />
      </Route>
      
      
      {/* ✅ 사이드바 없는 구간 (곡 상세보기 용도) */}
      <Route element={<PlainLayout />}>
        <Route path="/now-playing" element={<NowPlayingPage />} />
      </Route>

      {/* ✅ 사이드바, 헤더, 플레이바 없는 구간 (로그인/회원가입 용도) */}
      <Route element={<Nolayout />}>
      <Route
            index
            element={
              <Suspense fallback={<AuthFallback />}>
                <OnboardingPage />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<AuthFallback />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<AuthFallback />}>
                <SignUpPage />
              </Suspense>
            }
          />
          <Route
            path="/onboarding"
            element={
              <Suspense fallback={<AuthFallback />}>
                <OnboardingPage />
              </Suspense>
            }
          />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PlayerProvider>
  );
}
