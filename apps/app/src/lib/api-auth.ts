import { getOrganizationContext } from "@/lib/organizations";

/**
 * Versão de `requireOrganizationContext()` para Route Handlers: em vez de
 * redirecionar (o que geraria NEXT_REDIRECT e viraria 500/307 em /api/*),
 * devolve uma resposta 401 pronta para ser retornada.
 */
export async function requireApiOrganizationContext() {
  const context = await getOrganizationContext();

  if (!context) {
    return {
      ok: false as const,
      response: Response.json(
        { error: "Não autenticado ou nenhuma igreja ativa selecionada." },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const, context };
}
