import { randomUUID } from "node:crypto";

export function taskRow(id: string, parentId: string | null = null, listId: string | null = "list-a", userId = "owner") {
  return { id, parentId, listId, userId, title: id, description: "Keep notes", status: "todo", priority: 2, dueDate: new Date("2026-10-09"), dueTime: "12:00", sortOrder: 1, totalTimeSeconds: 91, completedAt: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null as Date | null };
}

export function createTaskMemory() {
  const state = { tasks: [] as any[], lists: [] as any[] };
  function matches(row: any, where: any = {}) {
    return Object.entries(where).every(([key, value]: any) => {
      if (key === "OR") return value.some((clause: any) => matches(row, clause));
      if (value && typeof value === "object" && "in" in value) return value.in.includes(row[key]);
      if (value && typeof value === "object" && "notIn" in value) return !value.notIn.includes(row[key]);
      if (value && typeof value === "object" && "contains" in value) return (row[key] ?? "").includes(value.contains);
      if (value && typeof value === "object" && ["gte", "lte", "gt", "lt"].some(op => op in value)) {
        return row[key] != null && (value.gte === undefined || row[key] >= value.gte) &&
          (value.lte === undefined || row[key] <= value.lte) && (value.gt === undefined || row[key] > value.gt) &&
          (value.lt === undefined || row[key] < value.lt);
      }
      return row[key] === value;
    });
  }
  function model(key: "tasks" | "lists") {
    return {
      findFirst: async ({ where }: any) => { const row = state[key].find(row => matches(row, where)); return row ? { ...row } : null; },
      findMany: async ({ where }: any = {}) => state[key].filter(row => matches(row, where)).map(row => ({ ...row })),
      aggregate: async ({ where }: any) => ({ _max: { sortOrder: Math.max(0, ...state[key].filter(row => matches(row, where)).map(row => row.sortOrder)) } }),
      create: async ({ data }: any) => {
        const row = key === "tasks" ? { ...taskRow(randomUUID(), null, null), priority: 4, dueDate: null, dueTime: null, totalTimeSeconds: 0, description: null, ...data } : { id: randomUUID(), deletedAt: null, ...data };
        state[key].push(row); return { ...row };
      },
      update: async ({ where, data }: any) => {
        const row = state[key].find(row => matches(row, where));
        if (!row) throw new Error("Missing row");
        Object.assign(row, data); return { ...row };
      },
      updateMany: async ({ where, data }: any) => {
        const rows = state[key].filter(row => matches(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length };
      },
      groupBy: async () => [],
    };
  }
  const db = {
    task: model("tasks"), task_list: model("lists"),
    appuser: { findUnique: async ({ where }: any) => ["owner", "visitor"].includes(where.id) ? { id: where.id } : null },
    auth_identity: { findUnique: async ({ where }: any) => ({ userId: where.userId_provider.userId }) },
    time_session: { findMany: async () => [] }, active_timer: { findUnique: async () => null },
    $transaction: async (action: (tx: any) => Promise<any>, _options?: any) => {
      const snapshot = structuredClone(state);
      try { return await action(db); }
      catch (error) { state.tasks = snapshot.tasks; state.lists = snapshot.lists; throw error; }
    },
    state,
    reset() {
      state.tasks = [taskRow("root"), taskRow("child", "root"), taskRow("grandchild", "child"), taskRow("other", null, "list-b"), taskRow("foreign", null, "list-x", "visitor")];
      state.lists = [
        { id: "list-a", name: "Data Agent", userId: "owner", deletedAt: null, color: "#123", icon: "List" },
        { id: "list-b", name: "Other list", userId: "owner", deletedAt: null },
        { id: "list-x", name: "Private", userId: "visitor", deletedAt: null },
      ];
    },
  };
  db.reset();
  return db;
}
