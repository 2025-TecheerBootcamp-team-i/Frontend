export default function ServiceClosed() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#1d1d1d]">
      <section className="w-full max-w-xl rounded-[40px] bg-white/[0.05] backdrop-blur-2xl border border-white/10 overflow-hidden">
        <div className="px-8 py-10 text-center">
          <h1 className="text-4xl font-bold text-[#f6f6f6] tracking-tight">
            MuniVerse
          </h1>

          <div className="mt-6 text-lg text-[#f6f6f6]/80">
            서비스 운영이 종료되었습니다
          </div>

          <p className="mt-3 text-sm text-[#f6f6f6]/40 leading-relaxed">
            해당 프로젝트는 현재 운영되지 않으며 <br />
            포트폴리오 목적으로만 유지되고 있습니다.
          </p>

          <div className="mt-8 flex justify-center">
            <a
              href="https://github.com/2025-TecheerBootcamp-team-i"
              target="_blank"
              rel="noopener noreferrer"
              className="
                px-6 py-3
                rounded-2xl
                border border-white/10
                text-base font-semibold
                text-[#f6f6f6]/80
                transition-all
                hover:bg-white/10
                hover:text-[#AFDEE2]
                hover:border-[#AFDEE2]/40
              "
            >
              GitHub Repository
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
