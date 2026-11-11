import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";

async function SessionRedirect(): Promise<null> {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  redirect("/login");
  return null;
}

export default function AppRootPage() {
  return (
    <Suspense fallback={null}>
      <SessionRedirect />
    </Suspense>
  );
}
