import { FcGoogle } from 'react-icons/fc';

function LoginPage() {
  return (
    // 배경
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-[#ffffff]
        "
    >
      {/* 가운데 박스 */}
      <div
        className="
            w-[800px] h-[450px]
            p-[70px]
            bg-[#f2f2f2]
            rounded-[50px]
            shadow-md
        "
      >
        {/* 입력 칸 */}
        <div className="mb-3">
          <input
            type="email"
            placeholder="email@example.com"
            className="
                w-[280px] h-[40px]
                px-4 py-2
                rounded-[15px]
                border
                border-[#D9D9D9]
                bg-[#ffffff]
                text-[#666666]"
          />
        </div>
        <div className="mb-8">
          <input
            type="password"
            placeholder="PW"
            className="
                w-[280px] h-[40px]
                px-4 py-2
                rounded-[15px]
                border
                border-[#D9D9D9]
                bg-[#ffffff]
                text-[#666666]"
          />
        </div>

        <button
          className="
                w-[280px] h-[40px]
                bg-[#D9D9D9]
                rounded-[15px]
                text-[#666666]
                text-sm
                hover:bg-[#6666]
                transition
            "
        >
          Login
        </button>

        <div
          className="
            w-[280px]
            mt-4
            mb-4
            text-center 
            text-[#666666]
            text-xs
            "
        >
          또는
        </div>

        <button
          className="
                block
                w-[280px] h-[40px]
                bg-[#D9D9D9]
                rounded-[15px]
                text-[#666666]
                text-sm
                hover:bg-[#6666]
                transition
                mb-3
            "
        >
          Sign up
        </button>

        <button
          className="
                w-[280px] h-[40px]
                bg-[#D9D9D9]
                flex items-center justify-center gap-2
                rounded-[15px]
                text-[#666666]
                text-sm
                hover:bg-[#6666]
                transition
            "
        >
          <FcGoogle size={18} />
          Google로 Login
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
