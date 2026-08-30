import { notFound } from "next/navigation";
import { getPersonWork } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";

export default async function PersonPage({ params }: PageProps<"/people/[name]">) {
  const { name: encodedName } = await params;
  const name = decodeURIComponent(encodedName);
  const work = await getPersonWork(name);

  if (!work.hasAnyWork) notFound();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">{name}</h1>

      {work.asPrimaryArtist.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Artist</h2>
          <div className="flex flex-wrap gap-4">
            {work.asPrimaryArtist.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {work.creditsByRole.map(({ role, albums }) => (
        <section key={role}>
          <h2 className="mb-3 text-lg font-medium">{role}</h2>
          <div className="flex flex-wrap gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
