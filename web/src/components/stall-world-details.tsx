import type { WorldStallSummary } from "@/lib/world-card";

function roleLabel(summary: WorldStallSummary, role: string): string {
  const cast = summary.cast.find((member) => member.role === role);
  return cast?.name ?? role;
}

export function StallWorldDetails({ world }: { world: WorldStallSummary }) {
  return (
    <section className="mt-8 border-t border-foreground/10 pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {world.title}
      </h2>

      {world.places.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-foreground">Places</h3>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/80">
            {world.places.map((place) => (
              <li key={place.id}>
                <span className="font-medium text-foreground">{place.name}</span>
                {place.present.length ? (
                  <span className="text-muted-foreground">
                    {" "}
                    —{" "}
                    {place.present
                      .map((role) => roleLabel(world, role))
                      .join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {world.greeterRole ? (
        <p className="mt-5 text-sm leading-relaxed text-foreground/80">
          <span className="font-medium text-foreground">Greeter:</span>{" "}
          {world.greeterName ?? world.greeterRole}
          {world.entryPlace ? (
            <span className="text-muted-foreground">
              {" "}
              at {world.places.find((place) => place.id === world.entryPlace)?.name ?? world.entryPlace}
            </span>
          ) : null}
        </p>
      ) : null}

      {world.turnModel ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          <span className="font-medium text-foreground">Turn model:</span>{" "}
          {world.turnModel}
        </p>
      ) : null}

      {world.cast.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-foreground">Cast</h3>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/80">
            {world.cast.map((member) => (
              <li key={member.role}>
                <span className="font-medium text-foreground">{member.name}</span>
                <span className="text-muted-foreground"> ({member.role})</span>
                {member.home ? (
                  <span className="text-muted-foreground"> · home: {member.home}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
