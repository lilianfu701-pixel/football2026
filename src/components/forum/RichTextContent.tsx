/**
 * RichTextContent — safely renders forum post/reply HTML.
 * sanitize-html runs on the SERVER (this is a server component).
 * Only allows a safe whitelist of tags/attrs. YouTube iframes allowed
 * only from youtube.com/youtube-nocookie.com.
 */
import sanitizeHtml from "sanitize-html";

interface Props {
  html: string;
  className?: string;
}

const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "h2", "h3", "h4",
  "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "iframe",
  "video", "source",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  "*":       ["style", "class"],
  "a":       ["href", "target", "rel"],
  "img":     ["src", "alt", "width", "height", "loading"],
  "iframe":  ["src", "width", "height", "allowfullscreen", "allow", "frameborder", "title"],
  "video":   ["src", "controls", "preload", "width", "height", "playsinline", "muted"],
  "source":  ["src", "type"],
};

// Only allow style properties that are safe
const ALLOWED_STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    "font-size":       [/^\d+(\.\d+)?(px|rem|em|%)$/],
    "color":           [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
    "text-align":      [/^(left|center|right|justify)$/],
    "font-weight":     [/^(bold|normal|\d{3})$/],
    "text-decoration": [/^(underline|line-through|none)$/],
    "font-style":      [/^(italic|normal)$/],
    "width":           [/^(100%|\d+px)$/],
    "max-width":       [/^\d+(px|%)$/],
    "border-radius":   [/^\d+(px|%)$/],
    "margin":          [/^\d+px( \d+px){0,3}$/],
  },
};

function sanitize(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedStyles: ALLOWED_STYLES,
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
    // Strip scripts, on* attributes, etc.
    allowedSchemes: ["http", "https", "mailto"],
    allowVulnerableTags: false,
    // Images: only allow https URLs
    transformTags: {
      img: (tagName, attribs) => {
        const src = attribs.src ?? "";
        if (!src.startsWith("https://")) return { tagName: "span", attribs: {} };
        return { tagName, attribs: { ...attribs, loading: "lazy" } };
      },
      video: (tagName, attribs) => {
        const src = attribs.src ?? "";
        // Only allow videos from our video server
        if (src && !src.startsWith("https://v.xunni.org/") && !src.startsWith("https://v.football2026.net/")) {
          return { tagName: "span", attribs: {} };
        }
        return { tagName, attribs: { ...attribs, controls: "", preload: "metadata", playsinline: "" } };
      },
      source: (tagName, attribs) => {
        const src = attribs.src ?? "";
        if (src && !src.startsWith("https://v.xunni.org/") && !src.startsWith("https://v.football2026.net/")) {
          return { tagName: "span", attribs: {} };
        }
        return { tagName, attribs };
      },
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}

export default function RichTextContent({ html, className }: Props) {
  // Detect if content is plain text (pre-editor posts) or HTML
  const isHtml = html.trimStart().startsWith("<");

  if (!isHtml) {
    // Plain text fallback — render as preformatted text
    return (
      <div className={className}>
        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{html}</p>
      </div>
    );
  }

  const clean = sanitize(html);

  return (
    <div
      className={`rich-content ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
