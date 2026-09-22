import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/container";
import { teams } from "@/lib/site";

export function HomeTeams() {
  return (
    <section aria-labelledby="teams-heading" className="pb-16 sm:pb-20">
      <Container>
        <h2
          id="teams-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Teams are first-class
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Many workflows are pairs or crews. Installing a team creates a copy of
          each member — no live link to the author’s farm.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href="/catalog?kind=team"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Browse teams
          </Link>
          <span className="text-muted-foreground"> · </span>
          <Link
            href="/about#teams"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Why plant a team
          </Link>
          <span className="text-muted-foreground"> · </span>
          <Link
            href="/teams/pair-bench"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Pair Bench
          </Link>
          <span className="text-muted-foreground"> · </span>
          <Link
            href="/teams/workbench"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Workbench
          </Link>
          <span className="text-muted-foreground"> · </span>
          <Link
            href="/teams/road-crew"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Road Crew
          </Link>
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.name} className="min-w-0 gap-3 py-5">
              <CardHeader>
                <CardTitle className="clay-title text-lg font-extrabold tracking-tight">
                  {team.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                  {team.roles}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
