import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://alyswap.local";
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/swap`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pool`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/create-pair`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/tokens`, changeFrequency: "weekly", priority: 0.7 }
  ];
}
