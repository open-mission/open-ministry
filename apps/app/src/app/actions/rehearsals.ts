"use server";

import {
  createRehearsalAction as createRehearsalActionImpl,
  deleteRehearsalAction as deleteRehearsalActionImpl,
  getRehearsalAction as getRehearsalActionImpl,
  listAllRehearsalsAction as listAllRehearsalsActionImpl,
  listRehearsalAlertRulesAction as listRehearsalAlertRulesActionImpl,
  listRehearsalsAction as listRehearsalsActionImpl,
  resetRehearsalAlertRulesAction as resetRehearsalAlertRulesActionImpl,
  saveRehearsalAlertRulesAction as saveRehearsalAlertRulesActionImpl,
  updateRehearsalAction as updateRehearsalActionImpl,
} from "@/features/rehearsals/actions/rehearsals.actions";

export async function listRehearsalsAction(departmentId: string) {
  return listRehearsalsActionImpl(departmentId);
}

export async function listAllRehearsalsAction(departmentId?: string) {
  return listAllRehearsalsActionImpl(departmentId);
}

export async function getRehearsalAction(
  departmentId: string,
  eventId: string,
) {
  return getRehearsalActionImpl(departmentId, eventId);
}

export async function createRehearsalAction(
  departmentId: string,
  input: unknown,
) {
  return createRehearsalActionImpl(departmentId, input);
}

export async function updateRehearsalAction(
  departmentId: string,
  eventId: string,
  input: unknown,
) {
  return updateRehearsalActionImpl(departmentId, eventId, input);
}

export async function deleteRehearsalAction(
  departmentId: string,
  eventId: string,
) {
  return deleteRehearsalActionImpl(departmentId, eventId);
}

export async function listRehearsalAlertRulesAction(departmentId: string) {
  return listRehearsalAlertRulesActionImpl(departmentId);
}

export async function saveRehearsalAlertRulesAction(
  departmentId: string,
  rules: unknown,
) {
  return saveRehearsalAlertRulesActionImpl(departmentId, rules);
}

export async function resetRehearsalAlertRulesAction(departmentId: string) {
  return resetRehearsalAlertRulesActionImpl(departmentId);
}
