# Tasks: lists, priorities, timers and time reports

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Includes task lists, subtasks, priority views, due dates, timers, manual time entries, confirmations and reports. Use time entry for a saved duration, timer for the running control and tracked time for totals. Lists remain lists, not projects.

168 entries: 109 rewrite, 2 remove, 57 keep. Identical current/proposed pairs are grouped within this part of the app; all their source locations are listed. Some short entries are fragments of composed messages. See [generated labels](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) for their complete display patterns. Literal template expressions and escaped newlines are shown as source text, not executed.

| ID | Current text | Proposed text | Decision | Sources / notes |
| --- | --- | --- | --- | --- |
| T001 | Cancel | Cancel | Keep | [F134:64](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/confirm-dialog.tsx:64), [F135:90](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:90), [F137:127](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:127), [F139:183](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:183) |
| T002 | Confirm | Confirm | Keep | [F134:81](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/confirm-dialog.tsx:81) |
| T003 | Edit List | Edit list | Rewrite | [F135:34](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:34), [F138:218](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:218) |
| T004 | Create New List | New list | Rewrite | [F135:34](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:34) |
| T005 | List Name | List name | Rewrite | [F135:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:51) |
| T006 | e.g. Work, Deep Reading, Side Project... | e.g. Work, Reading, Personal | Rewrite | [F135:54](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:54) |
| T007 | Accent Color | List color | Rewrite | [F135:64](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:64) |
| T008 | Update List | Save | Rewrite | [F135:98](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:98) |
| T009 | Create List | Create list | Rewrite | [F135:98](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx:98) |
| T010 | + Add to ${title}... | Add a task to ${title}… | Rewrite | [F136:47](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:47) |
| T011 | Enter | Enter | Keep | [F136:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:51), [F140:616](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:616), [F141:80](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:80) |
| T012 | No tasks in this quadrant | No tasks here. | Rewrite | [F136:81](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:81) |
| T013 | Eisenhower Priority Matrix | Priority matrix | Rewrite | [F136:149](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:149) |
| T014 | Organize and prioritize your daily focus based on urgency and importance. | Group tasks by urgency and importance. | Rewrite | [F136:151](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:151) |
| T015 | Loading priority matrix... | Loading priorities… | Rewrite | [F136:159](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:159) |
| T016 | Q1: Urgent &amp; Important | Urgent and important | Rewrite | [F136:165](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:165) |
| T017 | Do First — Critical &amp; time-sensitive goals | Do first | Rewrite | [F136:166](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:166) |
| T018 | Q2: Important, Not Urgent | Important, not urgent | Rewrite | [F136:182](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:182) |
| T019 | Schedule — High impact long-term goals | Schedule | Rewrite | [F136:183](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:183) |
| T020 | Q3: Urgent, Not Important | Urgent, not important | Rewrite | [F136:199](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:199) |
| T021 | Delegate / Quick — Interruptions &amp; errands | Delegate or do quickly | Rewrite | [F136:200](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:200) |
| T022 | Q4: Not Urgent &amp; Not Important | Neither urgent nor important | Rewrite | [F136:216](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:216) |
| T023 | Eliminate / Backlog — Low value distractions | Leave for later or remove | Rewrite | [F136:217](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx:217) |
| T024 | Edit Time Session | Edit time entry | Rewrite | [F137:23](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:23) |
| T025 | Log Time Session | Add time entry | Rewrite | [F137:23](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:23) |
| T026 | Focus Duration | Duration | Rewrite | [F137:41](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:41) |
| T027 | Subtract 5 minutes | Subtract 5 minutes | Keep | [F137:49](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:49), [F139:66](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:66) |
| T028 | min | min | Keep | [F137:64](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:64), [F139:80](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:80) |
| T029 | Add 5 minutes | Add 5 minutes | Keep | [F137:70](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:70), [F139:86](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:86) |
| T030 | m | m | Keep | [F137:90](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:90), [F139:56](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:56), [F139:106](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:106), [F139:123](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:123), [F139:133](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:133) |
| T031 | Date | Date | Keep | [F137:98](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:98) |
| T032 | Session Notes (Optional) | Notes (optional) | Rewrite | [F137:109](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:109) |
| T033 | What did you work on during this time? | What did you work on during this time? | Keep | [F137:114](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:114) |
| T034 | Update Session | Save | Rewrite | [F137:134](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:134) |
| T035 | Add Session | Add time entry | Rewrite | [F137:134](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx:134) |
| T036 | Inbox | Inbox | Keep | [F138:28](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:28), [F140:460](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:460), [F144:249](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:249) |
| T037 | Today | Today | Keep | [F138:35](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:35), [F140:404](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:404), [F141:149](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:149), [F141:173](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:173), [F142:12](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:12), [F144:250](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:250) |
| T038 | Next 7 Days | Next 7 days | Rewrite | [F138:46](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:46), [F144:251](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:251) |
| T039 | Eisenhower Matrix | Priority matrix | Rewrite | [F138:53](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:53), [F144:252](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:252) |
| T040 | Time Analytics | Time reports | Rewrite | [F138:60](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:60), [F144:253](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:253) |
| T041 | Completed | Completed | Keep | [F138:67](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:67) |
| T042 | Views | Views | Keep | [F138:80](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:80) |
| T043 | Lists | Lists | Keep | [F138:123](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:123) |
| T044 | Create new list | Create new list | Keep | [F138:128](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:128) |
| T045 | No custom lists. | No lists yet. | Rewrite | [F138:141](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:141) |
| T046 | Add List | Add list | Rewrite | [F138:148](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:148) |
| T047 | Delete List | Delete list | Rewrite | [F138:225](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:225), [F138:227](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:227), [F138:235](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:235) |
| T048 | Are you sure you want to delete "${list.name}"? Existing tasks will be moved to your Inbox. | Delete “${list.name}”? Its tasks will move to Inbox. | Rewrite | [F138:226](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx:226) |
| T049 | Record Focus Session | Save tracked time | Rewrite | [F139:26](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:26) |
| T050 | Recorded Duration | Duration | Rewrite | [F139:47](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:47) |
| T051 | Trim away time: | Subtract time | Rewrite | [F139:97](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:97) |
| T052 | Add time: | Add time | Rewrite | [F139:114](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:114) |
| T053 | m ( | m ( | Keep | [F139:136](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:136) |
| T054 | What did you accomplish? (Optional) | Notes (optional) | Rewrite | [F139:145](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:145) |
| T055 | e.g. Completed section review and drafted summary... | What did you work on? | Rewrite | [F139:151](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:151) |
| T056 | Discard Timer | Discard timer | Rewrite | [F139:164](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:164) |
| T057 | Are you sure you want to discard this timer without recording any time? | Discard this timer? Its time won’t be saved. | Rewrite | [F139:165](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:165) |
| T058 | Discard Session | Discard timer | Rewrite | [F139:166](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:166) |
| T059 | Discard | Discard | Keep | [F139:174](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:174) |
| T060 | P1 Urgent | P1 Urgent | Keep | [F140:28](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:28), [F141:23](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:23) |
| T061 | P2 High | P2 High | Keep | [F140:29](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:29), [F141:24](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:24) |
| T062 | P3 Medium | P3 Medium | Keep | [F140:30](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:30), [F141:25](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:25) |
| T063 | P4 Low | P4 Low | Keep | [F140:31](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:31), [F141:26](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:26) |
| T064 | Task Details &amp; Drill-Down Workspace | Task details | Rewrite | [F140:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:51) |
| T065 | Select any task from the list to view its full details, track focus time, and manage subtasks in a dedicated 50/50 split canvas. | Select a task to view its notes, subtasks and tracked time. | Rewrite | [F140:53](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:53) |
| T066 | Timer Running | Timer running | Rewrite | [F140:60](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:60) |
| T067 | Open Task → | Open task | Rewrite | [F140:74](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:74) |
| T068 | Loading task workspace... | Loading Tasks… | Rewrite | [F140:87](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:87) |
| T069 | Back to parent task | Back to parent task | Keep | [F140:123](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:123) |
| T070 | Back | Back | Keep | [F140:126](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:126) |
| T071 | Finish session | Save tracked time | Rewrite | [F140:186](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:186) |
| T072 | Start Focus | Start timer | Rewrite | [F140:195](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:195) |
| T073 | Log Past Time | Add time | Rewrite | [F140:224](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:224) |
| T074 | Delete Task | Delete task | Rewrite | [F140:231](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:231), [F140:233](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:233), [F140:241](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:241), [F141:385](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:385), [F141:387](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:387) |
| T075 | Are you sure you want to delete "${detail.title}" and all its subtasks? | Delete “${detail.title}” and all its subtasks? | Rewrite | [F140:232](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:232) |
| T076 | Close details | Close details | Keep | [F140:252](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:252) |
| T077 | Total Time Focused | Tracked time | Rewrite | [F140:272](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:272) |
| T078 | session | time entry | Rewrite | [F140:285](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:285) |
| T079 | Task title | Task title | Keep | [F140:314](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:314) |
| T080 | ${formattedDueDate}, Today | ${formattedDueDate}, Today | Keep | [F140:386](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:386) |
| T081 | Set Due Date | Set due date | Rewrite | [F140:386](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:386) |
| T082 | Tomorrow | Tomorrow | Keep | [F140:415](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:415), [F141:151](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:151), [F141:187](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:187) |
| T083 | Custom Date | Custom date | Rewrite | [F140:420](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:420) |
| T084 | Clear Date | Clear date | Rewrite | [F140:441](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:441), [F141:228](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:228) |
| T085 | 📥 Inbox | Inbox | Rewrite | [F140:478](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:478) |
| T086 | Write notes, thoughts, or task details here... | Add notes… | Rewrite | [F140:511](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:511) |
| T087 | Logged Focus Sessions | Time entries | Rewrite | [F140:521](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:521) |
| T088 | + Add Session | Add time | Rewrite | [F140:528](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:528) |
| T089 | Delete Session | Delete time entry | Rewrite | [F140:557](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:557), [F140:559](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:559) |
| T090 | Are you sure you want to delete this recorded session? | Delete this time entry? | Rewrite | [F140:558](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:558) |
| T091 | Subtasks | Subtasks | Keep | [F140:584](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:584) |
| T092 | Add a subtask to "${detail.title}"... (Press Enter) | Add a subtask… | Rewrite | [F140:612](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:612) |
| T093 | Add | Add | Keep | [F140:628](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:628), [F141:242](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:242) |
| T094 | No subtasks yet | No subtasks yet | Keep | [F140:640](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:640) |
| T095 | Start focus timer on subtask | Start timer for subtask | Rewrite | [F140:694](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:694) |
| T096 | Delete Subtask | Delete subtask | Rewrite | [F140:705](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:705), [F140:707](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:707) |
| T097 | Are you sure you want to delete "${subtask.title}"? | Delete “${subtask.title}”? | Rewrite | [F140:706](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:706) |
| T098 | Delete subtask | Delete subtask | Keep | [F140:713](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:713) |
| T099 | Open | Open | Keep | [F140:720](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:720) |
| T100 | pending • | pending • | Keep | [F141:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:51) |
| T101 | completed | completed | Keep | [F141:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:51) |
| T102 | Search... | Search tasks… | Rewrite | [F141:60](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:60) |
| T103 | Add task to ${store.activeListName}... | Add a task… | Rewrite | [F141:76](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:76) |
| T104 | Due | Due | Keep | [F141:153](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:153) |
| T105 | Quick Select | — | Remove | [F141:163](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:163) |
| T106 | Next Week | Next week | Rewrite | [F141:201](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:201) |
| T107 | Loading tasks... | Loading tasks… | Rewrite | [F141:252](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:252) |
| T108 | No tasks in this view | No tasks here. | Rewrite | [F141:259](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:259) |
| T109 | Add your first task above to get started. | Add a task above. | Rewrite | [F141:261](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:261) |
| T110 | Toggle live timer | Pause or resume timer | Rewrite | [F141:356](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:356) |
| T111 | Start stopwatch on task | Start timer | Rewrite | [F141:356](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:356) |
| T112 | Are you sure you want to delete "${task.title}"? | Delete “${task.title}”? | Rewrite | [F141:386](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx:386) |
| T113 | Yesterday | Yesterday | Keep | [F142:13](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:13) |
| T114 | 7 Days | 7 days | Rewrite | [F142:14](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:14) |
| T115 | 14 Days | 14 days | Rewrite | [F142:15](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:15) |
| T116 | 30 Days | 30 days | Rewrite | [F142:16](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:16) |
| T117 | All Time | All time | Rewrite | [F142:17](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:17) |
| T118 | Custom Range | Custom range | Rewrite | [F142:18](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:18) |
| T119 | Time &amp; Focus Analytics | Time tracked | Rewrite | [F142:35](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:35) |
| T120 | Detailed breakdown of how your focus time is allocated across projects and tasks. | See how much time you’ve tracked by task and list. | Rewrite | [F142:37](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:37) |
| T121 | to | to | Keep | [F142:72](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:72) |
| T122 | Apply | Apply | Keep | [F142:84](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:84) |
| T123 | Scope: | Scope: | Keep | [F142:92](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:92) |
| T124 | All Projects &amp; Lists | All lists | Rewrite | [F142:98](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:98) |
| T125 | 📥 Inbox Only | Inbox | Rewrite | [F142:99](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:99) |
| T126 | Calculating productivity insights... | Loading tracked time… | Rewrite | [F142:119](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:119) |
| T127 | Total Focus Time | Tracked time | Rewrite | [F142:128](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:128) |
| T128 | Sessions Logged | Time entries | Rewrite | [F142:140](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:140) |
| T129 | Recorded stopwatch sessions | Saved time entries | Rewrite | [F142:146](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:146) |
| T130 | Top Project | Most tracked list | Rewrite | [F142:152](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:152) |
| T131 | None | None | Keep | [F142:156](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:156) |
| T132 | Time by Project / List | Time by list | Rewrite | [F142:169](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:169) |
| T133 | No time sessions recorded in this time range. | No time recorded for these dates. | Rewrite | [F142:175](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:175) |
| T134 | h | h | Keep | [F142:190](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:190), [F142:242](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:242) |
| T135 | Top Tasks by Time Spent | Tasks by tracked time | Rewrite | [F142:215](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:215) |
| T136 | No tasks with recorded time in this window. | No tasks with tracked time for these dates. | Rewrite | [F142:221](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:221) |
| T137 | % of total | % of total | Keep | [F142:243](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:243) |
| T138 | Tasks | Tasks | Keep | [F143:48](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:48), [F144:260](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:260) |
| T139 | Beta | — | Remove | [F143:51](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:51) |
| T140 | Pause timer | Pause timer | Keep | [F143:72](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:72) |
| T141 | Resume timer | Resume timer | Keep | [F143:81](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:81) |
| T142 | Finish &amp; log session | Stop and save time | Rewrite | [F143:91](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:91) |
| T143 | Logged in as ${authStore.currentUser?.label &#124;&#124; 'User'} (Settings) | Account settings — ${authStore.currentUser?.label &#124;&#124; 'User'} | Rewrite | [F143:109](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:109) |
| T144 | User | User | Keep | [F143:109](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx:109) |
| T145 | List | List | Keep | [F144:94](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:94), [F144:258](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:258), [F144:427](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:427), [F144:437](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:437) |
| T146 | Completed Tasks | Completed tasks | Rewrite | [F144:254](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:254) |
| T147 | List name cannot be empty | Enter a list name. | Rewrite | [F144:444](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:444) |
| T148 | List updated | List updated | Keep | [F144:455](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:455) |
| T149 | List created | List created | Keep | [F144:468](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:468) |
| T150 | List deleted | List deleted | Keep | [F144:481](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:481) |
| T151 | Task created | Task created | Keep | [F144:628](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:628) |
| T152 | Task deleted | Task deleted | Keep | [F144:726](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:726) |
| T153 | Subtask added | Subtask added | Keep | [F144:778](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:778) |
| T154 | Timer started | Timer started | Keep | [F144:826](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:826) |
| T155 | Timer paused | Timer paused | Keep | [F144:842](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:842) |
| T156 | Timer resumed | Timer resumed | Keep | [F144:854](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:854) |
| T157 | Recorded session (${res.data.session.durationFormatted}) | Time saved (${res.data.session.durationFormatted}) | Rewrite | [F144:892](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:892) |
| T158 | Timer discarded | Timer discarded | Keep | [F144:910](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:910) |
| T159 | Session updated | Time entry updated | Rewrite | [F144:953](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:953) |
| T160 | Session added | Time entry added | Rewrite | [F144:966](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:966) |
| T161 | Session deleted | Time entry deleted | Rewrite | [F144:979](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:979) |
| T162 | All sessions deleted | All time entries deleted | Rewrite | [F144:989](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts:989) |
| T163 | Break down "${detail.title}" into smaller actionable subtasks above. You can drill down into any subtask to add its own nested steps. | Add a subtask to break this task into smaller steps. | Rewrite | [F140:642](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx:642)<br>Rendered message assembled from text and dynamic values. |
| T164 | Reset to ${actualMinutes}m | Reset to ${actualMinutes} min | Rewrite | [F139:56](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:56)<br>Rendered message assembled from text and dynamic values. |
| T165 | Save &amp; Record (${recordedMinutes}m) | Save ${recordedMinutes} min | Rewrite | [F139:191](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:191)<br>Rendered message assembled from text and dynamic values. |
| T166 | Timer: ${actualMinutes}m | Timer: ${actualMinutes} min | Rewrite | [F139:133](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx:133)<br>Rendered message assembled from text and dynamic values. |
| T167 | ${Math.round(data.byList\[0\].seconds / 3600)}h focused | ${Math.round(data.byList\[0\].seconds / 3600)}h tracked | Rewrite | [F142:159](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:159)<br>Rendered message assembled from text and dynamic values. |
| T168 | No data in this window | No time recorded for these dates. | Rewrite | [F142:159](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx:159)<br>Rendered message assembled from text and dynamic values. |
