import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function PlainLayout() {
    return (
        <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto w-full max-w-[1400px] px-6 py-6">
            <Outlet />
        </main>
        </div>
    );
}
