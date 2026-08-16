import { z } from 'zod';

export const TaskListSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().default(0),
  taskCount: z.number().default(0),
  uncompletedCount: z.number().default(0),
  totalTimeSeconds: z.number().default(0),
  createdAt: z.string().optional().default(() => new Date().toISOString()),
  updatedAt: z.string().optional().default(() => new Date().toISOString()),
});

export type TaskListData = z.infer<typeof TaskListSchema>;

export class TaskList {
  readonly id: string;
  readonly name: string;
  readonly color?: string | null;
  readonly icon?: string | null;
  readonly sortOrder: number;
  readonly taskCount: number;
  readonly uncompletedCount: number;
  readonly totalTimeSeconds: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(data: TaskListData) {
    this.id = data.id;
    this.name = data.name;
    this.color = data.color || '#3b82f6';
    this.icon = data.icon || 'List';
    this.sortOrder = data.sortOrder;
    this.taskCount = data.taskCount;
    this.uncompletedCount = data.uncompletedCount;
    this.totalTimeSeconds = data.totalTimeSeconds;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get totalTimeFormatted(): string {
    if (!this.totalTimeSeconds || this.totalTimeSeconds <= 0) return '0m';
    const hours = Math.floor(this.totalTimeSeconds / 3600);
    const minutes = Math.floor((this.totalTimeSeconds % 3600) / 60);
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
  }
}
