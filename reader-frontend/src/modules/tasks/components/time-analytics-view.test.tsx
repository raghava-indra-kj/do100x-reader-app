import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  TimeAnalytics,
  TimeAnalyticsSchema,
} from "@domain/tasks/models/time-analytics";
import { formatTrackedDuration } from "@domain/tasks/models/duration";
import type { TasksStore } from "../store";
import { TimeAnalyticsView } from "./time-analytics-view";

describe("tracked time reports", () => {
  it.each([
    [0, "0s"],
    [9, "9s"],
    [65, "1m 5s"],
    [1500, "25m"],
    [3661, "1h 1m 1s"],
  ])("preserves %s seconds in the display", (seconds, expected) => {
    expect(formatTrackedDuration(Number(seconds))).toBe(expected);
  });
  it("shows exact short sessions and preserves deleted history without dead task links", () => {
    const analyticsData = new TimeAnalytics(
      TimeAnalyticsSchema.parse({
        totalSeconds: 74,
        sessionsCount: 2,
        byList: [{ listId: null, name: "Inbox", seconds: 74 }],
        byTask: [
          { taskId: "live", title: "Read a paragraph", seconds: 9 },
          {
            taskId: "deleted",
            title: "Archived research",
            seconds: 65,
            deleted: true,
          },
        ],
      }),
    );
    const store = {
      analyticsData,
      analyticsPreset: "7",
      analyticsListId: "all",
      lists: [],
    } as unknown as TasksStore;
    const html = renderToStaticMarkup(<TimeAnalyticsView store={store} />);
    expect(html).toContain("1m 14s tracked");
    expect(html).toContain(">9s<");
    expect(html).toContain(">1m 5s<");
    expect(html).toContain('aria-label="Open task Read a paragraph"');
    expect(html).toContain("Deleted task · time retained");
    expect(html).not.toContain('aria-label="Open task Archived research"');
    expect(html).not.toContain(">0h");
    expect(analyticsData.totalFormatted).toBe("1m 14s");
  });
});
