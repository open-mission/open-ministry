export type OfflineAssignment = {
  id: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string;
  formattedDate: string;
  formattedTime: string;
  functionName: string;
  departmentName: string;
};

export type OfflineEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  formattedDate: string;
  formattedTime: string;
  description: string | null;
  departments: string[];
};

export type OfflinePlanItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  order: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  responsibleName: string | null;
};

export type OfflineOrderOfService = {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string;
  formattedDate: string;
  formattedTime: string;
  items: OfflinePlanItem[];
};

export type OfflineRosterMember = {
  id: string;
  departmentName: string;
  functionName: string;
  personName: string;
  personPhone: string | null;
};

export type OfflineFullSchedule = {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  formattedDate: string;
  roster: OfflineRosterMember[];
};

export type OfflineContact = {
  id: string;
  name: string;
  role: string;
  departmentName?: string;
  phone: string | null;
  email: string | null;
};

export type OfflinePayload = {
  syncedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
    organizationName: string;
  };
  roleLevel: "member" | "leader" | "admin";
  myAssignments: OfflineAssignment[];
  upcomingEvents: OfflineEvent[];
  ordersOfService: OfflineOrderOfService[];
  fullSchedules: OfflineFullSchedule[];
  emergencyContacts: OfflineContact[];
};
