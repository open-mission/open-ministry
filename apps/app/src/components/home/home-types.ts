/**
 * Projeções leves usadas pelas visões da home. Os tipos estruturais aceitam
 * tanto as linhas completas de `listUpcomingEvents`/`getDepartmentAgenda`
 * quanto as escalas de `getUpcomingAssignments`, sem acoplar a UI ao banco.
 */
export type HomeEventSummary = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
};

export type HomeAssignmentSummary = {
  id: string;
  department: { name: string };
  function: { name: string };
  schedule: { event: HomeEventSummary };
};
