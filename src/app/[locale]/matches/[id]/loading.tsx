export default function MatchDetailLoading() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-6 px-1 animate-pulse">

      {/* Back + stage pill row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-12 bg-[#1E3A5F] rounded" />
        <div className="w-px h-4 bg-[#1E3A5F]" />
        <div className="flex gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-6 h-6 bg-[#1E3A5F] rounded-md" />
          ))}
        </div>
      </div>

      {/* Sibling match strip */}
      <div className="flex items-center gap-3 mb-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-14 bg-[#1E3A5F] rounded-full shrink-0" />
        ))}
      </div>

      {/* Match hero card */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">
        <div className="h-0.5 bg-[#1E3A5F]" />
        <div className="px-5 py-4">
          {/* Team row */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-11 bg-[#1E3A5F] rounded" />
              <div className="h-4 w-20 bg-[#1E3A5F] rounded" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-20 bg-[#1E3A5F] rounded-xl" />
              <div className="h-3 w-14 bg-[#1E3A5F] rounded" />
            </div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-11 bg-[#1E3A5F] rounded" />
              <div className="h-4 w-20 bg-[#1E3A5F] rounded" />
            </div>
          </div>
          {/* Fan vote row */}
          <div className="flex justify-center gap-3 mt-2 mb-4">
            <div className="h-8 w-20 bg-[#1E3A5F] rounded-xl" />
            <div className="h-8 w-16 bg-[#1E3A5F] rounded-xl" />
            <div className="h-8 w-20 bg-[#1E3A5F] rounded-xl" />
          </div>
          {/* Action bar */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#1E3A5F]">
            <div className="h-8 w-28 bg-[#1E3A5F] rounded-lg" />
            <div className="h-8 w-24 bg-[#1E3A5F] rounded-lg" />
          </div>
        </div>
      </div>

      {/* H2H card */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">
        <div className="grid grid-cols-[2fr_3fr_3fr] gap-x-2 items-center px-4 py-2 border-b border-[#1E3A5F]">
          <div className="h-4 w-20 bg-[#1E3A5F] rounded" />
          <div className="h-4 w-full bg-[#1E3A5F] rounded mx-auto" />
          <div className="h-4 w-full bg-[#1E3A5F] rounded mx-auto" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2fr_3fr_3fr] gap-x-2 px-4 py-2 border-b border-[#1E3A5F]/30">
            <div className="h-3 w-16 bg-[#1E3A5F] rounded" />
            <div className="h-5 w-6 bg-[#1E3A5F] rounded mx-auto" />
            <div className="h-5 w-6 bg-[#1E3A5F] rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* AI predictions card */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 mb-4">
        <div className="h-4 w-32 bg-[#1E3A5F] rounded mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#1E3A5F] rounded-xl" />
          ))}
        </div>
      </div>

      {/* Prediction panel */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-4">
        <div className="h-4 w-24 bg-[#1E3A5F] rounded mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#1E3A5F] rounded-xl" />
          ))}
        </div>
        <div className="h-10 w-full bg-[#1E3A5F] rounded-xl" />
      </div>

    </div>
  );
}
