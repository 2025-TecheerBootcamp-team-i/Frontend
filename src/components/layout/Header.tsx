import { useNavigate } from "react-router-dom";
import { useState } from "react"; 

import { TiHome } from 'react-icons/ti';
import { IoSearch } from 'react-icons/io5';
import { FaMusic } from "react-icons/fa6";



function Header() {
  const navigate = useNavigate();

 const [query, setQuery] = useState("");

 const goSearch = () => {
    const q = query.trim();
    if (!q) {
      return;
    }
  
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };




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
      

      
      <div
        className="
            w-[50px] h-[50px]
            flex items-center justify-center

            bg-gradient-to-tr
            from-[#3d3d3d]
            to-[#2d2d2d]

            shadow-[0_4px_12px_rgba(0,0,0,0.25)]
            text-[#AFDEE2]
            rounded-full"
      ><FaMusic size={18}/></div>
      
      {/* 홈 아이콘 */}
      <button
        type="button"
        onClick={() => navigate("/home")}
        className="
          w-[50px] h-[50px]
          rounded-full
          flex items-center justify-center

          bg-gradient-to-tr
          from-[#3d3d3d]
          to-[#2d2d2d]

          transition
          hover:from-[#4d4d4d]
          hover:to-[#3a3a3a]

          text-[#AFDEE2]
          shadow-[0_4px_12px_rgba(0,0,0,0.25)]
        "
      >
        <TiHome size={25} />
      </button>

      {/* ✅ form으로 감싸면 Enter 키 입력이 "submit"으로 동작함 */}
      {/* 검색바 */}
      <form
        onSubmit={(e) => {
          e.preventDefault(); // ✅ 새로고침 방지 (SPA 기본)
          goSearch();         // ✅ Enter로 검색 실행
        }}
        className="
        w-[400px] h-[50px] 
            flex 
            items-center
            bg-gradient-to-tr
            from-[#3d3d3d]
            to-[#2d2d2d]
            shadow-[0_4px_12px_rgba(0,0,0,0.25)]
            rounded-full 
            px-4 py-3"
      >
        <button
        type="submit" // ✅ 클릭하면 submit 발생 → goSearch 실행
        className="
        hover:text-[#888]
        transition
        text-[#666666]
        translate-x-[-2px]"
        aria-label="검색"
        title="검색"
        >
          <IoSearch size={25}/>
        </button>
        
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)} // ✅ 입력값 상태 업데이트
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
      </form>
    </header>
  );
}

export default Header;
