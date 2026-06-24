export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-5 md:px-6 md:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="h-10 w-28 rounded-full bg-white/70" />
        <div className="h-9 w-20 rounded-full bg-white/70" />
      </div>

      <section className="editorial-card editorial-card-strong relative overflow-hidden rounded-[36px] px-6 py-8 md:px-10 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <div className="h-3 w-20 rounded-full bg-[#dce5ee]" />
            <div className="mt-4 h-12 w-48 rounded-2xl bg-[#dfe7ef]" />
            <div className="mt-5 h-4 max-w-xl rounded-full bg-[#e8edf2]" />
            <div className="mt-3 h-4 max-w-lg rounded-full bg-[#e8edf2]" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="editorial-panel rounded-[24px] p-5"
                >
                  <div className="h-9 w-9 rounded-full bg-[#eef2f6]" />
                  <div className="mt-4 h-4 rounded-full bg-[#e8edf2]" />
                  <div className="mt-3 h-4 w-3/4 rounded-full bg-[#e8edf2]" />
                </div>
              ))}
            </div>
          </div>

          <aside className="editorial-card rounded-[32px] bg-white p-6">
            <div className="h-36 rounded-[28px] bg-[linear-gradient(135deg,#fff7ec,#fbe6d1)]" />
            <div className="mt-5 space-y-3">
              <div className="h-4 rounded-full bg-[#e8edf2]" />
              <div className="h-4 rounded-full bg-[#e8edf2]" />
              <div className="h-4 rounded-full bg-[#e8edf2]" />
            </div>
            <div className="mt-5 h-12 rounded-full bg-[#233044]/20" />
          </aside>
        </div>
      </section>
    </main>
  );
}
