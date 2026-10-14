import { z } from 'zod';
import { formatTrackedDuration } from './duration';

export const TimeSessionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  durationSeconds: z.number().default(0),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
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
  readonly updatedAt?: string;

  constructor(data: TimeSessionData) {
    this.id = data.id;
    this.taskId = data.taskId;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.durationSeconds = data.durationSeconds;
    this.notes = data.notes;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get durationFormatted(): string {
    return formatTrackedDuration(this.durationSeconds);
  }
}
