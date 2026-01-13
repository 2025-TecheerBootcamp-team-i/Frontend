import { useNavigate } from "react-router-dom";
import { useState } from "react"; 

import { TiHome } from 'react-icons/ti';
import { IoSearch } from 'react-icons/io5';



function Header() {
  const navigate = useNavigate();

 const [query, setQuery] = useState("");

 const goSearch = () => {
    const q = query.trim();
    if (!q) {
      navigate("/search");
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
            bg-[#3d3d3d] 
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
