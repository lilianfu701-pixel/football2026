export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 animate-pulse">

      {/* Filter bar skeleton */}
      <div className="sticky top-0 z-20 bg-[#0A1628]/95 backdrop-blur border-b border-[#1E3A5F]/40 py-2 mb-4">
        <div className="flex items-center gap-2 overflow-x-hidden px-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 w-16 bg-[#1E3A5F] rounded-full shrink-0" />
          ))}
        </div>
      </div>

      {/* Group section skeleton × 3 */}
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="mb-6 px-1">
          {/* Group header */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-4 w-24 bg-[#1E3A5F] rounded" />
            <div className="flex-1 h-px bg-[#1E3A5F]/40" />
          </div>

          {/* Match cards */}
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
                <div className="px-3 py-3">
                  {/* Meta row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-32 bg-[#1E3A5F] rounded" />
                    <div className="h-5 w-20 bg-[#1E3A5F] rounded-full" />
                  </div>
                  {/* Teams row */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Home team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-6 bg-[#1E3A5F] rounded shrink-0" />
                      <div className="h-4 w-20 bg-[#1E3A5F] rounded" />
                    </div>
                    {/* Score / vs */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="h-7 w-16 bg-[#1E3A5F] rounded-xl" />
                      <div className="h-2.5 w-10 bg-[#1E3A5F] rounded" />
                    </div>
                    {/* Away team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <div className="h-4 w-20 bg-[#1E3A5F] rounded" />
                      <div className="w-8 h-6 bg-[#1E3A5F] rounded shrink-0" />
                    </div>
                  </div>
                  {/* Odds row */}
                  <div className="flex gap-2 mt-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex-1 h-10 bg-[#1E3A5F] rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}
