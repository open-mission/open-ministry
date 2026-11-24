"use client";

const PROGRESS_RING_RADIUS = 50;
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

interface ProfileCompletenessRingProps {
  completeness: number;
}

/**
 * Anel de progresso circular em SVG.
 *
 * Um recorte poligonal em CSS não consegue desenhar um arco: ele corta o anel
 * com retas e deixa uma fatia aberta mesmo a 100%. Com `stroke-dasharray` e
 * `stroke-dashoffset`, 100% zera o offset e o círculo fecha por completo.
 *
 * Mantido exportado para compatibilidade com telas e testes que ainda exibem a
 * completude do perfil fora do guia de boas-vindas.
 */
export function ProfileCompletenessRing({
  completeness,
}: ProfileCompletenessRingProps) {
  const value = Math.min(100, Math.max(0, completeness));
  const strokeDashoffset = PROGRESS_RING_CIRCUMFERENCE * (1 - value / 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Completude do perfil ministerial"
      className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-950/60 shadow-xl"
    >
      <svg
        className="absolute inset-0 size-full -rotate-90"
        viewBox="0 0 112 112"
        aria-hidden="true"
      >
        <circle
          cx="56"
          cy="56"
          r={PROGRESS_RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-emerald-500/30"
        />
        <circle
          cx="56"
          cy="56"
          r={PROGRESS_RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          className="text-emerald-400 transition-all duration-700 ease-out"
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold font-serif text-white">
          {value}%
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-300">
          Completo
        </span>
      </div>
    </div>
  );
}
