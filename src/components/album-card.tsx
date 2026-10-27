import Link from "next/link";
import Image from "next/image";
import GlareHover from "@/components/reactbits/GlareHover";

export function AlbumCard({
  album,
  subtitle,
}: {
  album: {
    id: string;
    title: string;
    coverUrl: string | null;
    artist: { name: string };
  };
  subtitle?: string;
}) {
  return (
    <Link
      href={`/album/${album.id}`}
      className="group flex w-32 shrink-0 flex-col gap-2 sm:w-36"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border transition-[box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-black/30 group-hover:ring-accent">
        <GlareHover
          width="100%"
          height="100%"
          borderRadius="0.5rem"
          glareOpacity={0.35}
          glareSize={40}
          rimGlint={false}
          className="block! border-0!"
        >
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt={`${album.title} cover`}
              fill
              sizes="144px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              No cover
            </div>
          )}
        </GlareHover>
      </div>
      <div>
        <p className="truncate text-sm font-medium text-foreground">
          {album.title}
        </p>
        <p className="truncate text-xs text-muted">{album.artist.name}</p>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
    </Link>
  );
}
