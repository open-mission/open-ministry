"use client";

import { useMemo, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type CollectionComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  existingCollections?: string[];
  disabled?: boolean;
};

export function CollectionCombobox({
  value,
  onChange,
  existingCollections = [],
  disabled = false,
}: CollectionComboboxProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return existingCollections;
    return existingCollections.filter((c) => c.toLowerCase().includes(q));
  }, [existingCollections, query]);

  const exactMatchExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return existingCollections.some((c) => c.toLowerCase() === q);
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

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      className={cn(
        "h-10 w-full justify-between rounded-lg px-3 text-left font-normal shadow-2xs hover:bg-muted/30",
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
      <div className="flex items-center gap-1">
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onChange("");
              }
            }}
            className="flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Remover grupo"
          >
            <XIcon className="size-3.5" />
          </span>
        ) : null}
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
      </div>
    </Button>
  );

  const contentList = (
    <div className="flex flex-col gap-1 p-1">
      {/* OPÇÃO DE LIMPAR (SEM GRUPO) */}
      <button
        type="button"
        onClick={() => handleSelect("")}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted",
          !value ? "bg-muted text-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        <span>Nenhum grupo (música avulsa)</span>
        {!value ? <CheckIcon className="size-3.5 text-primary" /> : null}
      </button>

      {/* GRUPOS EXISTENTES */}
      {filtered.length > 0 ? (
        <div className="max-h-56 overflow-y-auto space-y-0.5 py-1">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSelect(item)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted text-left",
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
        </div>
      ) : existingCollections.length > 0 ? (
        <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
          Nenhum grupo encontrado com &quot;{query}&quot;.
        </p>
      ) : (
        <div className="p-3 text-center text-xs text-muted-foreground">
          Nenhum grupo cadastrado ainda.
        </div>
      )}

      {/* BOTÃO DE CRIAR NOVO GRUPO */}
      {query.trim() && !exactMatchExists ? (
        <div className="border-t border-border/60 pt-1 mt-1">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex w-full items-center gap-2 rounded-md bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 text-left"
          >
            <FolderPlusIcon className="size-4 shrink-0" />
            <span className="truncate">
              Criar novo grupo: &quot;{query.trim()}&quot;
            </span>
          </button>
        </div>
      ) : !query.trim() && existingCollections.length === 0 ? (
        <p className="border-t border-border/60 pt-2 text-center text-[11px] text-muted-foreground">
          Digite o nome acima para criar o primeiro grupo (ex: &quot;Harpa Cristã&quot; ou &quot;Jovens&quot;).
        </p>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[85dvh] flex flex-col p-0">
          <DrawerHeader className="border-b border-border/70 px-5 py-3.5 text-left">
            <DrawerTitle className="flex items-center gap-2 text-base font-bold font-heading">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderIcon className="size-4" />
              </span>
              <span>Coleção / Grupo de Músicas</span>
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Agrupe músicas por ministério (ex: Louvor, Jovens) ou coletâneas (ex: Harpa Cristã).
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 border-b border-border/60">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar ou digitar novo grupo..."
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
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
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
              placeholder="Pesquisar ou criar grupo..."
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
