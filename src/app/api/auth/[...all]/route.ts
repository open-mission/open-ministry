import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

const handler = toNextJsHandler(auth);

function isAdminApiRequest(request: Request) {
  return new URL(request.url).pathname.startsWith("/api/auth/admin");
}

export async function GET(request: Request) {
  if (isAdminApiRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  return handler.GET(request);
}

export async function POST(request: Request) {
  if (isAdminApiRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  return handler.POST(request);
}
