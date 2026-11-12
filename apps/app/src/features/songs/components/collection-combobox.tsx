"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSongsQuery } from "@/hooks/use-songs";
import { cn } from "@/lib/utils";

type CollectionComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  existingCollections?: string[];
  disabled?: boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const OPTION_SELECTOR = '[role="option"]';

export function CollectionCombobox({
  value,
  onChange,
  existingCollections: propCollections = [],
  disabled = false,
}: CollectionComboboxProps) {
  const isMobile = useIsMobile();
  const listboxId = useId();
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: songsData } = useSongsQuery();

  const existingCollections = useMemo(() => {
    const set = new Set<string>();
    if (propCollections) {
      for (const c of propCollections) {
        if (c?.trim()) set.add(c.trim());
      }
    }
    if (songsData?.collections) {
      for (const c of songsData.collections) {
        if (c?.trim()) set.add(c.trim());
      }
    }
    if (songsData?.songs) {
      for (const s of songsData.songs) {
        if (s.collection?.trim()) set.add(s.collection.trim());
      }
    }
    if (value?.trim()) {
      set.add(value.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [propCollections, songsData, value]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return existingCollections;
    return existingCollections.filter((c) => normalize(c).includes(q));
  }, [existingCollections, query]);

  const exactMatchExists = useMemo(() => {
    const q = normalize(query.trim());
    return existingCollections.some((c) => normalize(c) === q);
  }, [existingCollections, query]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
    setQuery("");
  };

  const handleCreateNew = () => {
    if (!query.trim()) return;
    handleSelect(query.trim());
  };

  const focusOption = (index: number) => {
    const options = listboxRef.current?.querySelectorAll<HTMLElement>(
      OPTION_SELECTOR,
    );
    if (!options || options.length === 0) return;
    const next = ((index % options.length) + options.length) % options.length;
    options[next]?.focus();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(-1);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const clean = query.trim();
      const exact = filtered.find(
        (item) => normalize(item) === normalize(clean),
      );
      if (exact) {
        handleSelect(exact);
      } else if (filtered[0]) {
        handleSelect(filtered[0]);
      } else if (clean) {
        handleCreateNew();
      } else {
        handleSelect("");
      }
    }
  };

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(
      listboxRef.current?.querySelectorAll<HTMLElement>(OPTION_SELECTOR) ?? [],
    );
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusOption(currentIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusOption(currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusOption(0);
        break;
      case "End":
        event.preventDefault();
        focusOption(options.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls={open ? listboxId : undefined}
      aria-label="Grupo da música"
      disabled={disabled}
      className={cn(
        "h-10 w-full min-w-0 flex-1 justify-between rounded-lg px-3 text-left font-normal shadow-2xs hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !value && "text-muted-foreground",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FolderIcon
          className={cn(
            "size-4 shrink-0",
            value ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="truncate font-medium text-foreground">
          {value || "Selecione ou crie um grupo..."}
        </span>
      </div>
      <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
    </Button>
  );

  const clearButton = value ? (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      onClick={() => {
        onChange("");
        setQuery("");
      }}
      className="size-10 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
      aria-label="Remover grupo"
      title="Remover grupo"
    >
      <XIcon className="size-4" />
    </Button>
  ) : null;

  const triggerControl = (
    <div className="flex w-full items-center gap-2">
      {isMobile ? (
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      ) : (
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      )}
      {clearButton}
    </div>
  );

  const contentList = (
    <div className="flex flex-col gap-1 p-1">
      <div
        ref={listboxRef}
        id={listboxId}
        role="listbox"
        aria-label="Grupos disponíveis"
        onKeyDown={handleListboxKeyDown}
        className="flex flex-col gap-0.5"
      >
        {/* OPÇÃO DE LIMPAR (SEM GRUPO) */}
        <button
          type="button"
          role="option"
          aria-selected={!value}
          tabIndex={-1}
          onClick={() => handleSelect("")}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !value
              ? "bg-muted text-foreground font-semibold"
              : "text-muted-foreground",
          )}
        >
          <span>Nenhum grupo (música avulsa)</span>
          {!value ? <CheckIcon className="size-3.5 text-primary" /> : null}
        </button>

        {/* GRUPOS EXISTENTES */}
        {filtered.map((item) => (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={value === item}
            tabIndex={-1}
            onClick={() => handleSelect(item)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left",
              value === item
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground",
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <FolderIcon className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{item}</span>
            </span>
            {value === item ? (
              <CheckIcon className="size-3.5 shrink-0 text-primary" />
            ) : null}
          </button>
        ))}

        {/* CRIAR NOVO GRUPO */}
        {query.trim() && !exactMatchExists ? (
          <button
            type="button"
            role="option"
            aria-selected={false}
            tabIndex={-1}
            onClick={handleCreateNew}
            className="flex w-full items-center gap-2 rounded-md bg-primary/10 px-2.5 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FolderPlusIcon className="size-4 shrink-0" />
            <span className="truncate">
              Criar novo grupo: &quot;{query.trim()}&quot;
            </span>
          </button>
        ) : null}
      </div>

      {filtered.length === 0 && existingCollections.length > 0 ? (
        <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
          Nenhum grupo encontrado com &quot;{query}&quot;.
        </p>
      ) : existingCollections.length === 0 ? (
        <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
          Nenhum grupo cadastrado ainda. Digite acima para criar o primeiro
          grupo (ex: &quot;Harpa Cristã&quot; ou &quot;Jovens&quot;).
        </p>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {triggerControl}
        <DrawerContent className="max-h-[85dvh] flex flex-col p-0">
          <DrawerHeader className="border-b border-border/70 px-5 py-3.5 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base font-bold font-heading">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderIcon className="size-4" />
              </span>
              <span>Grupo de Músicas</span>
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Agrupe músicas por ministério (ex: Louvor, Jovens) ou coletâneas
              (ex: Harpa Cristã).
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 border-b border-border/60">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Pesquisar ou digitar novo grupo..."
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-label="Pesquisar grupo"
                className="h-10 pl-9 pr-3 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {contentList}
          </div>

          <DrawerFooter className="border-t border-border/70 px-5 py-3 bg-muted/20">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Fechar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {triggerControl}
      <PopoverContent
        align="start"
        className="w-[320px] p-0 shadow-lg rounded-xl"
      >
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Pesquisar ou criar grupo..."
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-label="Pesquisar grupo"
              className="h-8 pl-8 pr-2 text-xs"
              autoFocus
            />
          </div>
        </div>
        {contentList}
      </PopoverContent>
    </Popover>
  );
}
