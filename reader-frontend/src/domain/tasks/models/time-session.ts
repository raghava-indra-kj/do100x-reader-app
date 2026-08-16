import { z } from 'zod';

export const TimeSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  durationSeconds: z.number().default(0),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type TimeSessionData = z.infer<typeof TimeSessionSchema>;

export class TimeSession {
  readonly id: string;
  readonly taskId: string;
  readonly startTime: string;
  readonly endTime?: string | null;
  readonly durationSeconds: number;
  readonly notes?: string | null;
  readonly createdAt?: string;

  constructor(data: TimeSessionData) {
    this.id = data.id;
    this.taskId = data.taskId;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.durationSeconds = data.durationSeconds;
    this.notes = data.notes;
    this.createdAt = data.createdAt;
  }

  get durationFormatted(): string {
    const hours = Math.floor(this.durationSeconds / 3600);
    const minutes = Math.floor((this.durationSeconds % 3600) / 60);
    const seconds = this.durationSeconds % 60;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
