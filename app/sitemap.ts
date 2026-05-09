import type { MetadataRoute } from "next";
import { site } from "@/lib/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const routes = [
    "",
    "/coachs",
    "/offres",
    "/reservation",
    "/contact",
    "/faq",
    "/avis",
    "/mentions-legales",
    "/confidentialite",
  ];
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
