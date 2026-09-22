import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StallActions, StallMembers } from "@/components/stall-actions";
import { StallEngagement } from "@/components/stall-engagement";
import { StallDates, StallHeaderMeta, StallPackStats } from "@/components/stall-meta";
import { StallSlugMeta } from "@/components/stall-slug-meta";
import { catalogStallCardStats } from "@/lib/catalog";
import { getStallEngagement } from "@/lib/engagement";
import { hasUserFlaggedStall } from "@/lib/moderation";
import { stallPagePath, stallToneClasses, type Stall } from "@/lib/packs";
import { isAdminEmail } from "@/lib/admin";
import { getCachedViewer } from "@/lib/users";
import { cn } from "@/lib/utils";

export async function StallCard({
  stall,
  canDownload,
  signedIn,
}: {
  stall: Stall;
  canDownload: boolean;
  signedIn: boolean;
}) {
  const tone = stallToneClasses[stall.tone];
  const href = stallPagePath(stall);
  const viewer = await getCachedViewer();
  const [stats, engagement, flagged] = await Promise.all([
    catalogStallCardStats(stall.slug),
    getStallEngagement(stall.slug, viewer?.id),
    viewer ? hasUserFlaggedStall(stall.slug, viewer.id) : Promise.resolve(false),
  ]);
  const isOwner = Boolean(viewer && stall.sellerUserId === viewer.id);
  const isAdmin = isAdminEmail(viewer?.email);

  return (
    <Card className={cn("min-w-0 gap-4 py-6", tone.card)}>
      <CardHeader className="gap-3">
        <StallHeaderMeta
          kind={stall.kind}
          category={stall.category}
          categoryClassName={tone.label}
          runtimes={stats?.runtimes ?? []}
          author={stall.author}
          priceCents={stall.priceCents ?? 0}
        />
        <CardTitle className="clay-title text-2xl font-extrabold tracking-tight">
          <Link href={href} className="underline-offset-4 hover:underline">
            {stall.name}
          </Link>
        </CardTitle>
        <StallSlugMeta
          slug={stall.slug}
          packVersion={stall.packVersion}
          stallId={stall.stallId ?? stall.listingId}
        />
        <StallMembers stall={stall} canDownload={canDownload} className="flex flex-wrap gap-2" />
        <CardDescription className="text-sm text-foreground/70">
          {stall.title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base leading-relaxed text-pretty text-foreground/80">
          {stall.description}
        </p>
        {stats ? (
          <StallPackStats
            skillCount={stats.skillCount}
            memoryLineCount={stats.memoryLineCount}
            soulLine={stats.soulLine}
          />
        ) : null}
        <StallDates listedAt={stall.listedAt} updatedAt={stall.updatedAt} />
        <StallEngagement
          slug={stall.slug}
          downloadCount={engagement.downloadCount}
          likeCount={engagement.likeCount}
          liked={engagement.liked}
          signedIn={signedIn}
          flagged={flagged}
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t-0 bg-transparent">
        {isOwner ? (
          <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
            <Link href={`/sell?edit=${encodeURIComponent(stall.slug)}`}>
              <Pencil data-icon="inline-start" />
              Update
            </Link>
          </Button>
        ) : null}
        {isAdmin ? (
          <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
            <Link href="/admin">Review reports</Link>
          </Button>
        ) : null}
        <StallActions
          stall={stall}
          canDownload={canDownload}
          signedIn={signedIn}
        />
      </CardFooter>
    </Card>
  );
}
