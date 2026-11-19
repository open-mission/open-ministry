/**
 * Notas por seção: chave estável da seção (`refrao#1`) → texto livre.
 */
export type SongSectionNoteMap = Record<string, string>;

export type DepartmentOption = {
  id: string;
  name: string;
};

export type DepartmentFunctionOption = {
  id: string;
  name: string;
};

/**
 * Arranjo de uma música por departamento. Espelha o contrato devolvido por
 * `getSongArrangementsAction` (o backend já filtra os departamentos acessíveis
 * e popula `functions` com as funções do departamento).
 */
export type DepartmentArrangement = {
  departmentId: string;
  departmentName: string;
  notes: SongSectionNoteMap;
  selectedFunctionIds: string[];
  functions?: DepartmentFunctionOption[];
};

/**
 * Filtro de defesa em profundidade: o servidor já devolve apenas departamentos
 * acessíveis, mas o cliente só exibe os IDs informados quando a lista existe.
 * Sem lista (`undefined`) mantém o retorno do servidor intacto.
 */
export function filterAccessibleDepartments(
  departments: DepartmentArrangement[],
  accessibleDepartmentIds?: string[],
): DepartmentArrangement[] {
  if (!accessibleDepartmentIds) return departments;

  const accessible = new Set(accessibleDepartmentIds);
  return departments.filter((department) =>
    accessible.has(department.departmentId),
  );
}

/**
 * Só expõe os arranjos quando a requisição atual já terminou. Durante a troca de
 * música evita mostrar as notas da música anterior sob as seções da nova.
 */
export function getLoadedDepartments(
  departments: DepartmentArrangement[],
  requestKey: string | null,
  loadedKey: string | null,
): DepartmentArrangement[] {
  return requestKey !== null && requestKey === loadedKey ? departments : [];
}
