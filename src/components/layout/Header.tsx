import { useNavigate } from "react-router-dom";

import { TiHome } from 'react-icons/ti';
import { IoSearch } from 'react-icons/io5';



function Header() {
  const navigate = useNavigate();

  return (
    <header
      className="
        h-20 
        bg-[#2D2D2D] 
        border-b 
        border-[#3d3d3d]
        flex items-center 
        px-6 gap-4
        "
    >
      {/* 홈 아이콘 */}
      <div
        className="
            w-[50px] h-[50px]
            bg-[#3d3d3d] 
            rounded-full"
      />

      <button
        type="button"
        onClick={() => navigate("/HomePage")}
        aria-label="홈으로 이동"
        title="홈"
        className="
            w-[50px] h-[50px] 
            bg-[#3d3d3d] 
            rounded-full
            hover:bg-[#4d4d4d]
            transition
            flex items-center justify-center
            text-[#AFDEE2]
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
            bg-[#3d3d3d] 
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
                indent-[4px]
                text-[#e0e0e0]
                placeholder:text-[#8a8a8a]"
          placeholder="노래 또는 아티스트를 검색하세요"
        />
      </div>

    </header>
  );
}


export default Header;
