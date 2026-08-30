import Link from "next/link";
import Image from "next/image";

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
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border transition-shadow group-hover:ring-accent">
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
