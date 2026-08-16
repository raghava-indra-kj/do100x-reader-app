import { z } from 'zod';

export const TaskTimeAnalyticsSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  listName: z.string().default('Inbox'),
  seconds: z.number().default(0),
});

export const ListTimeAnalyticsSchema = z.object({
  listId: z.string().nullable().optional(),
  name: z.string(),
  color: z.string().default('#3b82f6'),
  seconds: z.number().default(0),
});

export const TimeAnalyticsSchema = z.object({
  periodDays: z.number().default(7),
  totalSeconds: z.number().default(0),
  sessionsCount: z.number().default(0),
  byTask: z.array(TaskTimeAnalyticsSchema).default([]),
  byList: z.array(ListTimeAnalyticsSchema).default([]),
  dailyTimeline: z.record(z.string(), z.number()).default({}),
});

export type TimeAnalyticsData = z.infer<typeof TimeAnalyticsSchema>;

export class TimeAnalytics {
  readonly periodDays: number;
  readonly totalSeconds: number;
  readonly sessionsCount: number;
  readonly byTask: Array<{ taskId: string; title: string; listName: string; seconds: number }>;
  readonly byList: Array<{ listId?: string | null; name: string; color: string; seconds: number }>;
  readonly dailyTimeline: Record<string, number>;

  constructor(data: TimeAnalyticsData) {
    this.periodDays = data.periodDays;
    this.totalSeconds = data.totalSeconds;
    this.sessionsCount = data.sessionsCount;
    this.byTask = data.byTask;
    this.byList = data.byList;
    this.dailyTimeline = data.dailyTimeline;
  }

  get totalFormatted(): string {
    const hours = Math.floor(this.totalSeconds / 3600);
    const minutes = Math.floor((this.totalSeconds % 3600) / 60);
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return `${minutes}m`;
  }
}
