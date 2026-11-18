import { afterAll, describe, expect, it, mock } from "bun:test";
import {
  Fragment,
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Guarda as implementações reais antes dos mocks para restaurá-las ao final.
const actualDrawer = await import("@/components/ui/drawer");
const actualDialog = await import("@/components/ui/dialog");
const actualUseMobile = await import("@/hooks/use-mobile");
const actualRehearsalActions = await import("@/app/actions/rehearsals");
const actualNavigation = await import("next/navigation");
const actualSonner = await import("sonner");

let isMobileViewport = true;

type MockProps = {
  children?: ReactNode;
  className?: string;
  open?: boolean;
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
  DialogTrigger: passthrough,
  DialogContent: DialogPanel,
  DialogHeader: slotDiv("dialog-header"),
  DialogFooter: slotDiv("dialog-footer"),
  DialogTitle: slotDiv("dialog-title"),
  DialogDescription: slotDiv("dialog-description"),
}));

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => isMobileViewport,
}));

mock.module("@/app/actions/rehearsals", () => ({
  createRehearsalAction: async () => ({ ok: true, data: {} }),
  updateRehearsalAction: async () => ({ ok: true, data: {} }),
  deleteRehearsalAction: async () => ({ ok: true, data: { ok: true } }),
  listRehearsalAlertRulesAction: async () => ({ ok: true, data: [] }),
  saveRehearsalAlertRulesAction: async () => ({ ok: true, data: [] }),
  resetRehearsalAlertRulesAction: async () => ({ ok: true, data: [] }),
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

mock.module("sonner", () => ({
  toast: { success: () => {}, error: () => {} },
}));

const { RehearsalFormDialog } = await import(
  "@/features/rehearsals/components/rehearsal-form-dialog"
);

afterAll(() => {
  isMobileViewport = false;
  mock.module("@/components/ui/drawer", () => ({ ...actualDrawer }));
  mock.module("@/components/ui/dialog", () => ({ ...actualDialog }));
  mock.module("@/hooks/use-mobile", () => ({ ...actualUseMobile }));
  mock.module("@/app/actions/rehearsals", () => ({
    ...actualRehearsalActions,
  }));
  mock.module("next/navigation", () => ({ ...actualNavigation }));
  mock.module("sonner", () => ({ ...actualSonner }));
});

const songs = [
  {
    id: "song-1",
    title: "Grande é o Senhor",
    artist: "Artista",
    tone: "G",
    collection: "Culto",
    tags: ["Adoração"],
  },
];

function renderForm() {
  return renderToStaticMarkup(
    createElement(RehearsalFormDialog, {
      departmentId: "dept-1",
      songs,
      open: true,
      onOpenChange: () => undefined,
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
}

describe("Rehearsal form mobile drawer", () => {
  it("keeps the form scrollable inside a no-drag wrapper", () => {
    isMobileViewport = true;
    const markup = renderForm();

    expect(markup).toContain('data-slot="drawer-content"');
    expectMobileScrollContainer(markup);
    expect(markup).toContain("max-h-[90dvh]");
    expect(markup).toContain("min-h-11");
    expect(markup).toContain('form="rehearsal-editor-form"');
    expect(markup).toContain("Cancelar");
    expect(markup).toContain("Criar ensaio");
  });
});

describe("Rehearsal form desktop dialog", () => {
  it("renders a capped dialog with the main fields", () => {
    isMobileViewport = false;
    const markup = renderForm();

    expect(markup).toContain('data-slot="dialog-content"');
    expect(markup).toContain("max-h-[85vh]");
    expect(markup).toContain("Novo ensaio");
    expect(markup).toContain("Avisar a equipe agora");
  });
});
