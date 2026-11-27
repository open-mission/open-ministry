import type {
  DelegationType,
  TaskItem,
  TaskPriority,
  TaskScope,
  TaskStatus,
} from "../../services/tasks-service";

export type DepartmentOption = {
  id: string;
  name: string;
};

export type MemberOption = {
  id?: string;
  userId: string;
  personId?: string;
  name: string;
  email?: string | null;
};

export type TaskFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (task?: TaskItem, createdCount?: number) => void;
  taskToEdit?: TaskItem | null;
  departments?: DepartmentOption[];
  members?: MemberOption[];
  currentUserId?: string;
  canDelegateDepartment?: boolean;
  canDelegateChurch?: boolean;
  defaultScope?: TaskScope;
  defaultDepartmentId?: string | null;
  defaultStatus?: TaskStatus;
  nested?: boolean;
};

export type TargetType = "self" | "member" | "department" | "church";
export type DeadlinePreset = "none" | "today" | "tomorrow" | "sunday" | "custom";

export type TaskFieldErrors = {
  title?: string;
  assigneeId?: string;
  departmentId?: string;
  url?: string;
};

export type TaskFormFieldsState = {
  title: string;
  targetType: TargetType;
  departmentId: string;
  assigneeId: string;
  memberSearch: string;
  delegationType: DelegationType;
  deadlinePreset: DeadlinePreset;
  deadline: string;
  date: string;
  showMore: boolean;
  description: string;
  priority: TaskPriority;
  tags: string[];
  tagInput: string;
  url: string;
  isPinned: boolean;
  isRecurring: boolean;
  recurrenceDay: string;
  recurrenceTime: string;
};
