import Header from "../../components/layout/Header";
import Sidebar from "../../components/layout/Sidebar";

export default function ChartPage() {
    return (
        <div className="h-screen bg-white">
        <Header />
        <div className="flex h-[calc(100vh-80px)]">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">
            <h1 className="text-2xl font-semibold text-[#666666]">전체 차트</h1>
            <p className="mt-2 text-[#888888]">여기에 TOP 100 테이블 넣으면 됨</p>
            </main>
        </div>
        </div>
    );
}
