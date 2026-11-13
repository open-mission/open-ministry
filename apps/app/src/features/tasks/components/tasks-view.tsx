"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquareIcon,
  FilterIcon,
  KanbanIcon,
  ListIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  TableIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageInfo } from "@/components/app/page-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTaskAction } from "../actions/tasks.actions";
import {
  resolveTaskCapabilities,
  type TaskCapabilities,
  type TaskPermissionContext,
} from "../lib/task-permissions";
import type { TaskItem, TaskScope, TaskStatus } from "../services/tasks-service";
import { TaskAuditHistoryDialog } from "./task-audit-history-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { TasksKanbanView } from "./tasks-kanban-view";
import { TasksListView } from "./tasks-list-view";
import { TasksTableView } from "./tasks-table-view";

type DepartmentOption = {
  id: string;
  name: string;
};

type MemberOption = {
  id?: string;
  userId: string;
  personId?: string;
  name: string;
  email?: string | null;
};

type ViewMode = "list" | "table" | "kanban";
type TasksTab = "personal" | "delegated" | "department" | "all";
type StatusFilter = "active" | "completed" | "canceled" | "all";

type TasksViewProps = {
  initialTasks: TaskItem[];
  departments?: DepartmentOption[];
  members?: MemberOption[];
  currentUserId: string;
  isAdmin?: boolean;
  ledDepartmentIds?: string[];
  memberDepartmentIds?: string[];
  canDelegateDepartment?: boolean;
  canDelegateChurch?: boolean;
  initialTab?: TasksTab;
  initialTaskId?: string;
};

function matchesTaskTab(task: TaskItem, tab: TasksTab, userId: string): boolean {
  if (tab === "personal") {
    return (
      (task.createdById === userId && task.scope === "personal") ||
      task.assigneeId === userId
    );
  }
  if (tab === "delegated") {
    return (
      task.createdById === userId &&
      ((task.assigneeId !== null && task.assigneeId !== userId) ||
        task.departmentId !== null ||
        task.scope === "organization")
    );
  }
  if (tab === "department") {
    return task.departmentId !== null || task.scope === "organization";
  }
  return true;
}

export function TasksView({
  initialTasks,
  departments = [],
  members = [],
  currentUserId,
  isAdmin = false,
  ledDepartmentIds = [],
  memberDepartmentIds = [],
  canDelegateDepartment = false,
  canDelegateChurch = false,
  initialTab,
  initialTaskId,
}: TasksViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [quickTitle, setQuickTitle] = useState("");
  const [isQuickPending, startQuickTransition] = useTransition();

  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const resolvedInitialTab: TasksTab = useMemo(() => {
    if (
      initialTab === "all" &&
      (isAdmin || canDelegateChurch)
    ) {
      return "all";
    }
    if (initialTab === "department" && departments.length > 0) {
      return "department";
    }
    if (initialTab === "delegated" || initialTab === "personal") {
      return initialTab;
    }
    return "personal";
  }, [initialTab, isAdmin, canDelegateChurch, departments.length]);

  const [activeTab, setActiveTab] = useState<TasksTab>(resolvedInitialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("tasks_view_mode") as ViewMode | null;
      if (saved === "list" || saved === "table" || saved === "kanban") {
        return saved;
      }
    }
    return "list";
  });

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [defaultCreateStatus, setDefaultCreateStatus] = useState<TaskStatus>("todo");
  const initialDeepLinkedTask = initialTaskId
    ? initialTasks.find((t) => t.id === initialTaskId) ?? null
    : null;
  const [detailOpen, setDetailOpen] = useState(Boolean(initialDeepLinkedTask));
  const [selectedTaskForDetail, setSelectedTaskForDetail] =
    useState<TaskItem | null>(initialDeepLinkedTask);
  const [auditOpen, setAuditOpen] = useState(false);
  const [taskForAudit, setTaskForAudit] = useState<TaskItem | null>(null);

  const [prevInitialTaskId, setPrevInitialTaskId] = useState(initialTaskId);
  if (initialTaskId !== prevInitialTaskId) {
    setPrevInitialTaskId(initialTaskId);
    const match = initialTaskId
      ? initialTasks.find((t) => t.id === initialTaskId) ?? null
      : null;
    if (match) {
      setSelectedTaskForDetail(match);
      setDetailOpen(true);
    }
  }

  const actorContext = useMemo<TaskPermissionContext>(
    () => ({
      userId: currentUserId,
      isAdmin,
      ledDepartmentIds,
      memberDepartmentIds,
      canCreateOrganization: canDelegateChurch,
    }),
    [
      currentUserId,
      isAdmin,
      ledDepartmentIds,
      memberDepartmentIds,
      canDelegateChurch,
    ],
  );

  const capabilitiesByTaskId = useMemo<Record<string, TaskCapabilities>>(() => {
    const map: Record<string, TaskCapabilities> = {};
    for (const task of tasks) {
      map[task.id] = resolveTaskCapabilities(task, actorContext);
    }
    return map;
  }, [tasks, actorContext]);

  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tasks_view_mode", mode);
    }
  };

  // Contadores de tarefas ativas por aba (excluindo filhas quando pai está presente)
  const tabActiveCounts = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.id));
    const isTopLevelActive = (t: TaskItem) =>
      !(t.parentTaskId && ids.has(t.parentTaskId)) &&
      (t.status === "todo" || t.status === "in_progress");

    return {
      personal: tasks.filter(
        (t) => isTopLevelActive(t) && matchesTaskTab(t, "personal", currentUserId),
      ).length,
      delegated: tasks.filter(
        (t) => isTopLevelActive(t) && matchesTaskTab(t, "delegated", currentUserId),
      ).length,
      department: tasks.filter(
        (t) => isTopLevelActive(t) && matchesTaskTab(t, "department", currentUserId),
      ).length,
      all: tasks.filter((t) => isTopLevelActive(t)).length,
    };
  }, [tasks, currentUserId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!matchesTaskTab(task, activeTab, currentUserId)) {
        return false;
      }

      if (statusFilter === "active") {
        if (task.status === "completed" || task.status === "canceled") {
          return false;
        }
      } else if (statusFilter === "completed") {
        if (task.status !== "completed") return false;
      } else if (statusFilter === "canceled") {
        if (task.status !== "canceled") return false;
      }

      if (selectedDeptId !== "all" && task.departmentId !== selectedDeptId) {
        return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q) ?? false;
        const assigneeMatch =
          task.assignee?.name?.toLowerCase().includes(q) ?? false;
        const tagsMatch =
          task.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!titleMatch && !descMatch && !assigneeMatch && !tagsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, activeTab, statusFilter, selectedDeptId, searchQuery, currentUserId]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "active" ||
    selectedDeptId !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("active");
    setSelectedDeptId("all");
  };

  const handleTaskUpdated = (updated: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTaskForDetail?.id === updated.id) {
      setSelectedTaskForDetail(updated);
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) =>
      prev.filter((t) => t.id !== taskId && t.parentTaskId !== taskId),
    );
    if (selectedTaskForDetail?.id === taskId) {
      setDetailOpen(false);
      setSelectedTaskForDetail(null);
    }
  };

  const handleOpenAudit = (task: TaskItem) => {
    setTaskForAudit(task);
    setAuditOpen(true);
  };

  const handleView = (task: TaskItem) => {
    setSelectedTaskForDetail(task);
    setDetailOpen(true);
  };

  const handleEdit = (task: TaskItem) => {
    setTaskToEdit(task);
    setDefaultCreateStatus((task.status as TaskStatus) ?? "todo");
    setFormOpen(true);
  };

  const handleNewTask = (status: TaskStatus = "todo") => {
    setTaskToEdit(null);
    setDefaultCreateStatus(status);
    setFormOpen(true);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickTitle.trim();
    if (!clean || isQuickPending) return;

    const createAsDepartment =
      activeTab === "department" &&
      selectedDeptId !== "all" &&
      canDelegateDepartment;

    const scope: TaskScope = createAsDepartment ? "department" : "personal";

    startQuickTransition(async () => {
      const res = await createTaskAction({
        title: clean,
        scope,
        departmentId: createAsDepartment ? selectedDeptId : null,
        assigneeId: createAsDepartment ? null : currentUserId,
        delegationType: createAsDepartment ? "shared" : "single",
        status: "todo",
      });

      if (res.ok) {
        setQuickTitle("");
        if (res.data.task) {
          setTasks((prev) => [res.data.task!, ...prev]);
        } else {
          router.refresh();
        }
        toast.success("Tarefa adicionada.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const defaultFormScope: TaskScope =
    activeTab === "department" && canDelegateDepartment && departments.length > 0
      ? "department"
      : "personal";

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Tarefas
            </h1>
            <PageInfo
              title="Módulo de Tarefas"
              description={
                <>
                  <p>
                    Organize suas tarefas pessoais, estudos e preparações para
                    os cultos em um só lugar.
                  </p>
                  <p className="mt-2">
                    Líderes e administradores podem delegar atividades para um
                    membro específico ou para todo um departamento, com lembretes
                    automáticos e histórico de alterações.
                  </p>
                </>
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {tabActiveCounts[activeTab]}{" "}
            {tabActiveCounts[activeTab] === 1
              ? "tarefa ativa nesta visão"
              : "tarefas ativas nesta visão"}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => handleNewTask("todo")}
          className="min-h-[44px] gap-1.5 self-start shadow-xs sm:min-h-[38px] sm:self-auto"
        >
          <PlusIcon className="size-4" />
          Nova tarefa
        </Button>
      </header>

      {/* Captura rápida inline */}
      <form
        onSubmit={handleQuickAdd}
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <PlusIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={
              activeTab === "department" &&
              selectedDeptId !== "all" &&
              canDelegateDepartment
                ? "Adicionar tarefa rápida neste departamento..."
                : "Adicionar tarefa rápida para mim..."
            }
            aria-label="Título da tarefa rápida"
            className="min-h-[44px] bg-card pl-10"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={!quickTitle.trim() || isQuickPending}
          className="min-h-[44px] shrink-0 sm:px-5"
        >
          {isQuickPending ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Adicionando...
            </>
          ) : (
            "Adicionar rápido"
          )}
        </Button>
      </form>

      {/* Abas e Controles */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as TasksTab)}
            className="w-full sm:w-auto"
          >
            <TabsList className="flex w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="personal" className="shrink-0 px-3 text-xs">
                Minhas ({tabActiveCounts.personal})
              </TabsTrigger>
              <TabsTrigger value="delegated" className="shrink-0 px-3 text-xs">
                Delegadas ({tabActiveCounts.delegated})
              </TabsTrigger>
              {departments.length > 0 ? (
                <TabsTrigger
                  value="department"
                  className="shrink-0 px-3 text-xs"
                >
                  Departamento ({tabActiveCounts.department})
                </TabsTrigger>
              ) : null}
              {isAdmin || canDelegateChurch ? (
                <TabsTrigger value="all" className="shrink-0 px-3 text-xs">
                  Todas ({tabActiveCounts.all})
                </TabsTrigger>
              ) : null}
            </TabsList>
          </Tabs>

          {/* Alternador de visualização */}
          <div
            role="group"
            aria-label="Modo de visualização"
            className="flex shrink-0 items-center gap-1 self-end rounded-xl border bg-muted/30 p-1 sm:self-auto"
          >
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              aria-pressed={viewMode === "list"}
              onClick={() => handleChangeViewMode("list")}
              className="min-h-[38px] gap-1.5 px-3 text-xs sm:min-h-[32px]"
            >
              <ListIcon className="size-3.5" />
              <span>Lista</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              aria-pressed={viewMode === "kanban"}
              onClick={() => handleChangeViewMode("kanban")}
              className="min-h-[38px] gap-1.5 px-3 text-xs sm:min-h-[32px]"
            >
              <KanbanIcon className="size-3.5" />
              <span>Quadro</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              aria-pressed={viewMode === "table"}
              onClick={() => handleChangeViewMode("table")}
              className="min-h-[38px] gap-1.5 px-3 text-xs sm:min-h-[32px]"
            >
              <TableIcon className="size-3.5" />
              <span>Tabela</span>
            </Button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <search className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por título, observação, pessoa ou etiqueta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar tarefas"
              className="min-h-[44px] bg-card pl-9 sm:min-h-[38px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filtrar por situação"
              className="min-h-[44px] w-full bg-card text-xs sm:min-h-[38px] sm:w-auto"
            >
              <option value="active">Situação: Ativas</option>
              <option value="completed">Situação: Concluídas</option>
              <option value="canceled">Situação: Canceladas</option>
              <option value="all">Situação: Todas</option>
            </NativeSelect>

            {departments.length > 0 &&
            (activeTab === "department" || activeTab === "all") ? (
              <div className="flex w-full items-center gap-1.5 sm:w-auto">
                <FilterIcon className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
                <NativeSelect
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  aria-label="Filtrar por departamento"
                  className="min-h-[44px] w-full bg-card text-xs sm:min-h-[38px] sm:w-auto"
                >
                  <option value="all">Todos departamentos</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
          </div>
        </search>
      </div>

      {/* Área de Conteúdo */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/15 py-14 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckSquareIcon className="size-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-semibold">
            {hasActiveFilters
              ? "Nenhuma tarefa encontrada"
              : "Tudo em dia por aqui"}
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Nenhuma tarefa corresponde à busca ou aos filtros selecionados."
              : "Crie sua primeira tarefa ou delegue uma atividade para organizar sua equipe."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                className="min-h-[44px] sm:min-h-[36px]"
              >
                Limpar filtros
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => handleNewTask("todo")}
              className="min-h-[44px] gap-1.5 sm:min-h-[36px]"
            >
              <PlusIcon className="size-4" />
              Criar tarefa
            </Button>
          </div>
        </div>
      ) : viewMode === "list" ? (
        <TasksListView
          tasks={filteredTasks}
          capabilitiesByTaskId={capabilitiesByTaskId}
          onView={handleView}
          onEdit={handleEdit}
          onOpenAudit={handleOpenAudit}
          onDelete={handleTaskDeleted}
          onTaskUpdated={handleTaskUpdated}
        />
      ) : viewMode === "kanban" ? (
        <TasksKanbanView
          tasks={filteredTasks}
          capabilitiesByTaskId={capabilitiesByTaskId}
          onView={handleView}
          onEdit={handleEdit}
          onOpenAudit={handleOpenAudit}
          onDelete={handleTaskDeleted}
          onTaskUpdated={handleTaskUpdated}
          onNewTask={(status) => handleNewTask(status ?? "todo")}
        />
      ) : (
        <TasksTableView
          tasks={filteredTasks}
          capabilitiesByTaskId={capabilitiesByTaskId}
          onView={handleView}
          onEdit={handleEdit}
          onOpenAudit={handleOpenAudit}
          onDelete={handleTaskDeleted}
          onTaskUpdated={handleTaskUpdated}
        />
      )}

      {/* Formulário Criação / Edição */}
      <TaskFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setTaskToEdit(null);
        }}
        onSuccess={(savedTask, count) => {
          if (savedTask) {
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === savedTask.id);
              return exists
                ? prev.map((t) => (t.id === savedTask.id ? savedTask : t))
                : [savedTask, ...prev];
            });
          }
          if ((count ?? 1) > 1 || !savedTask) {
            router.refresh();
          }
        }}
        taskToEdit={taskToEdit}
        departments={departments}
        members={members}
        currentUserId={currentUserId}
        canDelegateDepartment={canDelegateDepartment}
        canDelegateChurch={canDelegateChurch}
        defaultScope={defaultFormScope}
        defaultDepartmentId={selectedDeptId !== "all" ? selectedDeptId : null}
        defaultStatus={defaultCreateStatus}
      />

      {/* Modal de Detalhes */}
      <TaskDetailDialog
        task={selectedTaskForDetail}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onDeleted={handleTaskDeleted}
        onTaskUpdated={handleTaskUpdated}
        capabilities={
          selectedTaskForDetail
            ? capabilitiesByTaskId[selectedTaskForDetail.id]
            : undefined
        }
        members={members}
        departments={departments}
      />

      {/* Modal de Auditoria */}
      <TaskAuditHistoryDialog
        task={taskForAudit}
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        members={members}
        departments={departments}
      />
    </div>
  );
}
