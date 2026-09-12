"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export function UserSync() {
  const { isSignedIn, user } = useUser();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user) return;
    if (syncedFor.current === user.id) return;

    syncedFor.current = user.id;
    void fetch("/api/users/sync", { method: "POST" });
  }, [isSignedIn, user]);

  return null;
}
