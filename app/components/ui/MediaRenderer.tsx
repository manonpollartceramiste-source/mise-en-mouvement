"use client";

import type { MediaItem } from "@/lib/billing/types";

interface MediaRendererProps {
  media: Pick<MediaItem, "file_url" | "file_type" | "alt_text" | "title" | "caption" | "site_location">;
  className?: string;
  imgClassName?: string;
  videoClassName?: string;
  /** Controls on video — default false for ambiance loops, true for explicative content */
  controls?: boolean;
  /** Autoplay muted loop for ambiance videos — default true */
  autoPlay?: boolean;
  loading?: "lazy" | "eager";
  sizes?: string;
}

export function MediaRenderer({
  media,
  className,
  imgClassName,
  videoClassName,
  controls = false,
  autoPlay = true,
  loading = "lazy",
}: MediaRendererProps) {
  const alt = media.alt_text || media.title || "";

  if (media.file_type === "video") {
    return (
      <div className={className}>
        <video
          src={media.file_url}
          className={videoClassName ?? "h-full w-full object-cover"}
          autoPlay={autoPlay}
          muted
          loop
          playsInline
          controls={controls}
          preload={autoPlay ? "metadata" : "none"}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.file_url}
        alt={alt}
        className={imgClassName ?? "h-full w-full object-cover"}
        loading={loading}
      />
    </div>
  );
}
