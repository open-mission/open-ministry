import { connection } from "next/server";

import { getOfflineBundle } from "@/lib/offline-service";
import { getSession } from "@/lib/session";

export async function GET() {
  await connection();

  const session = await getSession();
  const organizationId = session?.session.activeOrganizationId;

  if (!session || !organizationId) {
    return Response.json(
      { error: "Não autenticado ou organização não selecionada" },
      { status: 401 },
    );
  }

  try {
    const bundle = await getOfflineBundle(organizationId, session.user.id);
    return Response.json(bundle);
  } catch (error) {
    console.error("Erro ao gerar pacote offline:", error);
    return Response.json(
      { error: "Erro ao gerar dados offline" },
      { status: 500 },
    );
  }
}
