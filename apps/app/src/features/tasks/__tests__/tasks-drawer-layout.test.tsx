import { afterAll, describe, expect, it, mock } from "bun:test";
import {
  Fragment,
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { TaskCapabilities } from "../lib/task-permissions";
import type { TaskItem } from "../services/tasks-service";

// Guarda as implementações reais antes de registrar os mocks abaixo, para
// restaurá-las ao final e não afetar outros arquivos de teste no mesmo processo.
const actualDrawer = await import("@/components/ui/drawer");
const actualDialog = await import("@/components/ui/dialog");
const actualAlertDialog = await import("@/components/ui/alert-dialog");
const actualUseMobile = await import("@/hooks/use-mobile");
const actualTasksActions = await import("../actions/tasks.actions");

let isMobileViewport = true;

type MockProps = {
  children?: ReactNode;
  className?: string;
  open?: boolean;
  role?: string;
  [key: string]: unknown;
};

const passthrough = ({ children }: MockProps) =>
  createElement(Fragment, null, children);

const drawerOpenContext = createContext(true);

const DrawerMock = ({ open = true, children }: MockProps) =>
  createElement(
    drawerOpenContext.Provider,
    { value: Boolean(open) },
    children,
  );

const DrawerPanel = ({ className, children, ...props }: MockProps) => {
  const open = useContext(drawerOpenContext);
  if (!open) return null;
  return createElement(
    "div",
    {
      "data-slot": "drawer-content",
      "data-vaul-drawer-direction": "bottom",
      className,
      ...props,
    } as never,
    children,
  );
};

function slotDiv(slot: string) {
  function Slot({ className, children, ...props }: MockProps) {
    return createElement(
      "div",
      { "data-slot": slot, className, ...props } as never,
      children,
    );
  }
  Slot.displayName = `MockSlot(${slot})`;
  return Slot;
}

const dialogOpenContext = createContext(true);
const DialogMock = ({ open = true, children }: MockProps) =>
  createElement(dialogOpenContext.Provider, { value: Boolean(open) }, children);
const DialogPanel = ({ className, children, ...props }: MockProps) => {
  const open = useContext(dialogOpenContext);
  if (!open) return null;
  return createElement(
    "div",
    { "data-slot": "dialog-content", className, ...props } as never,
    children,
  );
};

const alertDialogOpenContext = createContext(true);
const AlertDialogMock = ({ open = true, children }: MockProps) =>
  createElement(
    alertDialogOpenContext.Provider,
    { value: Boolean(open) },
    children,
  );
const AlertDialogPanel = ({ className, children, ...props }: MockProps) => {
  const open = useContext(alertDialogOpenContext);
  if (!open) return null;
  return createElement(
    "div",
    { "data-slot": "alert-dialog-content", className, ...props } as never,
    children,
  );
};

mock.module("@/components/ui/drawer", () => ({
  Drawer: DrawerMock,
  DrawerNestedRoot: DrawerMock,
  DrawerTrigger: passthrough,
  DrawerPortal: passthrough,
  DrawerClose: passthrough,
  DrawerContent: DrawerPanel,
  DrawerHeader: slotDiv("drawer-header"),
  DrawerFooter: slotDiv("drawer-footer"),
  DrawerTitle: slotDiv("drawer-title"),
  DrawerDescription: slotDiv("drawer-description"),
}));

mock.module("@/components/ui/dialog", () => ({
  Dialog: DialogMock,
  DialogContent: DialogPanel,
  DialogHeader: slotDiv("dialog-header"),
  DialogFooter: slotDiv("dialog-footer"),
  DialogTitle: slotDiv("dialog-title"),
  DialogDescription: slotDiv("dialog-description"),
}));

mock.module("@/components/ui/alert-dialog", () => ({
  AlertDialog: AlertDialogMock,
  AlertDialogContent: AlertDialogPanel,
  AlertDialogHeader: slotDiv("alert-dialog-header"),
  AlertDialogFooter: slotDiv("alert-dialog-footer"),
  AlertDialogTitle: slotDiv("alert-dialog-title"),
  AlertDialogDescription: slotDiv("alert-dialog-description"),
  AlertDialogCancel: slotDiv("alert-dialog-cancel"),
  AlertDialogAction: slotDiv("alert-dialog-action"),
}));

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => isMobileViewport,
}));

mock.module("../actions/tasks.actions", () => ({
  createTaskAction: async () => ({ ok: true, data: {} }),
  updateTaskAction: async () => ({ ok: true, data: {} }),
  deleteTaskAction: async () => ({ ok: true, data: {} }),
  updateTaskStatusAction: async () => ({
    ok: true,
    data: { task: null },
  }),
  getTaskAuditHistoryAction: async () => ({ ok: true, data: [] }),
  toggleTaskPinAction: async () => ({ ok: true, data: { isPinned: true } }),
}));

const { TaskDetailDialog } = await import(
  "@/features/tasks/components/task-detail-dialog"
);
const { TaskFormDialog } = await import(
  "@/features/tasks/components/task-form-dialog"
);
const { TaskAuditHistoryDialog } = await import(
  "@/features/tasks/components/task-audit-history-dialog"
);

afterAll(() => {
  isMobileViewport = false;
  mock.module("@/components/ui/drawer", () => ({ ...actualDrawer }));
  mock.module("@/components/ui/dialog", () => ({ ...actualDialog }));
  mock.module("@/components/ui/alert-dialog", () => ({ ...actualAlertDialog }));
  mock.module("@/hooks/use-mobile", () => ({ ...actualUseMobile }));
  mock.module("../actions/tasks.actions", () => ({ ...actualTasksActions }));
});

const baseTask = {
  id: "task-1",
  organizationId: "org-1",
  title:
    "Preparar o repertório e a lista de músicas do culto de domingo com a equipe de louvor",
  description: "Conferir tons, arranjos e a ordem das músicas antes do ensaio.",
  status: "todo",
  priority: "high",
  scope: "department",
  departmentId: "dept-1",
  department: { id: "dept-1", name: "Louvor" },
  assigneeId: null,
  assignee: null,
  assigneePersonId: "person-1",
  assigneePerson: {
    id: "person-1",
    name: "Maria Souza",
    email: null,
    image: null,
  },
  createdById: "user-1",
  createdBy: {
    id: "user-1",
    name: "João Lima",
    email: null,
    image: null,
  },
  completedBy: null,
  completedAt: null,
  date: null,
  deadline: null,
  tags: ["Culto"],
  url: null,
  isPinned: true,
  isRecurring: true,
  recurrenceRule: "FREQ=WEEKLY;BYDAY=0;BYTIME=09:00",
  delegationType: "shared",
  sortOrder: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as unknown as TaskItem;

const fullCapabilities: TaskCapabilities = {
  canView: true,
  canUpdateStatus: true,
  canEdit: true,
  canDelete: true,
  canPin: true,
  canReorder: true,
};

const readOnlyCapabilities: TaskCapabilities = {
  canView: true,
  canUpdateStatus: false,
  canEdit: false,
  canDelete: false,
  canPin: false,
  canReorder: false,
};

function renderTaskDetail(capabilities: TaskCapabilities = fullCapabilities) {
  return renderToStaticMarkup(
    createElement(TaskDetailDialog, {
      task: baseTask,
      open: true,
      onClose: () => undefined,
      onEdit: () => undefined,
      onDeleted: () => undefined,
      onTaskUpdated: () => undefined,
      capabilities,
    }),
  );
}

function expectMobileScrollContainer(markup: string) {
  expect(markup).toContain("data-vaul-no-drag");
  expect(markup).toContain("touch-pan-y");
  expect(markup).toContain("overscroll-y-contain");
  expect(markup).toContain("min-h-0");
  expect(markup).toContain("overflow-y-auto");
  expect(markup).toContain("[-webkit-overflow-scrolling:touch]");
  expect(markup).toContain(
    "data-[vaul-drawer-direction=bottom]:max-h-[90dvh]",
  );
}

describe("Tasks module mobile drawers", () => {
  it("keeps the detail drawer content scrollable inside a no-drag wrapper", () => {
    isMobileViewport = true;
    const markup = renderTaskDetail();

    expectMobileScrollContainer(markup);
    expect(markup).toContain("rounded-t-[24px]");
    expect(markup).toContain('aria-label="Fechar detalhes da tarefa"');

    const scrollIndex = markup.indexOf("data-vaul-no-drag");
    const footerIndex = markup.indexOf('data-slot="drawer-footer"');
    const historyIndex = markup.indexOf("Histórico");
    const deleteIndex = markup.indexOf("Excluir");
    const editIndex = markup.indexOf("Editar");
    const completeIndex = markup.indexOf("Concluir tarefa");

    expect(scrollIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeGreaterThan(scrollIndex);

    // Histórico e Excluir ficam no fim da área de rolagem.
    expect(historyIndex).toBeGreaterThan(scrollIndex);
    expect(historyIndex).toBeLessThan(footerIndex);
    expect(deleteIndex).toBeGreaterThan(scrollIndex);
    expect(deleteIndex).toBeLessThan(footerIndex);

    // Editar e Concluir tarefa ficam no rodapé fixo.
    expect(editIndex).toBeGreaterThan(footerIndex);
    expect(completeIndex).toBeGreaterThan(footerIndex);
  });

  it("renders the assignee person when assignee is null", () => {
    isMobileViewport = true;
    const markup = renderTaskDetail();

    expect(markup).toContain("Responsável");
    expect(markup).toContain("Maria Souza");
  });

  it("shows a single Fechar action in the footer for read-only tasks", () => {
    isMobileViewport = true;
    const markup = renderTaskDetail(readOnlyCapabilities);

    const footerIndex = markup.indexOf('data-slot="drawer-footer"');
    expect(footerIndex).toBeGreaterThan(-1);

    const footerMarkup = markup.slice(footerIndex);
    expect(footerMarkup).toContain("Fechar");
    expect(footerMarkup).not.toContain("Editar");
    expect(footerMarkup).not.toContain("Concluir tarefa");

    // Histórico continua disponível no fim da rolagem.
    expect(markup).toContain("Histórico");
    expect(markup).not.toContain("Excluir");
  });

  it("keeps the task form scrollable above a single-row footer", () => {
    isMobileViewport = true;
    const markup = renderToStaticMarkup(
      createElement(TaskFormDialog, {
        open: true,
        onClose: () => undefined,
      }),
    );

    expectMobileScrollContainer(markup);
    expect(markup).toContain('data-slot="drawer-footer"');
    expect(markup).toContain("Cancelar");
    expect(markup).toContain("Criar tarefa");
  });

  it("keeps the audit history scrollable with a fixed close footer", () => {
    isMobileViewport = true;
    const markup = renderToStaticMarkup(
      createElement(TaskAuditHistoryDialog, {
        task: baseTask,
        open: true,
        onClose: () => undefined,
      }),
    );

    expectMobileScrollContainer(markup);
    expect(markup).toContain("Histórico de alterações");

    const footerIndex = markup.indexOf('data-slot="drawer-footer"');
    expect(footerIndex).toBeGreaterThan(-1);
    expect(markup.slice(footerIndex)).toContain("Fechar");
  });
});

describe("Tasks module desktop dialogs", () => {
  it("renders all four detail actions in the dialog footer", () => {
    isMobileViewport = false;
    const markup = renderTaskDetail();

    expect(markup).toContain('data-slot="dialog-content"');
    expect(markup).toContain("max-h-[85vh]");

    const footerIndex = markup.indexOf('data-slot="dialog-footer"');
    expect(footerIndex).toBeGreaterThan(-1);

    const footerMarkup = markup.slice(footerIndex);
    expect(footerMarkup).toContain("mx-0 mb-0");
    expect(footerMarkup).toContain("Histórico");
    expect(footerMarkup).toContain("Excluir");
    expect(footerMarkup).toContain("Editar");
    expect(footerMarkup).toContain("Concluir tarefa");
  });
});
