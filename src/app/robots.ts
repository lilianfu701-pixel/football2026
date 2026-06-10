import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/profile/",
          "/messages/",
          "/notifications/",
          "/*/admin/",
          "/*/profile/",
          "/*/messages/",
          "/*/notifications/",
        ],
      },
    ],
    sitemap: "https://football2026.net/sitemap.xml",
    host: "https://football2026.net",
  };
}
