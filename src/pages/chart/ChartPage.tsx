import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Tab = "TOP100" | "DAILY" | "AI";

function ChartPage() {
    const [searchParams] = useSearchParams();

    const initialTab = useMemo<Tab>(() => {
        const t = searchParams.get("tab");
        if (t === "DAILY" || t === "AI" || t === "TOP100") return t;
        return "TOP100";
    }, [searchParams]);

    const [tab, setTab] = useState<Tab>(initialTab);

    // ... 탭에 따라 데이터 바꿔서 렌더링
    return (
        <div>
        {/* 탭 버튼들 */}
        {/* tab state 사용 */}
        </div>
    );
}

export default ChartPage;
