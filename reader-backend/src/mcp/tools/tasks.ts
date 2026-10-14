import { registerTool } from '../register-tool';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";
import type { Prisma } from "@prisma/client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createHierarchyTask, updateHierarchyTask, updateHierarchyTasks, taskHierarchyTransaction, softDeleteHierarchyTasks, TaskHierarchyError } from "../../task-hierarchy";
import { filterMatrixTasks, matrixOptions } from "../../task-matrix";
import { timeAnalytics } from '../../time-analytics';
import { instantAt } from '@reader/calendar-core';
import { addTaskSession, discardTaskTimer, pauseTaskTimer, readActiveTimer, startTaskTimer, stopTaskTimer } from '../../timer-service';
import { taskDueFilter, taskDate, parseTaskInput, updateTaskInput, createListInput } from '../../task-contract';
import { accountTransaction } from '../../account-transaction';

async function hierarchyTool(action: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try { return await action(); }
  catch (error) {
    if (!(error instanceof TaskHierarchyError)) throw error;
    return { isError: true, content: [{ type: "text", text: error.message }] };
  }
}

export function registerTaskTools(server: McpServer, userId: string) {
  // 1. List tasks
  registerTool(server,
    "reader_list_tasks",
    "List tasks and subtasks with smart filters (by list, status, priority, due date, or search keyword)",
    {
      listId: z.string().optional().describe("Filter by list ID (or 'inbox' / 'null' for Inbox, omit for all)"),
      status: z.enum(["all", "active", "uncompleted", "todo", "in_progress", "done", "cancelled"]).optional().describe("Filter by status (default: 'active')"),
      priority: z.number().min(1).max(4).optional().describe("Filter by priority (1=P1 Urgent, 2=P2 High, 3=P3 Medium, 4=P4 Low)"),
      due: z.enum(["all", "today", "tomorrow", "next7", "overdue"]).optional().describe("Smart due date filter"),
      matrixDate: z.enum(["today", "tomorrow", "all"]).optional().describe("Matrix date filter: unfinished tasks use due dates; done tasks use completion dates. Use status active, done or all."),
      timeZone: z.string().optional().describe("IANA time zone for matrix calendar dates, e.g. Asia/Kolkata. Defaults to UTC."),
      includeOverdue: z.boolean().optional().describe("Include overdue unfinished tasks when matrixDate is today"),
      search: z.string().optional().describe("Search term matching task title or description"),
      includeSubtasks: z.boolean().optional().describe("Whether to include subtasks in the flat list (default: false, returns top-level)"),
    },
    async ({ listId, status = "active", priority, due, search, includeSubtasks = false, matrixDate, timeZone, includeOverdue }) => hierarchyTool(async () => {
      const matrix = matrixOptions(matrixDate, status, timeZone, includeOverdue);
      const where: Record<string, unknown> = {
        userId,
        deletedAt: null,
      };

      if (listId !== undefined && listId !== "all") {
        where.listId = listId === "null" || listId === "inbox" ? null : listId;
      }

      if (!includeSubtasks && !due && !priority && !search && status !== 'done' && status !== 'cancelled') {
        where.parentId = null;
      }

      if (status !== "all") {
        if (status === "active" || status === "uncompleted") {
          where.status = { notIn: ["done", "cancelled"] };
        } else {
          where.status = status;
        }
      }

      if (priority !== undefined) {
        where.priority = priority;
      }

      if (due && due !== "all") {
        where.dueDate = taskDueFilter(due, timeZone);
        if (due === 'overdue') where.status = { notIn: ['done', 'cancelled'] };
      }

      if (search && search.trim()) {
        where.OR = [
          { title: { contains: search.trim() } },
          { description: { contains: search.trim() } },
        ];
      }

      const loadedTasks = await prisma.task.findMany({
        where,
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      });
      const tasks = matrix ? filterMatrixTasks(loadedTasks, matrix) : loadedTasks;
      const parentIds = [...new Set(tasks.map(task => task.parentId).filter((id): id is string => !!id))];
      const parents = matrix && parentIds.length ? await prisma.task.findMany({ where: { id: { in: parentIds }, userId, deletedAt: null }, select: { id: true, title: true } }) : [];
      const parentTitles = new Map(parents.map(parent => [parent.id, parent.title]));

      const lists = await prisma.task_list.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, color: true },
      });
      const listMap = new Map(lists.map((l) => [l.id, l.name]));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: tasks.length,
                tasks: tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                version: t.version,
                  status: t.status,
                  priority: t.priority,
                  priorityLabel: `P${t.priority}`,
                  listId: t.listId,
                  listName: t.listId ? listMap.get(t.listId) || "Unknown List" : "Inbox",
                  parentId: t.parentId,
                  parentTitle: t.parentId ? parentTitles.get(t.parentId) ?? null : null,
                  completedAt: t.completedAt?.toISOString() ?? null,
                  dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
                  dueTime: t.dueTime,
                  totalTimeSeconds: t.totalTimeSeconds,
                  totalTimeFormatted: formatSecondsHuman(t.totalTimeSeconds),
                  createdAt: t.createdAt.toISOString(),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 2. Get task detail with full subtask hierarchy & logged time sessions
  registerTool(server,
    "reader_get_task",
    "Get full details of a task, its recursive subtasks tree, and all recorded time sessions",
    {
      taskId: z.string().describe("Task UUID to retrieve"),
    },
    async ({ taskId }) => {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId, deletedAt: null },
      });

      if (!task) {
        return { isError: true, content: [{ type: "text", text: `Task not found: ${taskId}` }] };
      }

      async function fetchSubtasks(pId: string): Promise<any[]> {
        const children = await prisma.task.findMany({
          where: { parentId: pId, userId, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        const out = [];
        for (const c of children) {
          out.push({
            id: c.id,
            title: c.title,
                version: c.version,
            status: c.status,
            priority: c.priority,
            totalTimeSeconds: c.totalTimeSeconds,
            totalTimeFormatted: formatSecondsHuman(c.totalTimeSeconds),
            subtasks: await fetchSubtasks(c.id),
          });
        }
        return out;
      }

      const subtasks = await fetchSubtasks(task.id);
      const sessions = await prisma.time_session.findMany({
        where: { taskId, userId },
        orderBy: { startTime: "desc" },
      });

      const activeTimer = await prisma.active_timer.findUnique({ where: { userId } });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: task.id,
                title: task.title,
                version: task.version,
                description: task.description,
                status: task.status,
                priority: task.priority,
                listId: task.listId,
                parentId: task.parentId,
                dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
                dueTime: task.dueTime,
                totalTimeSeconds: task.totalTimeSeconds,
                totalTimeFormatted: formatSecondsHuman(task.totalTimeSeconds),
                subtasks,
                timeSessions: sessions.map((s) => ({
                  id: s.id,
                  startTime: s.startTime.toISOString(),
                  endTime: s.endTime ? s.endTime.toISOString() : null,
                  durationSeconds: s.durationSeconds,
                  durationFormatted: formatSecondsHuman(s.durationSeconds),
                  notes: s.notes,
                })),
                isTimerCurrentlyRunning: activeTimer?.taskId === task.id,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 3. Create task or subtask
  registerTool(server,
    "reader_create_task",
    "Create a task or nested subtask with priority, due date and Markdown notes. Subtasks inherit their parent’s list; omit listId for subtasks.",
    {
      title: z.string().describe("Task title / summary"),
      description: z.string().optional().describe("Optional rich markdown description or notes"),
      priority: z.number().min(1).max(4).optional().describe("Priority: 1=P1 (Urgent/Important), 2=P2 (High), 3=P3 (Medium), 4=P4 (Low/None)"),
      dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
      dueTime: z.string().optional().describe("Due time in HH:mm format (e.g. '14:30')"),
      listId: z.string().optional().describe("Top-level task list (omit or 'inbox' for Inbox). Subtasks inherit the parent list; omit this field for subtasks."),
      parentTaskId: z.string().optional().describe("Parent task ID if creating a nested subtask"),
    },
    async ({ title, description, priority = 4, dueDate, dueTime, listId, parentTaskId }) => hierarchyTool(async () => {
      const now = new Date();
      const parsedDueDate = dueDate === undefined ? null : parseTaskInput(taskDate, dueDate);

      const created = await taskHierarchyTransaction(prisma, tx => createHierarchyTask(tx, userId, {
        parentId: parentTaskId,
        listId,
        title: title.trim(),
        description: description || null,
        priority,
        status: "todo",
        dueDate: parsedDueDate,
        dueTime: dueTime || null,
        totalTimeSeconds: 0,
        createdAt: now,
        updatedAt: now,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                taskId: created.id,
                title: created.title,
                version: created.version,
                priority: `P${created.priority}`,
                listId: created.listId,
                parentId: created.parentId,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 4. Update task
  registerTool(server,
    "reader_update_task",
    "Update a task’s properties or parent. Moving a top-level task to a list moves its entire subtree. Subtasks inherit their parent’s list; detach first to move independently.",
    {
      taskId: z.string().describe("UUID of task to update"),
      expectedVersion: z.number().int().positive().optional().describe('Version from the last task read; rejects stale saves, including duplicate recurring completion.'),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New markdown description"),
      status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional().describe("New completion status"),
      priority: z.number().min(1).max(4).optional().describe("New priority level (1-4)"),
      dueDate: z.string().nullable().optional().describe("New due date (YYYY-MM-DD or null to clear)"),
      dueTime: z.string().nullable().optional().describe("New due time (HH:mm or null to clear)"),
      listId: z.string().nullable().optional().describe("New list ID (or null/'inbox' to move to Inbox)"),
      parentTaskId: z.string().nullable().optional().describe("New parent task ID (or null to make top-level)"),
    },
    async ({ taskId, expectedVersion, title, description, status, priority, dueDate, dueTime, listId, parentTaskId }) => hierarchyTool(async () => {
      const existing = await prisma.task.findFirst({
        where: { id: taskId, userId, deletedAt: null },
      });

      if (!existing) {
        return { isError: true, content: [{ type: "text", text: `Task not found: ${taskId}` }] };
      }

      const now = new Date();
      const validated = parseTaskInput(updateTaskInput, { title, description, status, priority, dueDate, dueTime, listId, parentId: parentTaskId, expectedVersion });
      const updateData: Record<string, unknown> = { updatedAt: now, ...validated };

      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) {
        updateData.status = status;
        if (status === "done" && existing.status !== "done") {
          updateData.completedAt = now;
        } else if (status !== "done") {
          updateData.completedAt = null;
        }
      }
      if (priority !== undefined) updateData.priority = priority;

      if (dueDate !== undefined) {
        if (dueDate === null || dueDate === "") {
          updateData.dueDate = null;
        } else {
          const d = new Date(dueDate);
          if (!Number.isNaN(d.getTime())) updateData.dueDate = validated.dueDate;
        }
      }
      if (dueTime !== undefined) updateData.dueTime = dueTime;

      if (listId !== undefined) {
        updateData.listId = listId === "null" || listId === "inbox" || !listId ? null : listId;
      }

      if (parentTaskId !== undefined) updateData.parentId = parentTaskId;
      const updated = await taskHierarchyTransaction(prisma, tx => updateHierarchyTask(tx, userId, taskId, updateData));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                taskId: updated.id,
                title: updated.title,
                version: updated.version,
                status: updated.status,
                priority: `P${updated.priority}`,
                listId: updated.listId,
                parentId: updated.parentId,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 5. Delete task
  registerTool(server,
    "reader_delete_task",
    "Soft-delete a task and its nested subtasks, preserving logged time history",
    {
      taskId: z.string().describe("Task UUID to delete"),
    },
    async ({ taskId }) => hierarchyTool(async () => {
      const ids = await taskHierarchyTransaction(prisma, tx => softDeleteHierarchyTasks(tx, userId, [taskId]));
      return { content: [{ type: "text", text: JSON.stringify({ success: true, deletedTaskId: taskId, affectedTaskIds: ids }, null, 2) }] };
    })
  );

  // 6. List task lists
  registerTool(server,
    "reader_list_task_lists",
    "List all task lists/projects with task counts and total time tracked",
    {},
    async () => {
      const lists = await prisma.task_list.findMany({
        where: { userId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });

      const tasks = await prisma.task.findMany({
        where: { userId, deletedAt: null },
        select: { listId: true, parentId: true, status: true, totalTimeSeconds: true },
      });

      const counts = new Map<string | null, { total: number; uncompleted: number; seconds: number }>();
      for (const t of tasks) {
        if (!counts.has(t.listId)) counts.set(t.listId, { total: 0, uncompleted: 0, seconds: 0 });
        const c = counts.get(t.listId)!;
        if (!t.parentId) {
          c.total++;
          if (t.status !== "done" && t.status !== "cancelled") c.uncompleted++;
        }
        c.seconds += t.totalTimeSeconds || 0;
      }

      const inbox = counts.get(null) || { total: 0, uncompleted: 0, seconds: 0 };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                inbox: {
                  name: "Inbox",
                  taskCount: inbox.total,
                  uncompletedCount: inbox.uncompleted,
                  totalTimeFormatted: formatSecondsHuman(inbox.seconds),
                },
                lists: lists.map((l) => {
                  const c = counts.get(l.id) || { total: 0, uncompleted: 0, seconds: 0 };
                  return {
                    id: l.id,
                    name: l.name,
                    color: l.color,
                    icon: l.icon,
                    taskCount: c.total,
                    uncompletedCount: c.uncompleted,
                    totalTimeSeconds: c.seconds,
                    totalTimeFormatted: formatSecondsHuman(c.seconds),
                  };
                }),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 7. Create task list
  registerTool(server,
    "reader_create_task_list",
    "Create a new task list/project",
    {
      name: z.string().describe("List name"),
      color: z.string().optional().describe("Hex color code (e.g. '#3b82f6')"),
      icon: z.string().optional().describe("Icon name (e.g. 'Book', 'Code', 'Briefcase')"),
    },
    async (raw) => hierarchyTool(async () => {
      const { name, color = '#3b82f6', icon = 'List' } = parseTaskInput(createListInput, raw);
      const now = new Date();
      const created = await accountTransaction(prisma, userId, async tx => {
      const maxSort = await tx.task_list.aggregate({
        where: { userId, deletedAt: null },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

      return tx.task_list.create({
        data: {
          userId,
          name: name.trim(),
          color,
          icon,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        },
      });
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, listId: created.id, name: created.name }, null, 2),
          },
        ],
      };
    })
  );

  // ==========================================
  // TIME TRACKING & SERVER-SIDE TIMER TOOLS
  // ==========================================

  const timerId = z.string().uuid().nullable().optional().describe('Timer ID from the last read; protects against changes in another tab. Use null when no timer is active.');
  const timerResult = (value: unknown): CallToolResult => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
  registerTool(server,'reader_start_timer', 'Start a timer. Starting the same task again preserves elapsed time; switching tasks saves the previous session.', { taskId: z.string(), notes: z.string().optional(), expectedTimerId: timerId },
    async input => hierarchyTool(async () => timerResult(await startTaskTimer(prisma, userId, input))));
  registerTool(server,'reader_get_active_timer', 'Read the current server timer and its ID before changing it.', {},
    async () => hierarchyTool(async () => { const value = await readActiveTimer(prisma, userId); return timerResult({ ...value, ...value.timer, elapsedSeconds: value.timer?.currentElapsedSeconds ?? 0 }); }));
  registerTool(server,'reader_pause_timer', 'Pause the active timer without losing elapsed work.', { expectedTimerId: timerId },
    async input => hierarchyTool(async () => timerResult(await pauseTaskTimer(prisma, userId, input, true))));
  registerTool(server,'reader_resume_timer', 'Resume the paused timer.', { expectedTimerId: timerId },
    async input => hierarchyTool(async () => timerResult(await pauseTaskTimer(prisma, userId, input, false))));
  registerTool(server,'reader_stop_timer', 'Stop and save the active timer once. Supply its ID so a retry cannot stop a newer timer.', { expectedTimerId: timerId, notes: z.string().optional(), durationMinutes: z.number().positive().max(527040).optional() },
    async ({ durationMinutes, ...input }) => hierarchyTool(async () => timerResult(await stopTaskTimer(prisma, userId, { ...input, durationSeconds: durationMinutes === undefined ? undefined : Math.round(durationMinutes * 60) }))));
  registerTool(server,'reader_discard_timer', 'Discard the specified active timer without logging time.', { expectedTimerId: timerId },
    async input => hierarchyTool(async () => timerResult(await discardTaskTimer(prisma, userId, input))));
  registerTool(server,'reader_log_time_session', 'Log a completed time session. A request key makes retries safe; date uses the specified timezone.', {
    taskId: z.string(), durationMinutes: z.number().positive().max(527040), notes: z.string().optional(), date: z.string().optional(), timeZone: z.string().optional(), requestKey: z.string().uuid().optional(),
  }, async ({ taskId, durationMinutes, date, timeZone = 'UTC', ...rest }) => hierarchyTool(async () => {
    taskDueFilter('all', timeZone);
    const day = date ? parseTaskInput(taskDate, date)!.toISOString().slice(0, 10) : null;
    const start = day ? instantAt(`${day}T00:00`, timeZone) : new Date();
    if (!start) throw new TaskHierarchyError(400, 'This local date begins at a skipped midnight. Choose another date.');
    return timerResult(await addTaskSession(prisma, userId, taskId, { ...rest, startTime: start.toISOString(), durationSeconds: Math.round(durationMinutes * 60) }));
  }));

  registerTool(server,'reader_get_time_analytics', 'Report logged time by task, list and local session start date. Counts and totals use the same filters and retain deleted task history.', {
    preset: z.enum(['today', 'yesterday', '7', '14', '30', 'all']).optional(), startDate: z.string().optional(), endDate: z.string().optional(), listId: z.string().optional(), taskId: z.string().optional(), timeZone: z.string().optional().describe('IANA timezone for report days (defaults to UTC).'),
  }, async input => hierarchyTool(async () => timerResult(await timeAnalytics(prisma, userId, input))));

  // 15. Create tasks and nested subtasks in bulk
  registerTool(server,
    "reader_create_tasks_bulk",
    "Create multiple tasks and their nested subtask trees in a single structured call. Ideal for decomposing project plans, PRDs, or meeting action items into actionable tasks.",
    {
      timeZone: z.string().optional().describe('IANA timezone for today/tomorrow (defaults to UTC).'),
      tasks: z
        .array(
          z.object({
            title: z.string().describe("Task title"),
            description: z.string().optional().describe("Optional Markdown description / notes"),
            listId: z.string().optional().describe("Optional list UUID (omit for Inbox)"),
            listName: z.string().optional().describe("Optional list name (if provided and listId omitted, matches or auto-creates list)"),
            priority: z.number().min(1).max(4).optional().default(4).describe("Priority (1=P1 Urgent, 2=P2 High, 3=P3 Med, 4=P4 Low)"),
            dueDate: z.string().optional().describe("Due date (YYYY-MM-DD, 'today', 'tomorrow')"),
            dueTime: z.string().optional().describe("Due time (HH:MM)"),
            status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
            subtasks: z
              .array(
                z.object({
                  title: z.string().describe("Subtask title"),
                  description: z.string().optional().describe("Optional description"),
                  priority: z.number().min(1).max(4).optional().default(4),
                  dueDate: z.string().optional(),
                  dueTime: z.string().optional(),
                  status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
                  subtasks: z.array(z.any()).optional().describe("Optional nested subtasks"),
                })
              )
              .optional()
              .describe("Nested subtasks to create under this task"),
          })
        )
        .describe("List of tasks to create"),
    },
    async ({ tasks, timeZone = 'UTC' }) => hierarchyTool(() => taskHierarchyTransaction(prisma, async tx => {
      taskDueFilter('all', timeZone);
      validateTaskTree(tasks);
      const createdSummary: Array<{
        id: string;
        title: string;
        priority: string;
        listName: string;
        subtasksCount: number;
      }> = [];

      const listCache = new Map<string, string>();
      const existingLists = await tx.task_list.findMany({
        where: { userId, deletedAt: null },
      });
      for (const l of existingLists) {
        listCache.set(l.name.toLowerCase().trim(), l.id);
      }

      for (let i = 0; i < tasks.length; i++) {
        const item = tasks[i];
        let targetListId: string | null = null;

        if (item.listId && item.listId !== "inbox" && item.listId !== "null") {
          targetListId = item.listId;
        } else if (item.listId === undefined && item.listName && item.listName.trim() && item.listName.toLowerCase() !== "inbox") {
          const normName = item.listName.toLowerCase().trim();
          if (listCache.has(normName)) {
            targetListId = listCache.get(normName)!;
          } else {
            const now = new Date();
            const newList = await tx.task_list.create({
              data: {
                userId,
                name: item.listName.trim(),
                color: "#3b82f6",
                icon: "List",
                sortOrder: listCache.size + 1,
                createdAt: now,
                updatedAt: now,
              },
            });
            targetListId = newList.id;
            listCache.set(normName, newList.id);
          }
        }

        const now = new Date();
        const dueDate = parseSmartDueDate(item.dueDate, timeZone);
        const parentTask = await createHierarchyTask(tx, userId, {
          listId: targetListId,
          parentId: null,
          title: item.title.trim(),
          description: item.description || null,
          priority: item.priority ?? 4,
          status: item.status || "todo",
          dueDate,
          dueTime: item.dueTime || null,
          totalTimeSeconds: 0,
          completedAt: item.status === "done" ? now : null,
          createdAt: now,
          updatedAt: now,
        });

        let subtaskCount = 0;
        if (item.subtasks && item.subtasks.length > 0) {
          const createdSubs = await createRecursiveSubtasks(tx, item.subtasks, parentTask.id, userId, timeZone);
          subtaskCount = createdSubs.length;
        }

        createdSummary.push({
          id: parentTask.id,
          title: parentTask.title,
          priority: `P${parentTask.priority}`,
          listName: targetListId ? (await tx.task_list.findFirst({ where: { id: targetListId, userId, deletedAt: null } }))!.name : "Inbox",
          subtasksCount: subtaskCount,
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                createdCount: createdSummary.length,
                tasks: createdSummary,
              },
              null,
              2
            ),
          },
        ],
      };
    }))
  );

  // 16. Batch update tasks
  registerTool(server,
    "reader_batch_update_tasks",
    "Update multiple tasks atomically. List moves include descendants; select the top-level parent to move a subtask tree. Every selected task must belong to this account.",
    {
      taskIds: z.array(z.string()).describe("Array of task UUIDs to update"),
      status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional().describe("New status to apply"),
      priority: z.number().min(1).max(4).optional().describe("New priority to apply (1=P1, 4=P4)"),
      listId: z.string().optional().describe("Target list UUID (or 'inbox' / 'null')"),
      dueDate: z.string().optional().describe("New due date (YYYY-MM-DD, 'today', 'tomorrow', or 'null' to clear)"),
      timeZone: z.string().optional().describe('IANA timezone for today/tomorrow (defaults to UTC).'),
    },
    async ({ taskIds, status, priority, listId, dueDate, timeZone = 'UTC' }) => hierarchyTool(async () => {
      const now = new Date();
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (status !== undefined) {
        updateData.status = status;
        updateData.completedAt = status === "done" ? now : null;
      }
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      if (listId !== undefined) {
        updateData.listId = listId === "inbox" || listId === "null" || !listId ? null : listId;
      }
      if (dueDate !== undefined) {
        updateData.dueDate = parseSmartDueDate(dueDate, timeZone);
      }

      const res = await taskHierarchyTransaction(prisma, tx => updateHierarchyTasks(tx, userId, taskIds, updateData));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                updatedCount: res.count,
                taskIds,
              },
              null,
              2
            ),
          },
        ],
      };
    })
  );

  // 17. Batch delete tasks
  registerTool(server,
    "reader_batch_delete_tasks",
    "Soft-delete multiple tasks and their nested subtasks atomically, preserving logged time history",
    {
      taskIds: z.array(z.string()).describe("Array of task UUIDs to soft-delete"),
    },
    async ({ taskIds }) => hierarchyTool(async () => {
      const ids = await taskHierarchyTransaction(prisma, tx => softDeleteHierarchyTasks(tx, userId, taskIds));
      return { content: [{ type: "text", text: JSON.stringify({ success: true, deletedCount: ids.length, affectedTaskIds: ids }, null, 2) }] };
    })
  );
}

function parseSmartDueDate(dateStr?: string | null, timeZone = 'UTC'): Date | null {
  if (!dateStr || dateStr === "null" || dateStr === "") return null;
  const lower = dateStr.toLowerCase().trim();
  if (lower === 'today' || lower === 'tomorrow') {
    const filter = taskDueFilter(lower, timeZone)!;
    return 'gte' in filter ? filter.gte ?? null : null;
  }
  return parseTaskInput(taskDate, dateStr);
}

function validateTaskTree(items: unknown) {
  let count = 0;
  const visit = (nodes: unknown, depth: number) => {
    if (!Array.isArray(nodes) || depth > 20) throw new TaskHierarchyError(400, 'Use a task tree no deeper than 20 levels.');
    for (const node of nodes) {
      if (++count > 500 || !node || typeof node !== 'object' || typeof node.title !== 'string') throw new TaskHierarchyError(400, 'Create at most 500 tasks with valid titles in one request.');
      if (node.listName !== undefined && (typeof node.listName !== 'string' || node.listName.trim().length > 255)) throw new TaskHierarchyError(400, 'Use a list name of up to 255 characters.');
      if (node.subtasks !== undefined) visit(node.subtasks, depth + 1);
    }
  };
  visit(items, 1);
}

async function createRecursiveSubtasks(
  tx: Prisma.TransactionClient,
  items: Array<{
    title: string;
    description?: string;
    priority?: number;
    dueDate?: string;
    dueTime?: string;
    status?: "todo" | "in_progress" | "done";
    subtasks?: any[];
  }>,
  parentId: string,
  userId: string,
  timeZone = 'UTC'
): Promise<Array<{ id: string; title: string }>> {
  const results: Array<{ id: string; title: string }> = [];
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dueDate = parseSmartDueDate(item.dueDate, timeZone);
    const created = await createHierarchyTask(tx, userId, {
      parentId,
      title: item.title.trim(),
      description: item.description || null,
      priority: item.priority ?? 4,
      status: item.status || "todo",
      dueDate,
      dueTime: item.dueTime || null,
      sortOrder: i + 1,
      totalTimeSeconds: 0,
      completedAt: item.status === "done" ? now : null,
      createdAt: now,
      updatedAt: now,
    });

    results.push({ id: created.id, title: created.title });

    if (item.subtasks && item.subtasks.length > 0) {
      const nested = await createRecursiveSubtasks(tx, item.subtasks, created.id, userId, timeZone);
      results.push(...nested);
    }
  }

  return results;
}

function formatSecondsHuman(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
