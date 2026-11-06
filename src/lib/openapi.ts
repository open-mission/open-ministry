/**
 * OpenAPI document for the application's own API.
 *
 * Better Auth publishes its own schema separately at
 * `/api/auth/open-api/generate-schema`, and the Scalar reference combines both
 * sources. Keep this document in sync as new route handlers are added.
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "OpenMinistry API",
    version: "0.1.0",
    description:
      "API da aplicação OpenMinistry. Os endpoints de autenticação são documentados pelo Better Auth.",
  },
  servers: [
    {
      url: "/",
      description: "Host atual",
    },
  ],
  tags: [
    {
      name: "Saúde",
      description: "Verificação de disponibilidade da API.",
    },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Saúde"],
        summary: "Verifica a saúde da API",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "API disponível",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "timestamp"],
                  properties: {
                    status: {
                      type: "string",
                      example: "ok",
                    },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
