import { afterAll, describe, expect, it, mock } from "bun:test";
import {
  Fragment,
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

const actualUseMobile = await import("@/hooks/use-mobile");
const actualDrawer = await import("@/components/ui/drawer");
const actualPopover = await import("@/components/ui/popover");

let isMobileViewport = false;

type MockProps = {
  children?: ReactNode;
  className?: string;
  open?: boolean;
  [key: string]: unknown;
};

const passthrough = ({ children }: MockProps) =>
  createElement(Fragment, null, children);

const drawerOpenContext = createContext(true);

const DrawerMock = ({ children }: MockProps) =>
  createElement(drawerOpenContext.Provider, { value: true }, children);

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

const PopoverMock = ({ children }: MockProps) =>
  createElement(Fragment, null, children);

const PopoverPanel = ({ className, children, ...props }: MockProps) =>
  createElement(
    "div",
    { "data-slot": "popover-content", className, ...props } as never,
    children,
  );

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => isMobileViewport,
}));

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

mock.module("@/components/ui/popover", () => ({
  Popover: PopoverMock,
  PopoverTrigger: passthrough,
  PopoverContent: PopoverPanel,
}));

const { SongsToolbar } = await import(
  "../components/songs-list/songs-toolbar"
);

afterAll(() => {
  mock.module("@/hooks/use-mobile", () => actualUseMobile);
  mock.module("@/components/ui/drawer", () => actualDrawer);
  mock.module("@/components/ui/popover", () => actualPopover);
});

const baseProps = {
  search: "",
  onSearchChange: () => {},
  toneFilter: "",
  onToneFilterChange: () => {},
  statusFilter: "all" as const,
  onStatusFilterChange: () => {},
  sortOption: "manual" as const,
  onSortOptionChange: () => {},
  counts: {
    total: 12,
    missingChords: 2,
    missingLyrics: 1,
    neverUsed: 3,
  },
  activeFilterCount: 0,
  hasActiveFilters: false,
  onClearFilters: () => {},
};

describe("SongsToolbar — InputGroup e Drawer mobile", () => {
  it("renderiza input de busca, botão de limpar e botão de filtros dentro do mesmo InputGroup", () => {
    isMobileViewport = false;
    const html = renderToStaticMarkup(
      createElement(SongsToolbar, { ...baseProps, search: "Graça" }),
    );

    expect(html).toContain('data-slot="input-group"');
    expect(html).toContain('data-slot="input-group-control"');
    expect(html).toContain('data-slot="input-group-addon"');
    expect(html).toContain('aria-label="Limpar busca"');
    expect(html).toContain('aria-label="Filtros"');
  });

  it("usa Popover no desktop e Drawer no mobile ao acionar filtros", () => {
    isMobileViewport = false;
    const desktopHtml = renderToStaticMarkup(
      createElement(SongsToolbar, baseProps),
    );
    expect(desktopHtml).toContain('data-slot="popover-content"');
    expect(desktopHtml).not.toContain('data-slot="drawer-content"');

    isMobileViewport = true;
    const mobileHtml = renderToStaticMarkup(
      createElement(SongsToolbar, { ...baseProps, activeFilterCount: 2, hasActiveFilters: true }),
    );
    expect(mobileHtml).toContain('data-slot="drawer-content"');
    expect(mobileHtml).not.toContain('data-slot="popover-content"');
    expect(mobileHtml).toContain("max-h-[85dvh]");
    expect(mobileHtml).toContain("rounded-t-xl");
    expect(mobileHtml).toContain("bg-popover");
    expect(mobileHtml).toContain("!text-left");
    expect(mobileHtml).toContain("Limpar filtros");
    expect(mobileHtml).toContain("Fechar");
    expect(mobileHtml).toContain("Pendências");
    expect(mobileHtml).toContain("Ordenação");
  });
});
