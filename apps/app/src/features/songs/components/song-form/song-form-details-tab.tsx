"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  STANDARD_TIME_SIGNATURES,
  STANDARD_TONES,
} from "@/lib/music/chords-utils";
import { CollectionCombobox } from "../collection-combobox";
import type { SongFormFields } from "./song-form.types";

type SongFormDetailsTabProps = {
  fields: SongFormFields;
  availableCollections: string[];
  onFieldChange: (field: keyof SongFormFields, value: string) => void;
};

export function SongFormDetailsTab({
  fields,
  availableCollections,
  onFieldChange,
}: SongFormDetailsTabProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="song-title">
          Título da música <span className="text-destructive">*</span>
        </Label>
        <Input
          id="song-title"
          value={fields.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          placeholder="Ex: A Casa É Sua"
          required
          className="h-10"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="song-artist">Artista / Ministério</Label>
        <Input
          id="song-artist"
          value={fields.artist}
          onChange={(e) => onFieldChange("artist", e.target.value)}
          placeholder="Ex: Casa Worship, Morada..."
          className="h-10"
        />
      </div>

      {/* GRUPO DO REPERTÓRIO */}
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label>Grupo</Label>
        <CollectionCombobox
          value={fields.collection}
          onChange={(value) => onFieldChange("collection", value)}
          existingCollections={availableCollections}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="song-tone">Tom principal</Label>
        <NativeSelect
          id="song-tone"
          value={fields.tone}
          onChange={(e) => onFieldChange("tone", e.target.value)}
          className="h-10"
        >
          <option value="">Selecione o tom...</option>
          {STANDARD_TONES.map((t) => (
            <option key={t} value={t}>
              Tom {t}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="song-capo">Capotraste</Label>
        <NativeSelect
          id="song-capo"
          value={fields.capo}
          onChange={(e) => onFieldChange("capo", e.target.value)}
          className="h-10"
        >
          <option value="">Sem capotraste</option>
          {Array.from({ length: 12 }, (_, index) => index + 1).map(
            (position) => (
              <option key={position} value={String(position)}>
                Capo {position}ª casa
              </option>
            ),
          )}
        </NativeSelect>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="song-bpm">BPM (Andamento)</Label>
        <Input
          id="song-bpm"
          type="number"
          min={20}
          max={300}
          value={fields.bpm}
          onChange={(e) => onFieldChange("bpm", e.target.value)}
          placeholder="Ex: 72"
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="song-time-signature">Compasso</Label>
        <NativeSelect
          id="song-time-signature"
          value={fields.timeSignature}
          onChange={(e) => onFieldChange("timeSignature", e.target.value)}
          className="h-10"
        >
          {STANDARD_TIME_SIGNATURES.map((ts) => (
            <option key={ts} value={ts}>
              {ts}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="song-tags">
          Tags / Temas (separadas por vírgula)
        </Label>
        <Input
          id="song-tags"
          value={fields.tagsInput}
          onChange={(e) => onFieldChange("tagsInput", e.target.value)}
          placeholder="Ex: Adoração, Celebração, Ceia, Gratidão"
          className="h-10"
        />
        <p className="text-[11px] text-muted-foreground">
          Use vírgula para separar múltiplos temas. Até 3 tags aparecerão em
          destaque no cabeçalho.
        </p>
      </div>
    </div>
  );
}
