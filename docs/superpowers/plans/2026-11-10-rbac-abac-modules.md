# RBAC/ABAC e módulos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar permissões configuráveis por igreja e departamento, com papéis organizacionais do Better Auth, concessões individuais limitadas e autorização obrigatória no servidor.

**Architecture:** Better Auth continua sendo a fonte da sessão, igreja ativa e papel organizacional (`owner`, `admin`, `member`). Um catálogo finito no domínio define módulos, ações e defaults; tabelas próprias guardam disponibilidade por igreja, política por papel e concessões departamentais. Um avaliador server-only combina esses dados com vínculo e liderança departamental; páginas, consultas expostas e server actions chamam esse avaliador antes de ler ou alterar recursos. RLS segue responsável pelo isolamento entre igrejas.

**Tech Stack:** Next.js 16.4.5, React 19.3, Better Auth 1.7.18, Drizzle ORM, PostgreSQL/RLS, TypeScript, Bun e `bun:test`.

**Spec:** `docs/superpowers/specs/2026-11-10-permissions-modules-design.md`

## Global Constraints

- Better Auth mantém os papéis de igreja `owner`, `admin` e `member`; liderança continua contextual em `department_member.is_leader`, nunca um papel global.
- O catálogo inicial contém exatamente `agenda`, `schedules`, `music` e `announcements`; não aceitar módulos, recursos ou ações arbitrários do cliente.
- Módulo só pode ser usado quando disponível para a igreja e, quando a ação tiver escopo departamental, ativo no departamento consultado.
- Defaults: os quatro módulos ficam disponíveis para igrejas existentes e novas; `agenda`, `schedules` e `announcements` começam ativos em todos os departamentos; `music` continua opt-in por departamento; módulos futuros começam indisponíveis.
- Membro começa com leitura dos módulos; `music.createSong` é permitido por padrão a administrador e líder de departamento com Música ativa; criar não implica atualizar ou excluir.
- `schedules.manageOwnAvailability` é a exceção de autogerenciamento: membro pode editar apenas a própria disponibilidade; isso não concede leitura da disponibilidade de outras pessoas nem gestão de escalas.
- Concessões são aditivas, departamentais, limitadas às ações delegáveis do concedente e nunca substituem módulo desligado, vínculo com a igreja ou vínculo com o departamento.
- Funções departamentais não concedem permissões automaticamente. Líder não pode promover líderes, alterar política global ou administrar outro departamento.
- RLS continua isolando igrejas; rotas, consultas e mutações também exigem autorização de aplicação. Revogações e remoção de liderança devem surtir efeito sem aguardar expiração de cache.
- Antes de editar código Next.js, ler o guia relevante em `node_modules/next/dist/docs/` conforme `AGENTS.md`; não presumir APIs de Next.js de versões anteriores.
- Seguir Git Flow: branch de trabalho criada a partir de `develop`, commits Conventional Commits, merge `--no-ff` em `develop`; antes de concluir, executar `bun run lint`, `bun run typecheck` e `bun run build`.

## Review Focus

- Módulo global desligado não pode voltar a ser acessível por ativação local, política ou concessão — cobrir no avaliador e nos testes de configuração (Tasks 1, 3 e 4).
- ID de igreja/departamento/alvo enviado pelo navegador não pode cruzar escopo nem substituir o contexto Better Auth — cobrir em `can`, concessão e ações (Tasks 3, 5 e 10).
- Usuário líder em A e membro em B recebe papel efetivo por departamento; evento sem departamento não herda privilégios de liderança — cobrir na matriz ABAC e na autorização de eventos (Tasks 3 e 8).
- Concessão exige alvo membro do departamento, ação delegável e concedente autorizado; revogar deve negar imediatamente — cobrir em concessão, revogação e teste de integração (Tasks 5 e 11).
- Membro lê Música, mas não escreve; líder só cria com Música ativa no departamento liderado; `createSong` não libera edição/exclusão — cobrir no catálogo e nas ações diretas (Tasks 1 e 7).

---

### Task 1: Catálogo finito e matriz padrão de permissões

**Files:**
- Create: `src/lib/permissions/catalog.ts`
- Create: `src/lib/permissions/defaults.ts`
- Test: `src/lib/__tests__/permissions-catalog.test.ts`
- Modify: `src/lib/modules/types.ts`
- Modify: `src/lib/modules/registry.ts`

**Interfaces:**
- Produces `ModuleKey = "agenda" | "schedules" | "music" | "announcements"`, `PermissionRole = "admin" | "leader" | "member"`, `PermissionAction` e `PERMISSION_CATALOG`.
- Produces `DEFAULT_PERMISSION_POLICY` and `buildDefaultOrganizationPermissionRows(organizationId)` for repeatable policy seeding.
- Cada ação declara seu escopo (`organization`, `department` ou `self`) e se pode ser delegada. O registro de módulos associa os links existentes às chaves de módulo e adiciona os quatro módulos sem duplicar entradas de navegação.

- [x] **Step 1: Escrever testes falhos para o catálogo e defaults.** Nomear os testes `registersExactlyFourInitialModules`, `rejectsUnknownActions`, `memberDefaultsToReadModulesAndOwnAvailability`, `leaderMusicCreateDoesNotImplyOtherWrites` e `onlyDepartmentActionsAreDelegable`. Fixar as ações iniciais: agenda `read/createEvent/updateEvent/deleteEvent`; escalas `read/assign/editPlan/manageTemplates/manageOwnAvailability`; música `read/createSong/updateSong/deleteSong`; avisos `read/sendDepartment/sendPerson/sendAll/retryDelivery`. Defaults: admin todas; membro `read` em todos os módulos e `schedules.manageOwnAvailability`; líder, dentro de departamento liderado, agenda CRUD, escalas `read/assign/editPlan`, música `read/createSong`, avisos `read/sendDepartment/sendPerson`. Ações de igreja inteira (`manageTemplates`, `sendAll`, `retryDelivery`) e de autogerenciamento não são delegáveis.
- [x] **Step 2: Confirmar que os testes falham.** Executar `bun run test src/lib/__tests__/permissions-catalog.test.ts`; esperado: FAIL por catálogo/defaults ausentes ou incompletos.
- [x] **Step 3: Implementar catálogo e defaults.** Em `catalog.ts`, validar módulo/ação por união fechada e marcar `agenda` e `schedules` com suas ações departamentais; `music` é dado organizacional, logo `createSong` não é delegável individualmente nesta entrega. Deixar `announcements.sendDepartment` e `sendPerson` delegáveis; `sendAll` e `retryDelivery` não. Acrescentar a `SystemModule` um `routePrefixes` explícito: agenda (`/dashboard/calendar`, `/dashboard/events`), escalas (`/dashboard/schedules`, `/dashboard/availability`), música (`/dashboard/songs`), avisos (`/dashboard/announcements`).
- [x] **Step 4: Registrar os quatro módulos e rodar o teste.** Atualizar `ModuleKey`/`SYSTEM_MODULES` sem duplicar links comuns já declarados em `nav-config.ts`; executar `bun run test src/lib/__tests__/permissions-catalog.test.ts`; esperado: PASS.
- [x] **Step 5: Commit.** `git add src/lib/modules/types.ts src/lib/modules/registry.ts src/lib/permissions/catalog.ts src/lib/permissions/defaults.ts src/lib/__tests__/permissions-catalog.test.ts && git commit -m "feat: define permission and module catalog"`.

### Task 2: Persistência, RLS, migração e defaults de provisionamento

**Files:**
- Create: `src/db/schema/permissions.ts`
- Create: `src/lib/permissions/provisioning.ts`
- Test: `src/lib/__tests__/permission-defaults.test.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `src/db/schema/departments.ts`
- Modify: `src/app/actions/organization.ts`
- Modify: `src/app/actions/departments.ts`
- Modify: próxima migração Drizzle `src/db/migrations/0028_*.sql` e `src/db/migrations/meta/_journal.json`

**Interfaces:**
- Produces `src/lib/permissions/provisioning.ts` com `seedOrganizationPermissions(organizationId)` e `seedDepartmentModules(organizationId, departmentId)`, ambos idempotentes; `buildOrganizationModuleRows(organizationId)` e `buildDepartmentModuleRows(organizationId, departmentId)` são helpers puros testáveis sem banco.
- Tabelas: `organization_module` (`organization_id`, `module_key`, `enabled`); `organization_role_permission` (`organization_id`, `role`, `module_key`, `action`, `enabled`); `department_permission_grant` (`organization_id`, `department_id`, `grantee_user_id`, `module_key`, `action`, `granted_by_user_id`, `created_at`, `revoked_at`, `revoked_by_user_id`). Grants mantêm histórico; impor unicidade somente para grants ativos equivalentes e FK composta que impeça `department_id` de pertencer a outra igreja.

- [x] **Step 1: Escrever testes falhos para linhas padrão.** `organizationSeedContainsExactlyInitialModules`, `departmentSeedContainsOnlyCommonModules` e `futureModuleHasNoEnabledSeed`; afirmar exatamente os quatro módulos, os três módulos departamentais comuns e que `music` nunca aparece no seed de departamento. Idempotência real do seed é verificada pela integração da Task 11.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/permission-defaults.test.ts`; esperado: FAIL por funções/tabelas ausentes.
- [x] **Step 3: Criar schema e migração.** Gerar a migração com `bun run db:generate`, usando o índice seguinte (`0028`), e completar o SQL para criar tabelas, FKs, índices, unicidade de grants ativos e políticas RLS por `current_user_org_ids()`. Adicionar índice único em `(department.id, department.organization_id)` para a FK composta do grant. Backfill: quatro módulos disponíveis em organizações existentes; defaults de ações para os três papéis; adicionar `agenda`, `schedules` e `announcements` aos departamentos existentes; preservar todos os registros de `music` existentes.
- [x] **Step 4: Provisionar organizações e departamentos novos.** Implementar seeds idempotentes e chamá-los após `auth.api.createOrganization()` em `organization.ts` e após inserir departamento em `departments.ts`. Uma falha de seed deve retornar erro explícito; a repetição da ação não duplica registros.
- [x] **Step 5: Rodar testes e revisar migração.** Executar `bun run test src/lib/__tests__/permission-defaults.test.ts` (PASS), `bun run db:generate` (sem diff adicional após geração) e revisar o SQL para que as novas tabelas não removam nem achatem `department_module`.
- [x] **Step 6: Commit.** `git add src/db/schema/index.ts src/db/schema/departments.ts src/db/schema/permissions.ts src/db/migrations src/app/actions/organization.ts src/app/actions/departments.ts src/lib/permissions/provisioning.ts src/lib/__tests__/permission-defaults.test.ts && git commit -m "feat: persist organization and department permissions"`.

### Task 3: Avaliador central server-only

**Files:**
- Create: `src/lib/permissions/evaluator.ts`
- Create: `src/lib/permissions/service.ts`
- Test: `src/lib/__tests__/permissions.test.ts`

**Interfaces:**
- `evaluatePermission(snapshot: PermissionSnapshot): boolean` é puro e testável.
- `type PermissionScope = { departmentId?: string; eventId?: string; targetPersonId?: string }`.
- `can(moduleKey: ModuleKey, action: PermissionAction, scope?: PermissionScope): Promise<boolean>` e `requirePermission(moduleKey: ModuleKey, action: PermissionAction, scope?: PermissionScope): Promise<void>` obtêm usuário, igreja ativa e papel por `requireOrganizationContext()`; o serviço valida IDs contra a igreja ativa e deriva departamentos do evento no banco. Nenhuma API aceita `userId`, papel ou igreja confiados ao cliente.

- [x] **Step 1: Escrever testes falhos para a matriz RBAC/ABAC.** Nomear `deniesGloballyDisabledModule`, `requiresDepartmentMembershipAndLocalActivation`, `leaderIsScopedPerDepartment`, `memberCanReadMusicButCannotCreate`, `leaderCanCreateMusicOnlyInActiveLedDepartment`, `grantCannotOverrideDisabledModule`, `departmentlessEventDoesNotUseLeaderDefault` e `unknownActionIsDenied`. Incluir casos líder em A/membro em B, membro em departamento inativo e evento sem departamento.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/permissions.test.ts`; esperado: FAIL por avaliador ausente.
- [x] **Step 3: Implementar avaliador puro e serviço.** Política da igreja desligada é barreira absoluta para uso normal. Para ação com departamento, exigir que o departamento pertença à igreja ativa e que o módulo esteja localmente ativo para todos os papéis; admin pode dispensar o vínculo de membro, mas não a disponibilidade local. Para não-admin, resolver `leader` somente se `is_leader` naquele departamento; caso contrário usar política `member`. Ações `organization` e `self` também usam política `member` para não-admin; papel `leader` só é considerado com departamento explícito. Exceção funcional: `music.createSong`, embora grave dado organizacional, exige no servidor um departamento do usuário onde ele é líder e Música está ativa, ou papel admin. Concessões individuais só entram com departamento explícito. Usuário comum precisa pertencer a pelo menos um departamento ativo para usar uma ação não escopada; admin dispensa esse vínculo, mas não a disponibilidade global. Configurações de disponibilidade ficam fora desse gate global.
- [x] **Step 4: Não cachear decisões de autorização e rodar testes.** Consultar vínculo, policy, módulo e grant atuais diretamente; não usar o cache de listagem de departamentos para decisões. Executar `bun run test src/lib/__tests__/permissions.test.ts`; esperado: PASS.
- [x] **Step 5: Commit.** `git add src/lib/permissions src/lib/__tests__/permissions.test.ts && git commit -m "feat: add server-side permission evaluator"`.

### Task 4: Configuração global por igreja e papel

**Files:**
- Create: `src/app/actions/permissions.ts`
- Create: `src/components/settings/module-permissions-card.tsx`
- Modify: `src/app/(app)/dashboard/settings/page.tsx`
- Modify: `src/components/settings/settings-view.tsx`
- Test: `src/lib/__tests__/organization-permissions.test.ts`

**Interfaces:**
- `getOrganizationPermissionSettingsAction()`, `setOrganizationModuleEnabledAction(moduleKey, enabled)` e `setOrganizationRolePermissionAction(role, moduleKey, action, enabled)`; todas exigem `isAdmin` derivado do contexto Better Auth.
- A tela permite configurar as ações aplicáveis a `admin`, `leader` e `member`, mas só o administrador pode ler/alterar a política global; para escopos `organization` e `self`, a linha `leader` informa que a política `member` é aplicada, sem criar autoridade global para liderança.

- [x] **Step 1: Escrever testes falhos.** `nonAdminCannotReadGlobalPolicy`, `nonAdminCannotChangeOrganizationModule`, `nonAdminCannotChangeRolePolicy`, `unknownModuleOrActionIsRejected`, `disablingChurchModulePreservesDepartmentChoice` e `settingsCanReenableDisabledModule`; verificar que a escolha local não é apagada ao desligar a disponibilidade global.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/organization-permissions.test.ts`; esperado: FAIL.
- [x] **Step 3: Implementar ações server-side.** Validar cada chave no catálogo; exigir administrador para qualquer escrita; nunca aceitar role/org ID como fonte de autorização. Ao gravar, invalidar tags `permissions:<organizationId>`, `modules:<organizationId>` e departamentos relacionados.
- [x] **Step 4: Adicionar card administrativo às configurações.** Mostrar disponibilidade por igreja separada da ativação departamental e a matriz por papel; manter a tela acessível para reativar módulos desligados. Ler o guia Next.js relevante em `node_modules/next/dist/docs/` antes de alterar APIs de página/servidor.
- [x] **Step 5: Rodar testes e commit.** `bun run test src/lib/__tests__/organization-permissions.test.ts`; esperado: PASS. Commit: `git add src/app/actions/permissions.ts src/components/settings/module-permissions-card.tsx src/app/\(app\)/dashboard/settings/page.tsx src/components/settings/settings-view.tsx src/lib/__tests__/organization-permissions.test.ts && git commit -m "feat: add church permission settings"`.

### Task 5: Ativação departamental e concessões individuais auditáveis

**Files:**
- Create: `src/app/actions/department-permissions.ts`
- Create: `src/components/departments/department-permissions-section.tsx`
- Test: `src/lib/__tests__/department-permissions.test.ts`
- Modify: `src/app/actions/modules.ts`
- Modify: `src/lib/modules/service.ts`
- Modify: `src/app/(app)/dashboard/departments/[departmentId]/page.tsx`
- Modify: `src/components/departments/department-modules-section.tsx`

**Interfaces:**
- `grantDepartmentPermissionAction({ departmentId, userId, moduleKey, action })` e `revokeDepartmentPermissionAction({ grantId })` resolvem identidade no servidor e persistem autoria/revogação.
- A seção departamental mostra módulo globalmente indisponível, defaults herdados, grants ativos, quem concedeu e quando; admin ou líder daquele departamento pode administrá-la.

- [x] **Step 1: Escrever testes falhos.** `leaderCanToggleOwnDepartmentModule`, `adminCanToggleDepartmentModule`, `leaderCannotChangeOtherDepartment`, `grantTargetMustBelongToDepartment`, `grantorMustHaveDelegablePermission`, `cannotGrantNonDelegableMusicWrite`, `crossOrganizationDepartmentIdIsRejected`, `revokedGrantStopsApplyingImmediately` e `localToggleDoesNotEnableChurchModule`.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/department-permissions.test.ts`; esperado: FAIL.
- [x] **Step 3: Proteger toggle local e implementar grants.** Validar módulo no catálogo e impedir que toggle local altere disponibilidade da igreja. Exigir admin ou líder contextual; alvo precisa ser membro do departamento na igreja ativa; ação precisa estar marcada delegável e o concedente precisa poder delegá-la nesse escopo. Revogar por `revoked_at`/`revoked_by_user_id`, sem apagar histórico. Grants mantêm-se inefetivos enquanto módulo global/local estiver desligado.
- [x] **Step 4: Adicionar controles à página departamental.** Reusar padrões existentes de `DepartmentModulesSection` e `PeopleSection`; não exibir funções departamentais como permissões. Exibir a herança separadamente dos grants individuais.
- [x] **Step 5: Rodar testes e commit.** `bun run test src/lib/__tests__/department-permissions.test.ts`; esperado: PASS. Commit: `git add src/app/actions/modules.ts src/app/actions/department-permissions.ts src/components/departments/department-permissions-section.tsx src/components/departments/department-modules-section.tsx src/app/\(app\)/dashboard/departments/\[departmentId\]/page.tsx src/lib/__tests__/department-permissions.test.ts && git commit -m "feat: add department permission grants"`.

### Task 6: Navegação e affordances refletindo permissões efetivas

**Files:**
- Modify: `src/lib/modules/nav.ts`
- Modify: `src/lib/modules/service.ts`
- Modify: `src/components/app/nav-config.ts`
- Modify: `src/components/app/app-sidebar-loader.tsx`
- Modify: `src/components/app/mobile-menu-loader.tsx`
- Create: `src/components/app/mobile-nav-loader.tsx`
- Modify: `src/components/app/mobile-nav.tsx`
- Modify: `src/components/app/mobile-nav-shell.tsx`
- Modify: `src/app/(app)/dashboard/layout.tsx`
- Test: `src/lib/__tests__/modules.test.ts`

- [x] **Step 1: Adicionar testes falhos** `hidesRoutesForUnavailableModules`, `keepsSettingsAccessibleWhenModuleIsOff` e `mobileNavigationUsesSameAccessProjection`; provar que esconder links é apenas apresentação e não substitui guarda de rota/ação.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/modules.test.ts`; esperado: FAIL nos novos casos.
- [x] **Step 3: Construir projeção server-side de navegação.** Carregar módulos/acessos pela mesma política do avaliador; filtrar agenda, escalas, músicas e avisos sem duplicar links base. `MobileNavLoader` deriva os itens permitidos no servidor e os passa a `MobileNav`/`MobileNavShell`. Preservar settings e notificações pessoais; a navegação é somente apresentação, não guarda de segurança.
- [x] **Step 4: Rodar testes e commit.** `bun run test src/lib/__tests__/modules.test.ts`; esperado: PASS. Commit: `git add src/lib/modules/nav.ts src/lib/modules/service.ts src/components/app/nav-config.ts src/components/app/app-sidebar-loader.tsx src/components/app/mobile-menu-loader.tsx src/components/app/mobile-nav-loader.tsx src/components/app/mobile-nav.tsx src/components/app/mobile-nav-shell.tsx src/app/\(app\)/dashboard/layout.tsx src/lib/__tests__/modules.test.ts && git commit -m "feat: reflect permissions in app navigation"`.

### Task 7: Proteção do módulo Música

**Files:**
- Modify: `src/lib/songs.ts`
- Modify: `src/app/actions/songs.ts`
- Modify: `src/app/(app)/dashboard/songs/page.tsx`
- Modify: `src/app/(app)/dashboard/songs/[songId]/page.tsx`
- Modify: `src/components/songs/songs-list-view.tsx`
- Modify: `src/components/songs/add-song-choice-dialog.tsx`
- Modify: `src/components/songs/song-form-dialog.tsx`
- Modify: `src/components/songs/online-search-dialog.tsx`
- Modify: `src/components/songs/song-detail-header-actions.tsx`
- Modify: `src/components/songs/delete-song-dialog.tsx`
- Test: `src/lib/__tests__/music-permissions.test.ts`

- [x] **Step 1: Escrever testes falhos.** `memberCanListSongs`, `memberCannotCreateSongByCallingActionDirectly`, `leaderCanCreateOnlyWithActiveMusicDepartment`, `createDoesNotImplyUpdateOrDelete` e `disabledChurchMusicBlocksReadsAndWrites`.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/music-permissions.test.ts`; esperado: FAIL.
- [x] **Step 3: Guardar leituras e mutações.** Proteger páginas/listas/detalhes e ações `searchOnlineSongsAction`, `fetchLyricsDetailsAction`, `createSongAction`, `updateSongAction` e `deleteSongAction`. Criação exige `music.createSong`; atualização/exclusão exigem suas próprias ações. Como `song` é organizacional e não tem `department_id`, grants individuais de escrita musical ficam indisponíveis; liderança padrão só autoriza criação quando existe departamento liderado com Música ativa.
- [x] **Step 4: Ajustar affordances e testar.** Passar capacidades calculadas no servidor para exibir/ocultar botões de criar/editar/excluir; manter negação nas ações diretas. Executar `bun run test src/lib/__tests__/music-permissions.test.ts`; esperado: PASS.
- [x] **Step 5: Commit.** `git add src/lib/songs.ts src/app/actions/songs.ts src/app/\(app\)/dashboard/songs/page.tsx src/app/\(app\)/dashboard/songs/\[songId\]/page.tsx src/components/songs/songs-list-view.tsx src/components/songs/add-song-choice-dialog.tsx src/components/songs/song-form-dialog.tsx src/components/songs/online-search-dialog.tsx src/components/songs/song-detail-header-actions.tsx src/components/songs/delete-song-dialog.tsx src/lib/__tests__/music-permissions.test.ts && git commit -m "feat: enforce music permissions"`.

### Task 8: Proteção de agenda e eventos

**Files:**
- Modify: `src/app/actions/events.ts`
- Modify: `src/app/actions/calendar.ts`
- Modify: `src/app/(app)/dashboard/calendar/page.tsx`
- Modify: `src/app/(app)/dashboard/events/page.tsx`
- Modify: `src/app/(app)/dashboard/events/[eventId]/page.tsx`
- Test: `src/lib/__tests__/agenda-permissions.test.ts`

- [x] **Step 1: Escrever testes falhos.** `leaderCanManageEventsOnlyInLedDepartments`, `leaderCannotEditAnotherDepartmentEvent`, `unauthorizedDirectEventActionIsDenied`, `unscopedEventUsesOrganizationPolicy`, `submittedDepartmentMustBelongToActiveChurch` e `disabledAgendaBlocksReadsAndWrites`.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/agenda-permissions.test.ts`; esperado: FAIL.
- [x] **Step 3: Proteger ações e páginas de evento.** Aplicar `agenda` em `createEventAction`, `updateEventAction` e `deleteEventAction`; validar no servidor cada ID de evento e departamento. Para criar/alterar evento vinculado a departamentos, líder precisa ter escopo em cada departamento informado; evento sem departamento não herda privilégios de liderança. Proteger carregamento de `/dashboard/calendar`, `/dashboard/events` e a leitura base do detalhe.
- [x] **Step 4: Rodar testes e commit.** `bun run test src/lib/__tests__/agenda-permissions.test.ts`; esperado: PASS. Commit: `git add src/app/actions/events.ts src/app/actions/calendar.ts src/app/\(app\)/dashboard/calendar/page.tsx src/app/\(app\)/dashboard/events/page.tsx src/app/\(app\)/dashboard/events/\[eventId\]/page.tsx src/lib/__tests__/agenda-permissions.test.ts && git commit -m "feat: enforce agenda permissions"`.

### Task 9: Proteção de escalas, planos e disponibilidade

**Files:**
- Modify: `src/app/actions/events.ts`
- Modify: `src/app/actions/availability.ts`
- Modify: `src/app/(app)/dashboard/schedules/page.tsx`
- Modify: `src/app/(app)/dashboard/availability/page.tsx`
- Modify: `src/app/(app)/dashboard/events/[eventId]/page.tsx`
- Test: `src/lib/__tests__/schedule-permissions.test.ts`

- [x] **Step 1: Escrever testes falhos.** `leaderCanManageScheduleForEventLinkedToLedDepartment`, `leaderCannotManageScheduleForUnlinkedEvent`, `unauthorizedDirectScheduleMutationIsDenied`, `eventWithoutDepartmentDoesNotGrantScheduleManagement`, `availabilityActionsAreBoundToActiveChurchAndOwnPerson` e `publicShareTokenRemainsIndependentOfDashboardSession`.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/schedule-permissions.test.ts`; esperado: FAIL.
- [x] **Step 3: Proteger ações de escala.** Aplicar `schedules` em `saveScheduleAssignmentAction`, `removeScheduleAssignmentAction`, `createPlanItemAction`, `updatePlanItemAction`, `deletePlanItemAction`, `reorderPlanItemsAction`, `savePlanAsTemplateAction`, `listPlanTemplatesAction`, `applyPlanTemplateAction`, `deletePlanTemplateAction`, `clearEventPlanAction`, `importPlanItemsAction`, `getEventPublicShareInfoAction`, `toggleEventPublicShareAction` e `regenerateEventPublicShareTokenAction`, além de leituras que retornam dados de escala. `listPlanTemplatesAction` exige `schedules.read`; templates permanecem organizacionais e `savePlanAsTemplateAction`/`deletePlanTemplateAction` exigem `schedules.manageTemplates`; aplicar/importar/alterar plano e compartilhar exige `schedules.editPlan` no evento. Para mudança de escala, preservar a regra aprovada: evento associado a pelo menos um departamento liderado; evento sem departamento não herda liderança. Validar IDs de evento, departamento, função e pessoa no servidor. 
- [x] **Step 4: Guardar disponibilidade e páginas.** Proteger `getPersonAvailabilityAction`, `checkPersonAvailabilityForEventAction` e `getEventUnavailablePeopleAction` com igreja/evento corretos e `schedules.read`; validar que qualquer pessoa consultada pertence à igreja ativa. `getMyAvailabilityAction`, `saveMyAvailabilityAction`, `getMyUnavailabilitiesAction`, `saveUnavailabilityAction` e `deleteUnavailabilityAction` exigem `schedules.manageOwnAvailability`, usam o usuário da sessão e só acessam dados da própria pessoa. `/dashboard/schedules` exige `schedules.read`; `/dashboard/availability` exige `manageOwnAvailability`. A página pública `src/app/share/cronograma/[token]/page.tsx` continua acessível por token válido; não confiar nela como acesso ao dashboard.
- [x] **Step 5: Rodar testes e commit.** `bun run test src/lib/__tests__/schedule-permissions.test.ts`; esperado: PASS. Commit: `git add src/app/actions/events.ts src/app/actions/availability.ts src/app/\(app\)/dashboard/schedules/page.tsx src/app/\(app\)/dashboard/availability/page.tsx src/app/\(app\)/dashboard/events/\[eventId\]/page.tsx src/lib/__tests__/schedule-permissions.test.ts && git commit -m "feat: enforce schedule permissions"`.

### Task 10: Proteção de avisos e delegação por audiência

**Files:**
- Modify: `src/app/actions/notifications.ts`
- Modify: `src/app/(app)/dashboard/announcements/page.tsx`
- Modify: `src/app/(app)/dashboard/notifications/page.tsx`
- Modify: `src/components/announcements/announcements-console.tsx`
- Modify: `src/components/announcements/sent-announcements-list.tsx`
- Modify: `src/components/notifications/announcement-dialog.tsx`
- Test: `src/lib/__tests__/announcement-permissions.test.ts`

- [x] **Step 1: Escrever testes falhos.** `leaderCanSendToLedDepartment`, `leaderCannotSendToAllChurch`, `leaderCannotSendToPersonOutsideLedDepartment`, `nonAdminCannotRetryChurchDelivery` e `personalNotificationReadDoesNotRequireAnnouncementModule`.
- [x] **Step 2: Confirmar falha.** Executar `bun run test src/lib/__tests__/announcement-permissions.test.ts`; esperado: FAIL.
- [x] **Step 3: Guardar ações por audiência.** `sendAnnouncementAction` exige `sendAll` para audiência igreja inteira, `sendDepartment` para departamento e `sendPerson` para pessoa validada como membro daquele departamento; conferir igreja ativa e módulo antes de despachar. `retryAnnouncementWhatsAppAction` e `retryAnnouncementSingleWhatsAppAction` exigem `retryDelivery`. Preservar leitura/marcação de notificações pessoais do próprio usuário como função central, sem exigir acesso ao módulo de avisos.
- [x] **Step 4: Guardar páginas e affordances; rodar teste.** Proteger console/lista de avisos por `announcements.read` e controles de envio por suas ações; manter a página de notificações pessoais acessível e sem exigir módulo para listar/marcar as próprias notificações. Executar `bun run test src/lib/__tests__/announcement-permissions.test.ts`; esperado: PASS.
- [x] **Step 5: Commit.** `git add src/app/actions/notifications.ts src/app/\(app\)/dashboard/announcements/page.tsx src/app/\(app\)/dashboard/notifications/page.tsx src/components/announcements/announcements-console.tsx src/components/announcements/sent-announcements-list.tsx src/components/notifications/announcement-dialog.tsx src/lib/__tests__/announcement-permissions.test.ts && git commit -m "feat: enforce announcement permissions"`.

### Task 11: Testes integrados, auditoria de cobertura e verificação final

**Files:**
- Create: `src/lib/__tests__/permissions.integration.test.ts`
- Create: `scripts/permissions-smoke-test.mjs`
- Revisar todas as páginas e server actions dos quatro módulos listadas nas Tasks 7–10.

- [x] **Step 1: Implementar integração com banco descartável.** Rodar somente quando `TEST_DATABASE_URL` estiver definido; atribuí-lo a `DATABASE_URL` antes de importar `src/db`, sem fallback para `DATABASE_URL` do ambiente. Criar igreja/departamentos/usuários isolados com IDs únicos, aplicar migrações e testar defaults de dados antigos/novos, isolamento RLS entre igrejas, ativação global/local, seeds idempotentes, grants e revogação. Garantir limpeza das fixtures mesmo em falha.
- [x] **Step 2: Fazer auditoria de cobertura.** Procurar por todos os usos das actions listadas nas Tasks 7–10 e confirmar que rotas, loaders e chamadas diretas passam pelo serviço central. Confirmar que nenhuma função departamental vira permissão e que a UI não é o único controle.
- [x] **Step 3: Rodar a suíte.** Executar `bun run test`; com `TEST_DATABASE_URL`, executar também `DATABASE_URL="$TEST_DATABASE_URL" bun run test src/lib/__tests__/permissions.integration.test.ts` e `TEST_DATABASE_URL="$TEST_DATABASE_URL" bun scripts/permissions-smoke-test.mjs`. Esperado: PASS; sem URL de teste, a integração deve informar skip explícito, nunca acessar banco de produção.
- [x] **Step 4: Rodar verificações obrigatórias.** Executar `bun run lint`, `bun run typecheck` e `bun run build`; resolver qualquer falha antes de concluir.
- [x] **Step 5: Commit final.** `git add src/lib/__tests__/permissions.integration.test.ts scripts/permissions-smoke-test.mjs && git commit -m "test: verify permission boundaries and revocation"`.

## Autorrevisão do plano

- **Cobertura da spec:** disponibilidade por igreja e departamento (Tasks 2, 4 e 5); papéis e defaults (Tasks 1–4); concessões, limites e auditoria (Tasks 2, 3 e 5); guards em rotas/consultas/mutações (Tasks 6–10); RLS e compatibilidade (Tasks 2 e 11); cache/revogação imediata (Tasks 3–5).
- **Consistência de tipos:** `ModuleKey`, `PermissionRole`, `PermissionAction` e catálogo são definidos na Task 1; tabelas/defaults na Task 2; `can`/`requirePermission` na Task 3; todas as tasks seguintes consomem essas interfaces.
- **Riscos conhecidos cobertos:** escopo cruzado, evento sem departamento, leitura versus escrita musical, desligamento global, grants não delegáveis e revogação imediata têm testes nomeados nas tasks proprietárias.
- **Proporção:** o plano mantém uma tarefa por limite revisável e não descreve corpos de implementação além das decisões de segurança necessárias para remover ambiguidades da spec.
