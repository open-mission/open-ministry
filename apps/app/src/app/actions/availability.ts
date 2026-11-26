/**
 * Barrel de ações de disponibilidade. A checagem
 * requirePermission("schedules", "manageOwnAvailability") vive em
 * `./availability/weekly.ts` (fonte única das ações semanais); as ações de
 * indisponibilidade e checagem de evento estão nos módulos irmãos.
 */
export {
  getMyAvailabilityAction,
  getPersonAvailabilityAction,
  saveMyAvailabilityAction,
} from "./availability/weekly";
export {
  deleteUnavailabilityAction,
  getMyUnavailabilitiesAction,
  saveUnavailabilityAction,
} from "./availability/unavailability";
export {
  checkPersonAvailabilityForEventAction,
  getEventUnavailablePeopleAction,
} from "./availability/event-checks";
