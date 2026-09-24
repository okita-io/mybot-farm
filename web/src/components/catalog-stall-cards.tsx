import { StallCard } from "@/components/stall-card";
import { canDownloadStall } from "@/lib/catalog";
import type { Stall } from "@/lib/packs";

export async function CatalogStallCards({
  stalls,
  userId,
}: {
  stalls: Stall[];
  userId: string | null;
}) {
  const signedIn = Boolean(userId);

  return (
    <>
      {await Promise.all(
        stalls.map(async (stall) => {
          const canDownload = await canDownloadStall(stall, userId);
          return (
            <StallCard
              key={stall.slug}
              stall={stall}
              canDownload={canDownload}
              signedIn={signedIn}
            />
          );
        }),
      )}
    </>
  );
}
