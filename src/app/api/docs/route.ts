import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  pageTitle: "OpenMinistry API",
  theme: "default",
  sources: [
    {
      url: "/api/openapi",
      title: "OpenMinistry API",
    },
    {
      url: "/api/auth/open-api/generate-schema",
      title: "Autenticação (Better Auth)",
    },
  ],
});
