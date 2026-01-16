import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import MainLayout2 from "./components/layout/MainLayout2";
import PlainLayout from "./components/layout/PlainLayout";

import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignupPage";

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

import ArtistPage from "./pages/artist/ArtistPage";
import ArtistTracksPage from "./pages/artist/ArtistTracksPage";
import ArtistAlbumsPage from "./pages/artist/ArtistAlbumsPage";
import AlbumPage from "./pages/album/AlbumPage";

import SearchPage from "./pages/search/SearchPage";
import SearchAll from "./pages/search/SearchAll";
import SearchArtist from "./pages/search/SearchArtist";
import SearchAlbum from "./pages/search/SearchAlbum";
import SearchSong from "./pages/search/SearchSong";

import ChartTop100 from "./pages/chart/ChartTop100";
import ChartDaily from "./pages/chart/ChartDaily";
import ChartAI from "./pages/chart/ChartAI";

import NowPlayingPage from "./pages/song/NowPlayingPage";
import { PlayerProvider } from "./player/PlayerContext";


export default function App() {
  return (
    <PlayerProvider>
     <Routes>
    {/* ✅ 첫 진입: / -> /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ✅ 사이드바가 필요한 모든 페이지 */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/chart" element={<ChartPage />}>
          <Route index element={<Navigate to="top100" replace />} />
          <Route path="top100" element={<ChartTop100 />} />
          <Route path="daily" element={<ChartDaily />} />
          <Route path="ai" element={<ChartAI />} />
        </Route>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/my-playlists" element={<MyPlaylistPage />}>
          <Route path="personal" element={<MyPlaylistPersonal />} />
          <Route path="liked" element={<MyPlaylistLiked />} />
        </Route>
        <Route path="/ai" element={<AiCreatePage />} />
        <Route path="aisong/:id" element={<AiSongPage />} />
        <Route path="/search" element={<SearchPage />}>
          <Route index element={<Navigate to="all" replace />} />
          <Route path="all" element={<SearchAll />} />
          <Route path="artist" element={<SearchArtist />} />
          <Route path="album" element={<SearchAlbum />} />
          <Route path="song" element={<SearchSong />} />
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
      
      
      {/* ✅ 사이드바 없는 구간 (로그인/회원가입 같은 것만 두는 용도) */}
      <Route element={<PlainLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/now-playing" element={<NowPlayingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PlayerProvider>
  );
}
