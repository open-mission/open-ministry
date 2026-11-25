export type SavePlanDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsCount: number;
  totalDurationSeconds: number;
};

export type ManagePlanTemplatesDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItemsCount: number;
};

export type ClearPlanDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemsCount: number;
};

export type ImportPlanDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItemsCount: number;
};
