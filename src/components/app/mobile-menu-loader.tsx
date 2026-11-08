import { connection } from "next/server";

import { MobileMenu } from "@/components/app/mobile-menu";

export async function MobileMenuLoader() {
  await connection();

  return <MobileMenu />;
}
