"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function HeaderAuth() {
  return (
    <div className="flex h-7 min-w-16 items-center justify-end">
      <Show when="signed-out">
        <SignInButton>
          <Button type="button" variant="outline" size="sm">
            Sign in
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-7",
            },
          }}
        />
      </Show>
    </div>
  );
}
