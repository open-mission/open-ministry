import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { remember } from "@/lib/cache";
import {
  interpolateTemplate,
  TEMPLATE_DEFINITIONS,
  type MessageTemplateType,
  type ResolvedTemplate,
} from "@/lib/message-templates";

/**
 * Fetches all templates for an organization, merging customized DB records with default definitions.
 */
export async function getOrganizationMessageTemplates(
  organizationId: string,
): Promise<ResolvedTemplate[]> {
  return remember(
    `org:${organizationId}:message-templates`,
    300,
    async () => {
      try {
        const customRows = await db.query.organizationMessageTemplate.findMany({
          where: eq(schema.organizationMessageTemplate.organizationId, organizationId),
        });

        const customMap = new Map(
          customRows.map((row) => [row.type as MessageTemplateType, row]),
        );

        const allTypes = Object.keys(TEMPLATE_DEFINITIONS) as MessageTemplateType[];

        return allTypes.map((type) => {
          const def = TEMPLATE_DEFINITIONS[type];
          const custom = customMap.get(type);

          return {
            type: def.type,
            title: custom?.title || def.title,
            description: def.description,
            category: def.category,
            content: custom?.content || def.defaultContent,
            defaultContent: def.defaultContent,
            isCustomized: Boolean(custom && custom.content !== def.defaultContent),
            variables: def.variables,
          };
        });
      } catch (error) {
        console.error("Erro ao carregar templates de mensagens:", error);
        return Object.values(TEMPLATE_DEFINITIONS).map((def) => ({
          type: def.type,
          title: def.title,
          description: def.description,
          category: def.category,
          content: def.defaultContent,
          defaultContent: def.defaultContent,
          isCustomized: false,
          variables: def.variables,
        }));
      }
    },
    [`templates:${organizationId}`],
  );
}

/**
 * Resolves a single rendered message text for an organization.
 */
export async function renderOrganizationMessageText(options: {
  organizationId: string;
  type: MessageTemplateType;
  variables: Record<string, string | number | null | undefined>;
}): Promise<string> {
  const { organizationId, type, variables } = options;
  const templates = await getOrganizationMessageTemplates(organizationId);
  const matched = templates.find((t) => t.type === type);
  const templateContent =
    matched?.content || TEMPLATE_DEFINITIONS[type]?.defaultContent || "";
  return interpolateTemplate(templateContent, variables);
}
