"use client";

import { useEffect, useState } from "react";

interface Tag { id: number; name: string; name_zh: string | null; color: string }

interface Props {
  selected:   number[];
  onChange:   (ids: number[]) => void;
  zh:         boolean;
  maxTags?:   number;
}

export default function TagSelector({ selected, onChange, zh, maxTags = 3 }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetch("/api/forum/tags").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setTags(data);
    }).catch(() => null);
  }, []);

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else if (selected.length < maxTags) {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2">
        {zh ? `话题标签（最多${maxTags}个）` : `Tags (max ${maxTags})`}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const active = selected.includes(tag.id);
          const label  = zh ? (tag.name_zh ?? tag.name) : tag.name;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              style={active ? { color: tag.color, borderColor: tag.color + "60", backgroundColor: tag.color + "20" } : undefined}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                active
                  ? ""
                  : "border-[#1E3A5F] text-gray-500 hover:text-white hover:border-[#2A4A7F]"
              } ${!active && selected.length >= maxTags ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
            >
              # {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
