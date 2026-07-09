"use client";

import Image from "next/image";
import type { MediaItem } from "@/lib/billing/types";

interface Props {
  media: Pick<MediaItem, "file_url" | "file_type" | "alt_text" | "title">;
  /** Wrapper div — set aspect-ratio / width / height here. Always gets `relative overflow-hidden`. */
  className?: string;
  /** Extra classes merged onto the <Image> element (object-cover is always included). */
  imgClassName?: string;
  /** Eager-load for above-fold hero images. */
  priority?: boolean;
  /** Responsive sizes hint passed to next/image. */
  sizes?: string;
  /** Show native video controls (admin preview). */
  controls?: boolean;
  /** Video autoplay — true for ambient/hero sections. */
  autoPlay?: boolean;
  /** Video preload. Defaults to "metadata" when autoPlay, "none" otherwise. */
  preload?: "none" | "metadata" | "auto";
}

export function MediaRenderer({
  media,
  className,
  imgClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  controls = false,
  autoPlay = true,
  preload,
}: Props) {
  const wrapCls = `relative overflow-hidden${className ? ` ${className}` : ""}`;
  const alt = media.alt_text || media.title || "";

  if (media.file_type === "video") {
    return (
      <div className={wrapCls}>
        <video
          src={media.file_url}
          className="h-full w-full object-cover"
          autoPlay={autoPlay}
          muted
          loop
          playsInline
          controls={controls}
          preload={preload ?? (autoPlay ? "metadata" : "none")}
        />
      </div>
    );
  }

  return (
    <div className={wrapCls}>
      <Image
        src={media.file_url}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover${imgClassName ? ` ${imgClassName}` : ""}`}
        priority={priority}
        loading={priority ? undefined : "lazy"}
      />
    </div>
  );
}
