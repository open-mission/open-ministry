import { redirect } from "next/navigation";

/**
 * A lista de cultos e eventos foi unificada na Agenda (/calendar).
 * O deep link /events/[eventId] continua válido e não é afetado por aqui.
 */
export default function EventsPage() {
  redirect("/calendar");
}
