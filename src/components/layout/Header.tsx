import { TiHome } from 'react-icons/ti';
import { IoSearch } from 'react-icons/io5';

function Header() {
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
            flex 
            items-center 
            bg-[#d9d9d9] 
            rounded-full 
            px-4 py-3
            w-96"
      >
        <span className="text-[#666666] mr-2">
          <IoSearch size={25} />
        </span>
        <input
          className="
                bg-transparent 
                outline-none 
                text-sm 
                w-full"
          placeholder="검색"
        />
      </div>
    </header>
  );
}

export default Header;
