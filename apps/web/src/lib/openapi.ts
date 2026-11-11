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
    version: "0.9.9",
    description:
      "API REST da plataforma OpenMinistry para gestão ministerial de igrejas, repertório de músicas, cultos, escalas, voluntários e integrações WhatsApp.",
  },
  servers: [
    {
      url: "/",
      description: "Host atual",
    },
  ],
  tags: [
    {
      name: "Músicas",
      description: "Gestão do repertório musical, cifras, transposição de tons e coleções.",
    },
    {
      name: "Cultos e Eventos",
      description: "Planejamento litúrgico, cronogramas de culto e exportação de PDF.",
    },
    {
      name: "Membros e Pessoas",
      description: "Cadastro, perfil e listagem de voluntários e membros da igreja.",
    },
    {
      name: "Departamentos",
      description: "Ministérios e áreas de atuação ministerial da organização.",
    },
    {
      name: "WhatsApp",
      description: "Fila de mensagens, confirmações de entrega e leitura via Evolution API.",
    },
    {
      name: "Notificações",
      description: "Avisos e notificações em tempo real para equipes e liderança.",
    },
    {
      name: "Modo Offline",
      description: "Sincronização de pacotes de dados para operação sem conectividade.",
    },
    {
      name: "Saúde",
      description: "Verificação de disponibilidade e integridade dos serviços.",
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
    "/api/songs": {
      get: {
        tags: ["Músicas"],
        summary: "Lista as músicas do repertório da igreja",
        operationId: "listSongs",
        parameters: [
          {
            name: "search",
            in: "query",
            description: "Termo de busca por título, artista ou tags",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Lista de músicas e coleções retornada com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["songs", "collections"],
                  properties: {
                    songs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Song" },
                    },
                    collections: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SongCollection" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Músicas"],
        summary: "Cadastra uma nova música no repertório",
        operationId: "createSong",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SongInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Música cadastrada com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["song"],
                  properties: {
                    song: { $ref: "#/components/schemas/Song" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/songs/{songId}": {
      get: {
        tags: ["Músicas"],
        summary: "Obtém os detalhes e a cifra de uma música",
        operationId: "getSongById",
        parameters: [
          {
            name: "songId",
            in: "path",
            required: true,
            description: "Identificador único da música",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Detalhes da música retornados com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["song"],
                  properties: {
                    song: { $ref: "#/components/schemas/Song" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Músicas"],
        summary: "Atualiza os metadados ou a cifra de uma música",
        operationId: "updateSong",
        parameters: [
          {
            name: "songId",
            in: "path",
            required: true,
            description: "Identificador único da música",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SongInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Música atualizada com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["song"],
                  properties: {
                    song: { $ref: "#/components/schemas/Song" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Músicas"],
        summary: "Remove uma música do repertório",
        operationId: "deleteSong",
        parameters: [
          {
            name: "songId",
            in: "path",
            required: true,
            description: "Identificador único da música",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Música excluída com sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ok"],
                  properties: {
                    ok: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/events": {
      get: {
        tags: ["Cultos e Eventos"],
        summary: "Lista os cultos e eventos da igreja",
        operationId: "listEvents",
        responses: {
          "200": {
            description: "Eventos divididos em futuros e passados",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["events", "upcoming", "past"],
                  properties: {
                    events: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Event" },
                    },
                    upcoming: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Event" },
                    },
                    past: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Event" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/events/{eventId}/plan/pdf": {
      get: {
        tags: ["Cultos e Eventos"],
        summary: "Exporta o cronograma litúrgico em PDF",
        operationId: "getEventPlanPdf",
        parameters: [
          {
            name: "eventId",
            in: "path",
            required: true,
            description: "Identificador único do evento",
            schema: { type: "string" },
          },
          {
            name: "token",
            in: "query",
            required: false,
            description: "Token de compartilhamento público (caso acesse sem sessão)",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Documento PDF do cronograma gerado",
            content: {
              "application/pdf": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/people": {
      get: {
        tags: ["Membros e Pessoas"],
        summary: "Lista as pessoas e voluntários da igreja",
        operationId: "listPeople",
        responses: {
          "200": {
            description: "Pessoas cadastradas na igreja ativa",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["people"],
                  properties: {
                    people: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Person" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/departments": {
      get: {
        tags: ["Departamentos"],
        summary: "Lista os departamentos e ministérios da igreja",
        operationId: "listDepartments",
        responses: {
          "200": {
            description: "Departamentos cadastrados na igreja ativa",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["departments"],
                  properties: {
                    departments: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Department" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/whatsapp/logs": {
      get: {
        tags: ["WhatsApp"],
        summary: "Lista o histórico de mensagens disparadas via WhatsApp",
        operationId: "listWhatsAppLogs",
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            description: "Filtro por status (all, pending, sending, sent, delivered, read, failed)",
            schema: { type: "string", default: "all" },
          },
          {
            name: "search",
            in: "query",
            required: false,
            description: "Busca por nome, telefone ou texto da mensagem",
            schema: { type: "string" },
          },
          {
            name: "type",
            in: "query",
            required: false,
            description: "Filtro por tipo de mensagem (announcement, assignment, welcome, etc.)",
            schema: { type: "string", default: "all" },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Quantidade máxima de registros retornados (padrão 50)",
            schema: { type: "integer", default: 50 },
          },
          {
            name: "offset",
            in: "query",
            required: false,
            description: "Deslocamento para paginação",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Histórico de mensagens e contagem total",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["logs", "total"],
                  properties: {
                    logs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/WhatsAppMessageLog" },
                    },
                    total: { type: "integer", example: 42 },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/notifications/unread-count": {
      get: {
        tags: ["Notificações"],
        summary: "Obtém a quantidade de notificações não lidas",
        operationId: "getUnreadNotificationsCount",
        responses: {
          "200": {
            description: "Contador de notificações não lidas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["count"],
                  properties: {
                    count: { type: "integer", example: 3 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/offline-data": {
      get: {
        tags: ["Modo Offline"],
        summary: "Gera o pacote de sincronização de dados para cache offline",
        operationId: "getOfflineDataBundle",
        responses: {
          "200": {
            description: "Pacote com eventos, escalas e repertório do usuário",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    events: { type: "array", items: { type: "object" } },
                    songs: { type: "array", items: { type: "object" } },
                    syncedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    schemas: {
      Song: {
        type: "object",
        required: ["id", "title", "organizationId", "createdAt"],
        properties: {
          id: { type: "string" },
          title: { type: "string", example: "Ousado Amor" },
          artist: { type: "string", nullable: true, example: "Isaías Saad" },
          originalTone: { type: "string", nullable: true, example: "G" },
          defaultTone: { type: "string", nullable: true, example: "G" },
          bpm: { type: "integer", nullable: true, example: 68 },
          timeSignature: { type: "string", nullable: true, example: "6/8" },
          spotifyUrl: { type: "string", nullable: true },
          youtubeUrl: { type: "string", nullable: true },
          ccliNumber: { type: "string", nullable: true },
          lyricsWithChords: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SongInput: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "Ousado Amor" },
          artist: { type: "string", example: "Isaías Saad" },
          originalTone: { type: "string", example: "G" },
          defaultTone: { type: "string", example: "G" },
          bpm: { type: "integer", example: 68 },
          timeSignature: { type: "string", example: "6/8" },
          spotifyUrl: { type: "string" },
          youtubeUrl: { type: "string" },
          ccliNumber: { type: "string" },
          lyricsWithChords: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      SongCollection: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Louvores de Domingo" },
          songCount: { type: "integer", example: 12 },
        },
      },
      Event: {
        type: "object",
        required: ["id", "name", "startDate", "organizationId"],
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Culto de Celebração" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time", nullable: true },
          location: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
        },
      },
      Person: {
        type: "object",
        required: ["id", "name", "organizationId"],
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "João da Silva" },
          email: { type: "string", nullable: true },
          phone: { type: "string", nullable: true },
          image: { type: "string", nullable: true },
          hasAccount: { type: "boolean" },
        },
      },
      Department: {
        type: "object",
        required: ["id", "name", "organizationId"],
        properties: {
          id: { type: "string" },
          name: { type: "string", example: "Ministério de Louvor" },
          description: { type: "string", nullable: true },
        },
      },
      WhatsAppMessageLog: {
        type: "object",
        required: ["id", "organizationId", "status", "createdAt"],
        properties: {
          id: { type: "string" },
          organizationId: { type: "string" },
          recipientName: { type: "string", nullable: true },
          recipientPhone: { type: "string" },
          type: { type: "string", example: "announcement" },
          content: { type: "string" },
          status: {
            type: "string",
            enum: ["pending", "sending", "sent", "delivered", "read", "failed"],
            example: "delivered",
          },
          lastError: { type: "string", nullable: true },
          evolutionMessageId: { type: "string", nullable: true },
          attempts: { type: "integer", example: 1 },
          deliveredAt: { type: "string", format: "date-time", nullable: true },
          readAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", example: "Mensagem descritiva do erro ocorrido." },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Requisição inválida ou dados incorretos",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "Usuário não autenticado ou sessão expirada",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Permissão insuficiente para a ação solicitada",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Recurso não encontrado",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
} as const;
