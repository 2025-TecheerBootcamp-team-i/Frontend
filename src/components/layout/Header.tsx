import { useNavigate } from "react-router-dom";

import { TiHome } from 'react-icons/ti';
import { IoSearch } from 'react-icons/io5';



function Header() {
  const navigate = useNavigate();

  return (
    <header
      className="
        h-20 
        bg-[#f0f0f0] 
        border-b 
        flex items-center 
        px-6 gap-4
        "
    >
      {/* 홈 아이콘 */}
      <div
        className="
            w-[50px] h-[50px]
            bg-[#d9d9d9] 
            rounded-full"
      />

      <button
        type="button"
        onClick={() => navigate("/HomePage")}
        aria-label="홈으로 이동"
        title="홈"
        className="
            w-[50px] h-[50px] 
            bg-[#d9d9d9] 
            rounded-full
            hover:bg-[#6666]
            transition
            flex items-center justify-center
            text-[#666666]
            "
      >
        <TiHome size={25} />
      </button>

      {/* 검색바 */}
      <div
        className="
        w-[400px] h-[50px] 
            flex 
            items-center
            bg-[#d9d9d9] 
            rounded-full 
            px-4 py-3"
      >

        <button
        onClick={() => navigate("/search")}
        className="
        hover:text-[#888]
        transition
        text-[#666666]">
          <IoSearch size={25} className="translate-x-[-2px]" />
        </button>
        <input
          className="
                bg-transparent
                outline-none 
                text-sm 
                w-full
                indent-[2px]"
          placeholder="어떤 노래나 가수를 찾으시나요?"
        />
      </div>

    </header>
  );
}


export default Header;
