import { z } from 'zod';

export const ActiveTimerSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  taskTitle: z.string().optional(),
  taskPriority: z.number().optional(),
  listId: z.string().nullable().optional(),
  startTime: z.string().optional().default(() => new Date().toISOString()),
  accumulatedSeconds: z.number().default(0),
  currentElapsedSeconds: z.number().default(0),
  isPaused: z.boolean().default(false),
  pausedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ActiveTimerData = z.infer<typeof ActiveTimerSchema>;

export class ActiveTimer {
  readonly id: string;
  readonly taskId: string;
  readonly taskTitle?: string;
  readonly taskPriority?: number;
  readonly listId?: string | null;
  readonly startTime: string;
  readonly accumulatedSeconds: number;
  readonly currentElapsedSeconds: number;
  readonly isPaused: boolean;
  readonly pausedAt?: string | null;
  readonly notes?: string | null;

  constructor(data: ActiveTimerData) {
    this.id = data.id;
    this.taskId = data.taskId;
    this.taskTitle = data.taskTitle;
    this.taskPriority = data.taskPriority;
    this.listId = data.listId;
    this.startTime = data.startTime || new Date().toISOString();
    this.accumulatedSeconds = data.accumulatedSeconds;
    this.currentElapsedSeconds = data.currentElapsedSeconds;
    this.isPaused = data.isPaused;
    this.pausedAt = data.pausedAt;
    this.notes = data.notes;
  }
}
