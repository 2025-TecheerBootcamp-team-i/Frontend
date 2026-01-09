import { useParams } from "react-router-dom";

function PlaylistPage() {
    const { playlistId } = useParams();

    return (
        <div className="p-6">
        <h1 className="text-xl font-semibold">
            Playlist ID: {playlistId}
        </h1>
        </div>
    );
}

export default PlaylistPage;
