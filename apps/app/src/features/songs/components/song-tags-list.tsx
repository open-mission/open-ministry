"use client";

import { useState } from "react";
import { HashIcon, TagIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

type SongTagsListProps = {
  tags: string[];
  maxVisible?: number;
};

export function SongTagsList({ tags, maxVisible = 3 }: SongTagsListProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mr-0.5">
          <TagIcon className="size-3" />
          Tags:
        </span>

        {visibleTags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="rounded-lg border-border/70 bg-card/60 px-2 py-0.5 text-[11px] font-normal text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            #{tag}
          </Badge>
        ))}

        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-5 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Ver todas as tags desta música"
          >
            +{hiddenCount}
            <span className="sr-only">mais tags</span>
          </button>
        ) : null}
      </div>

      {/* DIÁLOGO / DRAWER RESPONSIVO PARA TODAS AS TAGS */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85dvh] rounded-t-[28px] border-x-0 border-b-0 bg-background p-0">
            <DrawerHeader className="border-b px-5 pt-4 pb-3 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TagIcon className="size-4" />
                </span>
                <DrawerTitle className="font-heading text-lg font-bold">
                  Tags da Música ({tags.length})
                </DrawerTitle>
              </div>
              <DrawerDescription className="text-xs text-muted-foreground">
                Categorias e temas associados a esta música no acervo.
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="gap-1 rounded-lg border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <HashIcon className="size-3 text-primary" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <DrawerFooter className="border-t pt-3 pb-6">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Fechar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="gap-1.5 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TagIcon className="size-4" />
                </span>
                <DialogTitle className="font-heading text-xl font-bold">
                  Tags da Música ({tags.length})
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                Categorias e temas associados a esta música no acervo.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 py-3">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="gap-1 rounded-lg border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground"
                >
                  <HashIcon className="size-3 text-primary" />
                  {tag}
                </Badge>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
