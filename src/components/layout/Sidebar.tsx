import { MdOutlineNavigateNext } from 'react-icons/md';

function Sidebar() {
return (
    <aside
    className="
            w-[355px]
            h-full
            bg-[#f0f0f0]
            border-r 
            p-4 
            flex flex-col 
            gap-4
            "
    >
      {/* 마이페이지 */}
    <div
        className="
            w-80 h-[330px]
            bg-[#E9E9E9]
            rounded-3xl
            px-5 py-4
            "
    >
        <div
        className="
                    flex items-center justify-between"
        >
        <button
            className="
                        hover:text-[#888]
                        transition
                        font-semibold 
                        text-lg
                        text-[#666666]
                        "
        >
            마이페이지
        </button>

        <button
            className="
                        hover:text-[#888]
                        transition
                        mb-2
                        text-[#666666]"
        >
            <MdOutlineNavigateNext size={30} />
        </button>
        </div>
        {/* 선 */}
        <div className="mb-4 border-b border-zinc-300" />

        <div
        className="
                    flex 
                    gap-4"
        >
        <div className="w-24 h-24 bg-[#D9D9D9] rounded-2xl" />
        <span
            className="
                        mt-1.5
                        text-base
                        text-[#666666]
                    "
        >
            Name
        </span>
        </div>

        {/* 플레이리스트 */}
        <div>
        <button
            className="
                            mt-4
                            hover:text-[#888]
                            transition
                            font-normal
                            text-base
                            mb-2
                            text-[#666666]
                            "
        >
            나의 플레이리스트
        </button>

          {/* 선 */}
        <div className="mb-4 border-b border-zinc-300" />

        <div
            className="
                flex items-center
                gap-3
                mb-2
            "
        >
            <div
            className="
                    w-20 h-20 
                    bg-zinc-300 rounded-xl
                    "
            />
            <div
            className="
                        w-20 h-20 
                        bg-zinc-300 rounded-xl
                        "
            />
            <button
            className="
                            w-10 h-20 
                            bg-zinc-300
                            rounded-xl
                            hover:bg-zinc-400
                            transition
                            text-[#666666]"
            >
            +
            </button>
        </div>
        </div>
    </div>

    <div
        className="
            w-80 h-[100px]
            bg-[#E9E9E9]
            rounded-3xl
            px-5 py-4
            "
    ></div>

      {/* 선 */}
    <div className="border-b border-zinc-300" />

      {/* AI 음악 */}
    <div
        className="
            w-80 h-80
            bg-[#E9E9E9]
            rounded-3xl
            px-5 py-4
            "
    >
        <div
        className="
                flex items-center justify-between
                "
        >
        <button
            className="
                    hover:text-[#888]
                    transition
                    font-semibold 
                    text-lg
                    mb-2
                    text-[#666666]
                    "
        >
        AI 음악 만들기
        </button>

        <button
            className="
                    hover:text-[#888]
                    transition
                    mb-2
                    text-[#666666]"
        >
            <MdOutlineNavigateNext size={30} />
        </button>
        </div>
        <div className="mb-4 border-b border-zinc-300" />
    </div>
    </aside>
);
}

export default Sidebar;
