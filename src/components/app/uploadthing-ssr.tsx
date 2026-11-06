import { connection } from "next/server";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";

import { ourFileRouter } from "@/app/api/uploadthing/core";

export async function UploadThingSSR() {
  await connection();

  return (
    <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
  );
}
