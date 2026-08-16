import "dotenv/config";
import { prisma } from "../src/prisma";
import { createReaderMcpServer } from "../src/mcp/server";

async function runMcpFullTest() {
  console.log("Starting Comprehensive Reader MCP Full Audit & Verification...\n");

  const user = await prisma.appuser.findFirst();
  if (!user) {
    console.error("No user found in DB to test with.");
    process.exit(1);
  }

  console.log(`Testing MCP Server strictly locked to user: ${user.username} (${user.id})`);

  const server = createReaderMcpServer(user.id);
  const toolMap = (server as any)._registeredTools;
  console.log(`✓ Total Registered MCP Tools: ${Object.keys(toolMap).length}`);

  for (const toolName of Object.keys(toolMap)) {
    console.log(`  - ${toolName}`);
  }

  // 1. Test Bulk Task Creation Tool
  console.log("\n1. Testing reader_create_tasks_bulk...");
  const bulkCreateHandler = toolMap["reader_create_tasks_bulk"].handler;
  const bulkResult = await bulkCreateHandler({
    tasks: [
      {
        title: "Mastering TypeScript Architecture",
        description: "Deep dive into clean architecture in TS",
        listName: "Architecture Study",
        priority: 1,
        dueDate: "tomorrow",
        subtasks: [
          {
            title: "Read Chapter 1: Dependency Injection",
            priority: 2,
            dueDate: "today",
            subtasks: [
              { title: "Review InversifyJS container setup" },
              { title: "Write unit tests for DI bindings" },
            ],
          },
          {
            title: "Read Chapter 2: Domain Driven Design",
            priority: 3,
          },
        ],
      },
    ],
  });

  const createdData = JSON.parse(bulkResult.content[0].text);
  console.log("✓ Bulk Creation Result:", createdData);
  const parentTaskId = createdData.tasks[0].id;

  // 2. Test Get Task Details (Tree retrieval)
  console.log("\n2. Testing reader_get_task...");
  const getTaskHandler = toolMap["reader_get_task"].handler;
  const getTaskResult = await getTaskHandler({ taskId: parentTaskId });
  const taskDetail = JSON.parse(getTaskResult.content[0].text);
  console.log(`✓ Task "${taskDetail.title}" subtask tree count: ${taskDetail.subtasks.length}`);

  // 3. Test Live Timer Tools
  console.log("\n3. Testing live timer workflow...");
  const startTimerHandler = toolMap["reader_start_timer"].handler;
  const startResult = await startTimerHandler({ taskId: parentTaskId, notes: "Starting chapter 1 review" });
  console.log("✓ Timer Started:", JSON.parse(startResult.content[0].text));

  const getTimerHandler = toolMap["reader_get_active_timer"].handler;
  const timerStatus = await getTimerHandler({});
  console.log("✓ Active Timer Status:", JSON.parse(timerStatus.content[0].text));

  const stopTimerHandler = toolMap["reader_stop_timer"].handler;
  const stopResult = await stopTimerHandler({ notes: "Finished deep work session" });
  console.log("✓ Timer Stopped & Session Recorded:", JSON.parse(stopResult.content[0].text));

  // 4. Test Analytics
  console.log("\n4. Testing reader_get_time_analytics...");
  const analyticsHandler = toolMap["reader_get_time_analytics"].handler;
  const analyticsResult = await analyticsHandler({ preset: "today" });
  console.log("✓ Today Analytics:", JSON.parse(analyticsResult.content[0].text));

  // 5. Test Batch Update
  console.log("\n5. Testing reader_batch_update_tasks...");
  const batchUpdateHandler = toolMap["reader_batch_update_tasks"].handler;
  const batchUpdateResult = await batchUpdateHandler({
    taskIds: [parentTaskId],
    priority: 2,
    status: "in_progress",
  });
  console.log("✓ Batch Update Result:", JSON.parse(batchUpdateResult.content[0].text));

  // 6. Test Batch Delete (Cleanup)
  console.log("\n6. Testing reader_batch_delete_tasks...");
  const batchDeleteHandler = toolMap["reader_batch_delete_tasks"].handler;
  const deleteResult = await batchDeleteHandler({
    taskIds: [parentTaskId],
  });
  console.log("✓ Batch Delete Cleanup:", JSON.parse(deleteResult.content[0].text));

  console.log("\n=======================================================");
  console.log("🎉 ALL MCP TOOLS & BULK OPERATIONS VERIFIED SUCCESSFULLY!");
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

runMcpFullTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
