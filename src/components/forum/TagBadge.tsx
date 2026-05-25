import Link from "next/link";

interface Tag {
  id:       number;
  name:     string;
  name_zh?: string | null;
  color:    string;
}

interface Props {
  tags:    Tag[];
  locale:  string;
  zh:      boolean;
  linkable?: boolean;
}

export default function TagBadge({ tags, locale, zh, linkable = true }: Props) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((tag) => {
        const label = zh ? (tag.name_zh ?? tag.name) : tag.name;
        const style = { color: tag.color, borderColor: tag.color + "40", backgroundColor: tag.color + "15" };
        if (linkable) {
          return (
            <Link key={tag.id}
              href={`/${locale}/forum/tag/${encodeURIComponent(tag.name)}`}
              style={style}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-opacity hover:opacity-80">
              # {label}
            </Link>
          );
        }
        return (
          <span key={tag.id} style={style}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border">
            # {label}
          </span>
        );
      })}
    </div>
  );
}
