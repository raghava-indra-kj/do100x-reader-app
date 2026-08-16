import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "../../prisma";

export function registerTaskTools(server: McpServer, userId: string) {
  // 1. List tasks
  server.tool(
    "reader_list_tasks",
    "List tasks and subtasks with smart filters (by list, status, priority, due date, or search keyword)",
    {
      listId: z.string().optional().describe("Filter by list ID (or 'inbox' / 'null' for Inbox, omit for all)"),
      status: z.enum(["all", "active", "uncompleted", "todo", "in_progress", "done", "cancelled"]).optional().describe("Filter by status (default: 'active')"),
      priority: z.number().min(1).max(4).optional().describe("Filter by priority (1=P1 Urgent/Important, 2=P2 High, 3=P3 Medium, 4=P4 Low)"),
      due: z.enum(["all", "today", "next7", "overdue"]).optional().describe("Smart due date filter"),
      search: z.string().optional().describe("Search term matching task title or description"),
      includeSubtasks: z.boolean().optional().describe("Whether to include subtasks in the flat list (default: false, returns top-level)"),
    },
    async ({ listId, status = "active", priority, due, search, includeSubtasks = false }) => {
      const where: Record<string, unknown> = {
        userId,
        deletedAt: null,
      };

      if (listId !== undefined && listId !== "all") {
        where.listId = listId === "null" || listId === "inbox" ? null : listId;
      }

      if (!includeSubtasks && !due && !priority && !search) {
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
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (due === "today") {
          where.dueDate = { gte: todayStart, lte: todayEnd };
        } else if (due === "next7") {
          const next7End = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          where.dueDate = { gte: todayStart, lte: next7End };
        } else if (due === "overdue") {
          where.dueDate = { lt: todayStart };
          where.status = { notIn: ["done", "cancelled"] };
        }
      }

      if (search && search.trim()) {
        where.OR = [
          { title: { contains: search.trim() } },
          { description: { contains: search.trim() } },
        ];
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      });

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
                  status: t.status,
                  priority: t.priority,
                  priorityLabel: `P${t.priority}`,
                  listId: t.listId,
                  listName: t.listId ? listMap.get(t.listId) || "Unknown List" : "Inbox",
                  parentId: t.parentId,
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
    }
  );

  // 2. Get task detail with full subtask hierarchy & logged time sessions
  server.tool(
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
  server.tool(
    "reader_create_task",
    "Create a new task or nested subtask with priority (1=Urgent/Important to 4=Low), due date, list, and markdown description",
    {
      title: z.string().describe("Task title / summary"),
      description: z.string().optional().describe("Optional rich markdown description or notes"),
      priority: z.number().min(1).max(4).optional().describe("Priority: 1=P1 (Urgent/Important), 2=P2 (High), 3=P3 (Medium), 4=P4 (Low/None)"),
      dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
      dueTime: z.string().optional().describe("Due time in HH:mm format (e.g. '14:30')"),
      listId: z.string().optional().describe("List ID to place task in (omit or 'inbox' for Inbox)"),
      parentTaskId: z.string().optional().describe("Parent task ID if creating a nested subtask"),
    },
    async ({ title, description, priority = 4, dueDate, dueTime, listId, parentTaskId }) => {
      let validParentId: string | null = null;
      if (parentTaskId) {
        const parent = await prisma.task.findFirst({
          where: { id: parentTaskId, userId, deletedAt: null },
          select: { id: true, listId: true },
        });
        if (!parent) {
          return { isError: true, content: [{ type: "text", text: `Parent task not found: ${parentTaskId}` }] };
        }
        validParentId = parent.id;
        if (!listId && parent.listId) listId = parent.listId;
      }

      let validListId: string | null = null;
      if (listId && listId !== "inbox" && listId !== "null") {
        const list = await prisma.task_list.findFirst({
          where: { id: listId, userId, deletedAt: null },
          select: { id: true },
        });
        if (list) validListId = list.id;
      }

      const now = new Date();
      let parsedDueDate: Date | null = null;
      if (dueDate) {
        const d = new Date(dueDate);
        if (!Number.isNaN(d.getTime())) parsedDueDate = d;
      }

      const maxSort = await prisma.task.aggregate({
        where: { userId, parentId: validParentId, deletedAt: null },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

      const created = await prisma.task.create({
        data: {
          userId,
          parentId: validParentId,
          listId: validListId,
          title: title.trim(),
          description: description || null,
          priority: Math.max(1, Math.min(4, priority)),
          status: "todo",
          dueDate: parsedDueDate,
          dueTime: dueTime || null,
          sortOrder,
          totalTimeSeconds: 0,
          createdAt: now,
          updatedAt: now,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                taskId: created.id,
                title: created.title,
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
    }
  );

  // 4. Update task
  server.tool(
    "reader_update_task",
    "Update a task's title, description, status ('todo', 'in_progress', 'done', 'cancelled'), priority, due date, or move to another list/parent",
    {
      taskId: z.string().describe("UUID of task to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New markdown description"),
      status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional().describe("New completion status"),
      priority: z.number().min(1).max(4).optional().describe("New priority level (1-4)"),
      dueDate: z.string().nullable().optional().describe("New due date (YYYY-MM-DD or null to clear)"),
      dueTime: z.string().nullable().optional().describe("New due time (HH:mm or null to clear)"),
      listId: z.string().nullable().optional().describe("New list ID (or null/'inbox' to move to Inbox)"),
      parentTaskId: z.string().nullable().optional().describe("New parent task ID (or null to make top-level)"),
    },
    async ({ taskId, title, description, status, priority, dueDate, dueTime, listId, parentTaskId }) => {
      const existing = await prisma.task.findFirst({
        where: { id: taskId, userId, deletedAt: null },
      });

      if (!existing) {
        return { isError: true, content: [{ type: "text", text: `Task not found: ${taskId}` }] };
      }

      const now = new Date();
      const updateData: Record<string, unknown> = { updatedAt: now };

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
          if (!Number.isNaN(d.getTime())) updateData.dueDate = d;
        }
      }
      if (dueTime !== undefined) updateData.dueTime = dueTime;

      if (listId !== undefined) {
        updateData.listId = listId === "null" || listId === "inbox" || !listId ? null : listId;
      }

      if (parentTaskId !== undefined) {
        const targetParentId = parentTaskId === "null" || !parentTaskId ? null : parentTaskId;
        if (targetParentId === taskId) {
          return { isError: true, content: [{ type: "text", text: "Cannot make a task a subtask of itself" }] };
        }
        if (targetParentId) {
          let curr: string | null = targetParentId;
          let isCycle = false;
          while (curr) {
            if (curr === taskId) {
              isCycle = true;
              break;
            }
            const parentTask: { parentId: string | null } | null = await prisma.task.findFirst({
              where: { id: curr, userId, deletedAt: null },
              select: { parentId: true },
            });
            curr = parentTask ? parentTask.parentId : null;
          }
          if (isCycle) {
            return { isError: true, content: [{ type: "text", text: "Cannot move task into its own descendant subtask" }] };
          }
        }
        updateData.parentId = targetParentId;
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                taskId: updated.id,
                title: updated.title,
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
    }
  );

  // 5. Delete task
  server.tool(
    "reader_delete_task",
    "Soft-delete a task and all of its nested subtasks, and delete their related time sessions",
    {
      taskId: z.string().describe("Task UUID to delete"),
    },
    async ({ taskId }) => {
      const existing = await prisma.task.findFirst({
        where: { id: taskId, userId, deletedAt: null },
      });
      if (!existing) {
        return { isError: true, content: [{ type: "text", text: `Task not found: ${taskId}` }] };
      }

      const now = new Date();
      async function getAllDescendantTaskIds(tId: string): Promise<string[]> {
        const ids: string[] = [tId];
        const children = await prisma.task.findMany({
          where: { parentId: tId, userId, deletedAt: null },
          select: { id: true },
        });
        for (const c of children) {
          const subIds = await getAllDescendantTaskIds(c.id);
          ids.push(...subIds);
        }
        return ids;
      }

      const allTargetIds = await getAllDescendantTaskIds(taskId);

      // 1. Delete all related time sessions
      await prisma.time_session.deleteMany({
        where: { taskId: { in: allTargetIds }, userId },
      });

      // 2. Soft-delete all tasks
      await prisma.task.updateMany({
        where: { id: { in: allTargetIds }, userId },
        data: { deletedAt: now, updatedAt: now },
      });

      // 3. Discard active timer if running on any of these tasks
      const active = await prisma.active_timer.findUnique({ where: { userId } });
      if (active && allTargetIds.includes(active.taskId)) {
        await prisma.active_timer.delete({ where: { userId } });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, deletedTaskId: taskId, affectedTaskIds: allTargetIds }, null, 2),
          },
        ],
      };
    }
  );

  // 6. List task lists
  server.tool(
    "reader_list_task_lists",
    "List all task lists/projects with task counts and total time tracked",
    {},
    async () => {
      const lists = await prisma.task_list.findMany({
        where: { userId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });

      const tasks = await prisma.task.findMany({
        where: { userId, deletedAt: null, parentId: null },
        select: { listId: true, status: true, totalTimeSeconds: true },
      });

      const counts = new Map<string | null, { total: number; uncompleted: number; seconds: number }>();
      for (const t of tasks) {
        if (!counts.has(t.listId)) counts.set(t.listId, { total: 0, uncompleted: 0, seconds: 0 });
        const c = counts.get(t.listId)!;
        c.total++;
        if (t.status !== "done" && t.status !== "cancelled") c.uncompleted++;
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
  server.tool(
    "reader_create_task_list",
    "Create a new task list/project",
    {
      name: z.string().describe("List name"),
      color: z.string().optional().describe("Hex color code (e.g. '#3b82f6')"),
      icon: z.string().optional().describe("Icon name (e.g. 'Book', 'Code', 'Briefcase')"),
    },
    async ({ name, color = "#3b82f6", icon = "List" }) => {
      const now = new Date();
      const maxSort = await prisma.task_list.aggregate({
        where: { userId, deletedAt: null },
        _max: { sortOrder: true },
      });
      const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

      const created = await prisma.task_list.create({
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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, listId: created.id, name: created.name }, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // TIME TRACKING & SERVER-SIDE TIMER TOOLS
  // ==========================================

  // 8. Start server live timer
  server.tool(
    "reader_start_timer",
    "Start the live stopwatch timer on a task. Persists on server so it continues running even when browser is closed.",
    {
      taskId: z.string().describe("Task UUID to start tracking time on"),
      notes: z.string().optional().describe("Optional note for this timer session"),
    },
    async ({ taskId, notes }) => {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId, deletedAt: null },
      });

      if (!task) {
        return { isError: true, content: [{ type: "text", text: `Task not found: ${taskId}` }] };
      }

      const now = new Date();

      // Auto-complete any existing running timer
      const existingActive = await prisma.active_timer.findUnique({ where: { userId } });
      if (existingActive) {
        let finalDuration = existingActive.accumulatedSeconds;
        if (!existingActive.isPaused) {
          finalDuration += Math.max(0, Math.floor((now.getTime() - existingActive.startTime.getTime()) / 1000));
        }
        if (finalDuration >= 5) {
          await prisma.time_session.create({
            data: {
              userId,
              taskId: existingActive.taskId,
              startTime: existingActive.startTime,
              endTime: now,
              durationSeconds: finalDuration,
              notes: existingActive.notes,
              createdAt: now,
              updatedAt: now,
            },
          });
          const agg = await prisma.time_session.aggregate({
            where: { taskId: existingActive.taskId, userId },
            _sum: { durationSeconds: true },
          });
          await prisma.task.updateMany({
            where: { id: existingActive.taskId, userId },
            data: { totalTimeSeconds: agg._sum.durationSeconds ?? 0, updatedAt: now },
          });
        }
      }

      const timer = await prisma.active_timer.upsert({
        where: { userId },
        create: {
          userId,
          taskId,
          startTime: now,
          accumulatedSeconds: 0,
          isPaused: false,
          notes: notes || null,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          taskId,
          startTime: now,
          accumulatedSeconds: 0,
          isPaused: false,
          pausedAt: null,
          notes: notes || null,
          updatedAt: now,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                status: "running",
                taskId: timer.taskId,
                taskTitle: task.title,
                startTime: timer.startTime.toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 9. Get active timer status
  server.tool(
    "reader_get_active_timer",
    "Check if a live timer is currently running, its elapsed seconds, and attached task details",
    {},
    async () => {
      const active = await prisma.active_timer.findUnique({ where: { userId } });
      if (!active) {
        return {
          content: [{ type: "text", text: JSON.stringify({ active: false, message: "No timer is currently running" }, null, 2) }],
        };
      }

      const task = await prisma.task.findFirst({
        where: { id: active.taskId, userId, deletedAt: null },
        select: { id: true, title: true, listId: true, priority: true },
      });

      const now = new Date();
      let currentElapsed = active.accumulatedSeconds;
      if (!active.isPaused) {
        currentElapsed += Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000));
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                active: true,
                taskId: active.taskId,
                taskTitle: task?.title || "Unknown Task",
                priority: task ? `P${task.priority}` : "P4",
                isPaused: active.isPaused,
                elapsedSeconds: currentElapsed,
                elapsedFormatted: formatSecondsHuman(currentElapsed),
                startTime: active.startTime.toISOString(),
                notes: active.notes,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 10. Pause / Resume timer
  server.tool(
    "reader_pause_timer",
    "Pause the currently active timer",
    {},
    async () => {
      const active = await prisma.active_timer.findUnique({ where: { userId } });
      if (!active || active.isPaused) {
        return { isError: true, content: [{ type: "text", text: "No active unpaused timer to pause" }] };
      }
      const now = new Date();
      const elapsed = Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000));
      const accumulated = active.accumulatedSeconds + elapsed;

      await prisma.active_timer.update({
        where: { userId },
        data: { accumulatedSeconds: accumulated, isPaused: true, pausedAt: now, updatedAt: now },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, isPaused: true, totalElapsedFormatted: formatSecondsHuman(accumulated) }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "reader_resume_timer",
    "Resume the currently paused timer",
    {},
    async () => {
      const active = await prisma.active_timer.findUnique({ where: { userId } });
      if (!active || !active.isPaused) {
        return { isError: true, content: [{ type: "text", text: "No paused timer to resume" }] };
      }
      const now = new Date();
      await prisma.active_timer.update({
        where: { userId },
        data: { startTime: now, isPaused: false, pausedAt: null, updatedAt: now },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, isPaused: false, message: "Timer resumed" }, null, 2),
          },
        ],
      };
    }
  );

  // 11. Stop timer and save session
  server.tool(
    "reader_stop_timer",
    "Stop the active timer, record the time session with optional notes, and update task total time",
    {
      notes: z.string().optional().describe("Optional note/summary of work done during this session"),
      durationMinutes: z.number().min(1).optional().describe("Optional adjusted duration in minutes (e.g. to subtract away time before saving)"),
    },
    async ({ notes, durationMinutes }) => {
      const active = await prisma.active_timer.findUnique({ where: { userId } });
      if (!active) {
        return { isError: true, content: [{ type: "text", text: "No active timer to stop" }] };
      }

      const now = new Date();
      let finalDuration = active.accumulatedSeconds;
      if (!active.isPaused) {
        finalDuration += Math.max(0, Math.floor((now.getTime() - active.startTime.getTime()) / 1000));
      }

      if (durationMinutes !== undefined && durationMinutes > 0) {
        finalDuration = durationMinutes * 60;
      }

      const session = await prisma.time_session.create({
        data: {
          userId,
          taskId: active.taskId,
          startTime: active.startTime,
          endTime: now,
          durationSeconds: Math.max(1, finalDuration),
          notes: notes || active.notes,
          createdAt: now,
          updatedAt: now,
        },
      });

      const agg = await prisma.time_session.aggregate({
        where: { taskId: active.taskId, userId },
        _sum: { durationSeconds: true },
      });
      const newTotal = agg._sum.durationSeconds ?? 0;
      await prisma.task.updateMany({
        where: { id: active.taskId, userId },
        data: { totalTimeSeconds: newTotal, updatedAt: now },
      });

      await prisma.active_timer.delete({ where: { userId } });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                sessionId: session.id,
                taskId: session.taskId,
                durationSeconds: session.durationSeconds,
                durationFormatted: formatSecondsHuman(session.durationSeconds),
                taskNewTotalFormatted: formatSecondsHuman(newTotal),
                notes: session.notes,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 12. Discard timer
  server.tool(
    "reader_discard_timer",
    "Discard the active timer without recording any time",
    {},
    async () => {
      await prisma.active_timer.deleteMany({ where: { userId } });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, message: "Active timer discarded" }, null, 2) }],
      };
    }
  );

  // 13. Manually log time session
  server.tool(
    "reader_log_time_session",
    "Manually log a completed time session with duration or start/end times and notes",
    {
      taskId: z.string().describe("Task UUID"),
      durationMinutes: z.number().min(1).describe("Duration spent in minutes"),
      notes: z.string().optional().describe("Work log notes"),
      date: z.string().optional().describe("Date of session (YYYY-MM-DD, defaults to today)"),
    },
    async ({ taskId, durationMinutes, notes, date }) => {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId, deletedAt: null },
      });
      if (!task) {
        return { isError: true, content: [{ type: "text", text: `Task not found: ${taskId}` }] };
      }

      const sTime = date ? new Date(date) : new Date();
      const durationSeconds = durationMinutes * 60;
      const eTime = new Date(sTime.getTime() + durationSeconds * 1000);
      const now = new Date();

      const session = await prisma.time_session.create({
        data: {
          userId,
          taskId,
          startTime: sTime,
          endTime: eTime,
          durationSeconds,
          notes: notes || null,
          createdAt: now,
          updatedAt: now,
        },
      });

      const agg = await prisma.time_session.aggregate({
        where: { taskId, userId },
        _sum: { durationSeconds: true },
      });
      const newTotal = agg._sum.durationSeconds ?? 0;
      await prisma.task.updateMany({
        where: { id: taskId, userId },
        data: { totalTimeSeconds: newTotal, updatedAt: now },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                sessionId: session.id,
                durationFormatted: formatSecondsHuman(durationSeconds),
                taskTotalFormatted: formatSecondsHuman(newTotal),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 14. Time analytics & productivity breakdown
  server.tool(
    "reader_get_time_analytics",
    "Analyze where time was spent across tasks, lists, and days with support for today, yesterday, custom date ranges, and project scopes",
    {
      preset: z.enum(["today", "yesterday", "7", "14", "30", "all"]).optional().describe("Time period preset (default: '7')"),
      startDate: z.string().optional().describe("Optional start date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Optional end date (YYYY-MM-DD)"),
      listId: z.string().optional().describe("Optional list ID or 'inbox' to scope analysis"),
      taskId: z.string().optional().describe("Optional task ID to inspect single task focus"),
    },
    async ({ preset = "7", startDate, endDate, listId, taskId }) => {
      const now = new Date();
      let start: Date;
      let end: Date = now;
      let periodLabel = `${preset} days`;

      if (startDate && endDate) {
        start = new Date(`${startDate}T00:00:00.000`);
        end = new Date(`${endDate}T23:59:59.999`);
        periodLabel = `${startDate} to ${endDate}`;
      } else if (preset === "today") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        periodLabel = "Today";
      } else if (preset === "yesterday") {
        const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        periodLabel = "Yesterday";
      } else if (preset === "all") {
        start = new Date(0);
        periodLabel = "All Time";
      } else {
        const days = parseInt(preset, 10) || 7;
        start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        periodLabel = `Last ${days} Days`;
      }

      const sessionWhere: Record<string, unknown> = {
        userId,
        startTime: { gte: start, lte: end },
      };
      if (taskId) sessionWhere.taskId = taskId;

      const sessions = await prisma.time_session.findMany({
        where: sessionWhere,
        orderBy: { startTime: "desc" },
      });

      const taskWhere: Record<string, unknown> = { userId, deletedAt: null };
      if (listId && listId !== "all") {
        taskWhere.listId = listId === "inbox" || listId === "null" ? null : listId;
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
        select: { id: true, title: true, listId: true, priority: true },
      });
      const taskMap = new Map(tasks.map((t) => [t.id, t]));

      const lists = await prisma.task_list.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, color: true },
      });
      const listMap = new Map(lists.map((l) => [l.id, l.name]));

      let totalSeconds = 0;
      const taskTotals = new Map<string, { title: string; listName: string; seconds: number }>();
      const listTotals = new Map<string, number>();

      for (const s of sessions) {
        const task = taskMap.get(s.taskId);
        if (listId && listId !== "all" && !task) continue;

        totalSeconds += s.durationSeconds;
        const title = task?.title || "Deleted Task";
        const listName = task?.listId ? listMap.get(task.listId) || "List" : "Inbox";

        if (!taskTotals.has(s.taskId)) {
          taskTotals.set(s.taskId, { title, listName, seconds: 0 });
        }
        taskTotals.get(s.taskId)!.seconds += s.durationSeconds;

        listTotals.set(listName, (listTotals.get(listName) || 0) + s.durationSeconds);
      }

      const topTasks = Array.from(taskTotals.entries())
        .map(([id, t]) => ({
          taskId: id,
          title: t.title,
          list: t.listName,
          durationSeconds: t.seconds,
          durationFormatted: formatSecondsHuman(t.seconds),
          percentage: totalSeconds > 0 ? Math.round((t.seconds / totalSeconds) * 100) : 0,
        }))
        .sort((a, b) => b.durationSeconds - a.durationSeconds);

      const listBreakdown = Array.from(listTotals.entries())
        .map(([name, seconds]) => ({
          list: name,
          durationSeconds: seconds,
          durationFormatted: formatSecondsHuman(seconds),
          percentage: totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 100) : 0,
        }))
        .sort((a, b) => b.durationSeconds - a.durationSeconds);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  period: periodLabel,
                  startDate: start.toISOString().slice(0, 10),
                  endDate: end.toISOString().slice(0, 10),
                  totalTimeTrackedSeconds: totalSeconds,
                  totalTimeTrackedFormatted: formatSecondsHuman(totalSeconds),
                  totalSessionsRecorded: sessions.length,
                  topTasks,
                  listBreakdown,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

  // 15. Create tasks and nested subtasks in bulk
  server.tool(
    "reader_create_tasks_bulk",
    "Create multiple tasks and their nested subtask trees in a single structured call. Ideal for decomposing project plans, PRDs, or meeting action items into actionable tasks.",
    {
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
    async ({ tasks }) => {
      const createdSummary: Array<{
        id: string;
        title: string;
        priority: string;
        listName: string;
        subtasksCount: number;
      }> = [];

      const listCache = new Map<string, string>();
      const existingLists = await prisma.task_list.findMany({
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
        } else if (item.listName && item.listName.trim() && item.listName.toLowerCase() !== "inbox") {
          const normName = item.listName.toLowerCase().trim();
          if (listCache.has(normName)) {
            targetListId = listCache.get(normName)!;
          } else {
            const now = new Date();
            const newList = await prisma.task_list.create({
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
        const dueDate = parseSmartDueDate(item.dueDate);
        const parentTask = await prisma.task.create({
          data: {
            userId,
            listId: targetListId,
            parentId: null,
            title: item.title.trim(),
            description: item.description || null,
            priority: Math.max(1, Math.min(4, item.priority || 4)),
            status: item.status || "todo",
            dueDate,
            dueTime: item.dueTime || null,
            sortOrder: i + 1,
            totalTimeSeconds: 0,
            completedAt: item.status === "done" ? now : null,
            createdAt: now,
            updatedAt: now,
          },
        });

        let subtaskCount = 0;
        if (item.subtasks && item.subtasks.length > 0) {
          const createdSubs = await createRecursiveSubtasks(item.subtasks, parentTask.id, targetListId, userId);
          subtaskCount = createdSubs.length;
        }

        createdSummary.push({
          id: parentTask.id,
          title: parentTask.title,
          priority: `P${parentTask.priority}`,
          listName: item.listName || "Inbox",
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
    }
  );

  // 16. Batch update tasks
  server.tool(
    "reader_batch_update_tasks",
    "Update multiple tasks or subtasks simultaneously (e.g., mark a set of tasks as done, change priorities, reschedule due dates, or move to a list)",
    {
      taskIds: z.array(z.string()).describe("Array of task UUIDs to update"),
      status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional().describe("New status to apply"),
      priority: z.number().min(1).max(4).optional().describe("New priority to apply (1=P1, 4=P4)"),
      listId: z.string().optional().describe("Target list UUID (or 'inbox' / 'null')"),
      dueDate: z.string().optional().describe("New due date (YYYY-MM-DD, 'today', 'tomorrow', or 'null' to clear)"),
    },
    async ({ taskIds, status, priority, listId, dueDate }) => {
      const now = new Date();
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (status !== undefined) {
        updateData.status = status;
        updateData.completedAt = status === "done" ? now : null;
      }
      if (priority !== undefined) {
        updateData.priority = Math.max(1, Math.min(4, priority));
      }
      if (listId !== undefined) {
        updateData.listId = listId === "inbox" || listId === "null" || !listId ? null : listId;
      }
      if (dueDate !== undefined) {
        updateData.dueDate = parseSmartDueDate(dueDate);
      }

      const res = await prisma.task.updateMany({
        where: { id: { in: taskIds }, userId, deletedAt: null },
        data: updateData,
      });

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
    }
  );

  // 17. Batch delete tasks
  server.tool(
    "reader_batch_delete_tasks",
    "Soft-delete multiple tasks and their nested subtask trees in bulk, and delete all associated time sessions",
    {
      taskIds: z.array(z.string()).describe("Array of task UUIDs to soft-delete"),
    },
    async ({ taskIds }) => {
      const now = new Date();

      async function getAllDescendantTaskIds(tId: string): Promise<string[]> {
        const ids: string[] = [tId];
        const children = await prisma.task.findMany({
          where: { parentId: tId, userId, deletedAt: null },
          select: { id: true },
        });
        for (const c of children) {
          const subIds = await getAllDescendantTaskIds(c.id);
          ids.push(...subIds);
        }
        return ids;
      }

      const allTargetIdsSet = new Set<string>();
      for (const tId of taskIds) {
        const ids = await getAllDescendantTaskIds(tId);
        ids.forEach((id) => allTargetIdsSet.add(id));
      }
      const allTargetIds = Array.from(allTargetIdsSet);

      // 1. Delete all time sessions
      await prisma.time_session.deleteMany({
        where: { taskId: { in: allTargetIds }, userId },
      });

      // 2. Soft-delete all tasks
      const res = await prisma.task.updateMany({
        where: { id: { in: allTargetIds }, userId, deletedAt: null },
        data: { deletedAt: now, updatedAt: now },
      });

      // 3. Discard active timer if running on any of these tasks
      const active = await prisma.active_timer.findUnique({ where: { userId } });
      if (active && allTargetIds.includes(active.taskId)) {
        await prisma.active_timer.delete({ where: { userId } });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                deletedCount: res.count,
                affectedTaskIds: allTargetIds,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

function parseSmartDueDate(dateStr?: string | null): Date | null {
  if (!dateStr || dateStr === "null" || dateStr === "") return null;
  const lower = dateStr.toLowerCase().trim();
  const now = new Date();
  if (lower === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  if (lower === "tomorrow") {
    const tom = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return new Date(tom.getFullYear(), tom.getMonth(), tom.getDate(), 0, 0, 0);
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function createRecursiveSubtasks(
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
  listId: string | null,
  userId: string
): Promise<Array<{ id: string; title: string }>> {
  const results: Array<{ id: string; title: string }> = [];
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dueDate = parseSmartDueDate(item.dueDate);
    const created = await prisma.task.create({
      data: {
        userId,
        parentId,
        listId,
        title: item.title.trim(),
        description: item.description || null,
        priority: Math.max(1, Math.min(4, item.priority || 4)),
        status: item.status || "todo",
        dueDate,
        dueTime: item.dueTime || null,
        sortOrder: i + 1,
        totalTimeSeconds: 0,
        completedAt: item.status === "done" ? now : null,
        createdAt: now,
        updatedAt: now,
      },
    });

    results.push({ id: created.id, title: created.title });

    if (item.subtasks && item.subtasks.length > 0) {
      const nested = await createRecursiveSubtasks(item.subtasks, created.id, listId, userId);
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
