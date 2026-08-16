import { z } from 'zod';

export const TaskListSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

export type TaskListSummary = z.infer<typeof TaskListSummarySchema>;

export const TaskSchema = z.object({
  id: z.string(),
  listId: z.string().nullable().optional(),
  list: TaskListSummarySchema.nullable().optional(),
  parentId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
  priority: z.number().default(4),
  dueDate: z.string().nullable().optional(),
  dueTime: z.string().nullable().optional(),
  sortOrder: z.number().default(0),
  totalTimeSeconds: z.number().default(0),
  subtaskCount: z.number().default(0),
  completedSubtaskCount: z.number().default(0),
  completedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskData = z.infer<typeof TaskSchema>;

export class Task {
  readonly id: string;
  readonly listId?: string | null;
  readonly list?: TaskListSummary | null;
  readonly parentId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  readonly priority: number;
  readonly dueDate?: string | null;
  readonly dueTime?: string | null;
  readonly sortOrder: number;
  readonly totalTimeSeconds: number;
  readonly subtaskCount: number;
  readonly completedSubtaskCount: number;
  readonly completedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(data: TaskData) {
    this.id = data.id;
    this.listId = data.listId;
    this.list = data.list;
    this.parentId = data.parentId;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.dueDate = data.dueDate;
    this.dueTime = data.dueTime;
    this.sortOrder = data.sortOrder;
    this.totalTimeSeconds = data.totalTimeSeconds;
    this.subtaskCount = data.subtaskCount;
    this.completedSubtaskCount = data.completedSubtaskCount;
    this.completedAt = data.completedAt;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get isDone(): boolean {
    return this.status === 'done';
  }

  get priorityLabel(): string {
    return `P${this.priority}`;
  }

  get totalTimeFormatted(): string {
    if (!this.totalTimeSeconds || this.totalTimeSeconds <= 0) return '';
    const hours = Math.floor(this.totalTimeSeconds / 3600);
    const minutes = Math.floor((this.totalTimeSeconds % 3600) / 60);
    const seconds = this.totalTimeSeconds % 60;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
