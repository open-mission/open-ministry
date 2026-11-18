"use server";

// Re-exportação explícita: arquivos "use server" só podem exportar funções
// assíncronas, então `export *` não é permitido pelo compilador.
export {
  listRehearsalsAction,
  getRehearsalAction,
  createRehearsalAction,
  updateRehearsalAction,
  deleteRehearsalAction,
  listRehearsalAlertRulesAction,
  saveRehearsalAlertRulesAction,
  resetRehearsalAlertRulesAction,
} from "@/features/rehearsals/actions/rehearsals.actions";
