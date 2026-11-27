export function SongListHeader() {
  return (
    <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.15fr)_9rem] items-center gap-4 border-b border-border/60 px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase md:grid">
      <span>Música</span>
      <span>Tom</span>
      <span>Material</span>
      <span>Último culto</span>
      <span className="text-right">Ações</span>
    </div>
  );
}
