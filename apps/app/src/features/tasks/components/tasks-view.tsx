"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  CheckSquare2Icon,
  ClockIcon,
  ColumnsIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  TableIcon,
  XIcon,
} from "lucide-react";

import { PageInfo } from "@/components/app/page-info";
import { StatStrip, type StatItem } from "@/components/app/stat-strip";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskAuditHistoryDialog } from "./task-audit-history-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { TasksKanbanView } from "./tasks-kanban-view";
import { TasksListView } from "./tasks-list-view";
import { TasksTableView } from "./tasks-table-view";
import type { TaskItem, TaskStatus } from "../services/tasks-service";

type ViewMode = "list" | "table" | "kanban";

type TasksViewProps = {
  initialTasks: TaskItem[];
  departments: { id: string; name: string }[];
  members: { userId: string; personId?: string; name: string; email?: string | null }[];
  currentUserId: string;
  isAdmin?: boolean;
  canDelegateDepartment?: boolean;
  canDelegateChurch?: boolean;
};

export function TasksView({
  initialTasks,
  departments,
  members,
  currentUserId,
  isAdmin = false,
  canDelegateDepartment = true,
  canDelegateChurch = false,
}: TasksViewProps) {
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("openministry_tasks_view");
        if (saved === "list" || saved === "table" || saved === "kanban") {
          return saved;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return "list";
  });
  const [activeTab, setActiveTab] = useState<"personal" | "delegated" | "department" | "all">("personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [taskForAudit, setTaskForAudit] = useState<TaskItem | null>(null);

  const handleTaskCreated = (newTask: TaskItem, tempId?: string) => {
    setTasks((current) => {
      if (tempId) {
        const index = current.findIndex((t) => t.id === tempId);
        if (index !== -1) {
          const next = [...current];
          next[index] = newTask;
          return next;
        }
      }
      if (current.some((t) => t.id === newTask.id)) {
        return current.map((t) => (t.id === newTask.id ? newTask : t));
      }
      return [newTask, ...current];
    });
  };

  const handleTaskFailed = (tempId: string) => {
    setTasks((current) => current.filter((t) => t.id !== tempId));
  };

  const handleTaskUpdated = (updatedTask: TaskItem) => {
    setTasks((current) =>
      current.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((current) => current.filter((t) => t.id !== taskId));
  };

  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("openministry_tasks_view", mode);
    } catch {
      // Ignore storage errors
    }
  };

  // Filtragem em memória
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Filtro por Aba
      if (activeTab === "personal") {
        const isMine =
          (task.createdById === currentUserId && task.scope === "personal") ||
          task.assigneeId === currentUserId;
        if (!isMine) return false;
      } else if (activeTab === "delegated") {
        const isDelegated =
          task.createdById === currentUserId &&
          ((task.assigneeId && task.assigneeId !== currentUserId) ||
            task.departmentId !== null ||
            task.scope === "organization");
        if (!isDelegated) return false;
      } else if (activeTab === "department") {
        if (!task.departmentId) return false;
      }

      // 2. Filtro por Status
      if (statusFilter === "active" && task.status === "completed") {
        return false;
      }
      if (statusFilter === "completed" && task.status !== "completed") {
        return false;
      }

      // 3. Filtro por Departamento
      if (selectedDeptId !== "all" && task.departmentId !== selectedDeptId) {
        return false;
      }

      // 4. Filtro por Busca de texto
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description ?? "").toLowerCase().includes(q);
        const matchesTag = Array.isArray(task.tags)
          ? task.tags.some((t) => t.toLowerCase().includes(q))
          : false;

        if (!matchesTitle && !matchesDesc && !matchesTag) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, activeTab, statusFilter, selectedDeptId, searchQuery, currentUserId]);

  // Estatísticas do StatStrip
  const stats: StatItem[] = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status !== "completed").length;
    const completed = tasks.filter((t) => t.status === "completed").length;

    return [
      {
        icon: CheckSquare2Icon,
        label: "Total de tarefas",
        value: total,
        hint: "Sob seu acompanhamento",
      },
      {
        icon: ClockIcon,
        label: "Pendentes",
        value: pending,
        hint: "A fazer ou em andamento",
      },
      {
        icon: CheckCircle2Icon,
        label: "Concluídas",
        value: completed,
        hint: "Finalizadas com sucesso",
      },
    ];
  }, [tasks]);

  const handleEdit = (task: TaskItem) => {
    setTaskToEdit(task);
    setFormOpen(true);
  };

  const handleOpenAudit = (task: TaskItem) => {
    setTaskForAudit(task);
    setAuditOpen(true);
  };

  const handleNewTask = (_defaultStatus?: TaskStatus) => {
    setTaskToEdit(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
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
                    Gerencie tarefas pessoais para organizar seus afazeres, estudos de
                    instrumento e compromissos ministeriais.
                  </p>
                  <p className="mt-2">
                    Líderes e administradores podem delegar tarefas para membros ou para toda
                    a equipe de um departamento, com notificações push automáticas e histórico auditável.
                  </p>
                </>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Organize seus afazeres pessoais, rotinas de estudo e delegue demandas ministeriais para equipes e departamentos.
          </p>
        </div>

        <Button
          onClick={() => handleNewTask()}
          size="sm"
          className="gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <PlusIcon className="size-4" />
          Nova Tarefa
        </Button>
      </header>

      {/* Métricas Rápidas */}
      <StatStrip items={stats} />

      {/* Abas e Barra de Ferramentas */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Abas de Contexto */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "personal" | "delegated" | "department" | "all")}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-4 sm:flex w-full">
              <TabsTrigger value="personal" className="text-xs px-3">
                Minhas Tarefas
              </TabsTrigger>
              <TabsTrigger value="delegated" className="text-xs px-3">
                Delegadas
              </TabsTrigger>
              {departments.length > 0 && (
                <TabsTrigger value="department" className="text-xs px-3">
                  Departamento
                </TabsTrigger>
              )}
              {(isAdmin || canDelegateChurch) && (
                <TabsTrigger value="all" className="text-xs px-3">
                  Todas
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          {/* Seletor de Modo de Visualização (List, Table, Kanban) */}
          <div className="flex items-center gap-1 rounded-xl border bg-muted/30 p-1 self-end sm:self-auto shrink-0">
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleChangeViewMode("list")}
              className="h-7 px-2.5 text-xs gap-1.5"
              title="Visualização em Lista (Things 3 style)"
            >
              <ListIcon className="size-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleChangeViewMode("kanban")}
              className="h-7 px-2.5 text-xs gap-1.5"
              title="Visualização em Quadro Kanban"
            >
              <ColumnsIcon className="size-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleChangeViewMode("table")}
              className="h-7 px-2.5 text-xs gap-1.5"
              title="Visualização em Tabela Detalhada"
            >
              <TableIcon className="size-3.5" />
              <span className="hidden sm:inline">Tabela</span>
            </Button>
          </div>
        </div>

        {/* Linha de Busca e Filtros Secundários */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 min-w-[220px]">
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon className="size-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tarefas por título, notas ou #tags..."
                className="text-xs"
              />
              {searchQuery && (
                <InputGroupAddon>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro de Status */}
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "completed")}
              className="text-xs h-9 w-[130px]"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Apenas Ativas</option>
              <option value="completed">Concluídas</option>
            </NativeSelect>

            {/* Filtro de Departamento */}
            {departments.length > 0 && activeTab !== "personal" && (
              <NativeSelect
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="text-xs h-9 w-[150px]"
              >
                <option value="all">Depto: Todos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </div>
        </div>
      </div>

      {/* Renderização da Visualização Escolhida */}
      {filteredTasks.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-8 text-center bg-muted/10">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <CheckSquare2Icon className="size-6" />
          </span>
          <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {searchQuery
              ? "Nenhuma tarefa encontrada"
              : activeTab === "delegated"
                ? "Nenhuma tarefa delegada"
                : "Tudo limpo por aqui!"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {searchQuery
              ? "Tente buscar com outros termos ou limpe o filtro para ver todas as tarefas."
              : "Aproveite para criar uma nova tarefa pessoal ou delegar afazeres para sua equipe."}
          </p>
          <Button
            onClick={() => handleNewTask()}
            size="sm"
            variant="outline"
            className="mt-4 gap-1.5 text-xs"
          >
            <PlusIcon className="size-3.5" />
            Criar Primeira Tarefa
          </Button>
        </div>
      ) : viewMode === "list" ? (
        <TasksListView
          tasks={filteredTasks}
          onEdit={handleEdit}
          onOpenAudit={handleOpenAudit}
          onDelete={handleTaskDeleted}
          canManage={true}
        />
      ) : viewMode === "kanban" ? (
        <TasksKanbanView
          tasks={filteredTasks}
          onEdit={handleEdit}
          onOpenAudit={handleOpenAudit}
          onNewTask={handleNewTask}
          onDelete={handleTaskDeleted}
          canManage={true}
        />
      ) : (
        <TasksTableView
          tasks={filteredTasks}
          onEdit={handleEdit}
          onOpenAudit={handleOpenAudit}
          onDelete={handleTaskDeleted}
          canManage={true}
        />
      )}

      {/* Modal de Formulário (Criação/Edição) */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        taskToEdit={taskToEdit}
        departments={departments}
        members={members}
        currentUserId={currentUserId}
        canDelegateDepartment={canDelegateDepartment}
        canDelegateChurch={canDelegateChurch}
        onTaskCreated={handleTaskCreated}
        onTaskFailed={handleTaskFailed}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Modal de Histórico de Auditoria */}
      <TaskAuditHistoryDialog
        task={taskForAudit}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </div>
  );
}
