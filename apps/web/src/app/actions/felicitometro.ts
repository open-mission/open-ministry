"use server";

import {
  submitDailyMoodAction as submitDailyMoodActionImpl,
  getTodayUserMoodAction as getTodayUserMoodActionImpl,
  sendFelicitometroPromptAction as sendFelicitometroPromptActionImpl,
  type SubmitMoodState,
} from "@/features/felicitometro/actions/felicitometro.actions";

export type { SubmitMoodState };

export async function submitDailyMoodAction(
  state: SubmitMoodState,
  formData: FormData,
): Promise<SubmitMoodState> {
  return submitDailyMoodActionImpl(state, formData);
}

export async function getTodayUserMoodAction() {
  return getTodayUserMoodActionImpl();
}

export async function sendFelicitometroPromptAction() {
  return sendFelicitometroPromptActionImpl();
}
