# Navigation, home, sign-in and breaks

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Includes the app launcher and switcher, shared app bar, Google sign-in, not-found screen, theme labels, quotes, breathing breaks and time-perspective panels. Removing promotional copy is a proposal, not an implemented layout change. Existing attributed quotations are not rewritten.

137 entries: 75 rewrite, 17 remove, 45 keep. Identical current/proposed pairs are grouped within this part of the app; all their source locations are listed. Some short entries are fragments of composed messages. See [generated labels](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) for their complete display patterns. Literal template expressions and escaped newlines are shown as source text, not executed.

| ID | Current text | Proposed text | Decision | Sources / notes |
| --- | --- | --- | --- | --- |
| N001 | 404 · do100x | 404 · do100x | Keep | [F089:11](D:/PersonalProjects/reader/reader-frontend/src/modules/home/not-found.tsx:11) |
| N002 | Page not found | Page not found | Keep | [F089:12](D:/PersonalProjects/reader/reader-frontend/src/modules/home/not-found.tsx:12) |
| N003 | This address doesn’t exist. Choose an application from the home page. | This page doesn’t exist. Go home to choose an app. | Rewrite | [F089:13](D:/PersonalProjects/reader/reader-frontend/src/modules/home/not-found.tsx:13) |
| N004 | Go to do100x home | Go home | Rewrite | [F089:14](D:/PersonalProjects/reader/reader-frontend/src/modules/home/not-found.tsx:14) |
| N005 | do100x.com · Your everyday toolkit | — | Remove | [F090:13](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:13) |
| N006 | Simple tools to read with clarity, stay on track and know your cash flow. | — | Remove | [F090:15](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:15) |
| N007 | Choose an application | Choose an app | Rewrite | [F090:17](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:17) |
| N008 | Open ${name} | Open ${name} | Keep | [F090:19](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:19) |
| N009 | Open | Open | Keep | [F090:23](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:23) |
| N010 | One Google account. All your tools. | — | Remove | [F090:26](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:26) |
| N011 | Built for your everyday. | — | Remove | [F090:26](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:26) |
| N012 | Google sign-in could not load. Check your connection or browser blockers, then retry. | Couldn’t load Google sign-in. Check your connection and browser blockers, then try again. | Rewrite | [F063:22](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-client.ts:22) |
| N013 | Google sign-in is unavailable | Google sign-in unavailable | Rewrite | [F064:50](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-sign-in.tsx:50) |
| N014 | Loading Google sign-in… | Loading Google sign-in… | Keep | [F064:59](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-sign-in.tsx:59) |
| N015 | Signing you in… | Signing you in… | Keep | [F064:60](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-sign-in.tsx:60) |
| N016 | Retry Google sign-in | Retry Google sign-in | Keep | [F064:62](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-sign-in.tsx:62) |
| N017 | Welcome to do100x | Sign in to do100x | Rewrite | [F065:18](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/page.tsx:18) |
| N018 | One Google account for Reader, Finance and Tasks. | Sign in to continue. | Rewrite | [F065:19](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/page.tsx:19) |
| N019 | Checking your session… | Checking sign-in… | Rewrite | [F065:21](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/page.tsx:21), [F066:12](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/provider/guard.tsx:12) |
| N020 | Retry | Retry | Keep | [F065:22](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/page.tsx:22), [F066:13](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/provider/guard.tsx:13) |
| N021 | Reader | Reader | Keep | [F067:6](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:6) |
| N022 | Read with clarity. | — | Remove | [F067:6](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:6) |
| N023 | Read, organize and revisit your Markdown. Understand more, one section at a time. | Read and organize your pages. | Rewrite | [F067:6](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:6) |
| N024 | Markdown · Learning | — | Remove | [F067:6](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:6) |
| N025 | Finance | Finance | Keep | [F067:7](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:7) |
| N026 | Know your cash flow. | — | Remove | [F067:7](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:7) |
| N027 | Track accounts and expenses. Plan upcoming bills and see what comes next. | Track spending and upcoming bills. | Rewrite | [F067:7](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:7) |
| N028 | Accounts · Forecasts | — | Remove | [F067:7](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:7) |
| N029 | Tasks | Tasks | Keep | [F067:8](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:8) |
| N030 | Make room for progress. | — | Remove | [F067:8](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:8) |
| N031 | Organize your priorities, focus on a task and keep track of your time. | Plan tasks and track your time. | Rewrite | [F067:8](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:8) |
| N032 | Planning · Time | — | Remove | [F067:8](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts:8) |
| N033 | do100x applications | Apps | Rewrite | [F068:17](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/apps-switcher.tsx:17) |
| N034 | Your do100x tools | — | Remove | [F068:18](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/apps-switcher.tsx:18) |
| N035 | All applications | Home | Rewrite | [F068:25](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/apps-switcher.tsx:25) |
| N036 | Switch applications | Switch apps | Rewrite | [F068:29](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/apps-switcher.tsx:29) |
| N037 | Apps | Apps | Keep | [F068:31](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/apps-switcher.tsx:31) |
| N038 | Light | Light | Keep | [F069:2](D:/PersonalProjects/reader/reader-frontend/src/modules/core/theme/theme.ts:2) |
| N039 | Dark | Dark | Keep | [F069:3](D:/PersonalProjects/reader/reader-frontend/src/modules/core/theme/theme.ts:3) |
| N040 | Forest Dark | Forest dark | Rewrite | [F069:4](D:/PersonalProjects/reader/reader-frontend/src/modules/core/theme/theme.ts:4) |
| N041 | do100x home | do100x home | Keep | [F070:6](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar-logo.tsx:6) |
| N042 | Feeling bored? Swipe inspirations | Take a break | Rewrite | [F071:34](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx:34) |
| N043 | Bored? | Take a break | Rewrite | [F071:38](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx:38) |
| N044 | User | User | Keep | [F071:43](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx:43) |
| N045 | Logged in as ${accountLabel} — Open Settings | Account settings — ${accountLabel} | Rewrite | [F071:48](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx:48), [F071:49](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx:49) |
| N046 | Logout | Sign out | Rewrite | [F072:30](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx:30) |
| N047 | Logged in as | Signed in as | Rewrite | [F072:34](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx:34) |
| N048 | Are you sure you want to sign out? | Sign out of do100x? | Rewrite | [F072:35](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx:35) |
| N049 | Cancel | Cancel | Keep | [F072:39](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx:39) |
| N050 | Sign out | Sign out | Keep | [F072:40](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx:40) |
| N051 | Box Breathing (4-4-4-4) | Box breathing (4–4–4–4) | Rewrite | [F073:26](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:26) |
| N052 | Reset focus, steady nerves, and eliminate brain fog | A breathing pattern with equal counts. | Rewrite | [F073:27](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:27) |
| N053 | 4-7-8 Calm Breath | 4–7–8 breathing | Rewrite | [F073:37](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:37) |
| N054 | Soothe the nervous system and release reading tension | A breathing pattern with a longer exhale. | Rewrite | [F073:38](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:38) |
| N055 | Quick Refresh (3-3-3) | Short breathing break (3–3–3) | Rewrite | [F073:48](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:48) |
| N056 | Fast 1-minute mental reset between study sections | A short pause between reading sessions. | Rewrite | [F073:49](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:49) |
| N057 | Inhale Slowly | Breathe in | Rewrite | [F073:147](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:147) |
| N058 | Breathe in through your nose, filling your lungs | Breathe in gently. | Rewrite | [F073:148](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:148) |
| N059 | Hold Gently | Hold | Rewrite | [F073:156](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:156) |
| N060 | Keep your chest open and muscles relaxed | Hold gently, without straining. | Rewrite | [F073:157](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:157) |
| N061 | Exhale Completely | Breathe out | Rewrite | [F073:165](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:165) |
| N062 | Release all tension out through your mouth | Breathe out gently. | Rewrite | [F073:166](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:166) |
| N063 | Pause &amp; Rest | Pause | Rewrite | [F073:174](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:174) |
| N064 | Feel the stillness before your next breath | Rest before the next breath. | Rewrite | [F073:175](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:175) |
| N065 | Deep Breathing Exercise | Breathing break | Rewrite | [F073:193](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:193) |
| N066 | Cycle # | Cycle # | Keep | [F073:238](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:238) |
| N067 | Pause | Pause | Keep | [F073:258](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:258) |
| N068 | Resume | Resume | Keep | [F073:258](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:258) |
| N069 | Restart Breathing Exercise | Restart breathing | Rewrite | [F073:263](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:263) |
| N070 | Inspirations &amp; Quotes | Quotes | Rewrite | [F073:276](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:276) |
| N071 | Resume Reading | Back to reading | Rewrite | [F073:283](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx:283) |
| N072 | Give yourself permission to pause. Stand up, stretch, take a drink of water, or rest your eyes. | Take a moment to stretch, get some water or rest your eyes. | Rewrite | [F074:46](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:46) |
| N073 | Fatigue is your brain's natural cue to consolidate memory. Stepping away now will make your next session sharper. | If you’re tired, pause and come back later. | Rewrite | [F074:51](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:51) |
| N074 | There is no guilt in calling it a day. Close your workspace, take a slow breath, and recharge. | You can finish for today. Your pages will be here when you return. | Rewrite | [F074:56](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:56) |
| N075 | Even a brief 10-minute break away from screens restores dopamine and resets cognitive bandwidth. | Take a few minutes away from the screen. | Rewrite | [F074:61](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:61) |
| N076 | Inspirations &amp; Perspective | Take a break | Rewrite | [F074:282](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:282) |
| N077 | Reflect, reset, and regain focus | — | Remove | [F074:285](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:285) |
| N078 | Mindful deep breathing exercise | Breathing break | Rewrite | [F074:305](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:305) |
| N079 | Deep Breath | Breathe | Rewrite | [F074:308](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:308) |
| N080 | Breathe | Breathe | Keep | [F074:309](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:309) |
| N081 | Step away and rest your mind | Take a break from the screen | Rewrite | [F074:326](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:326) |
| N082 | Take a Break | Take a break | Rewrite | [F074:329](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:329) |
| N083 | Break | Break | Keep | [F074:330](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:330) |
| N084 | Resume reading | Resume reading | Keep | [F074:337](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:337) |
| N085 | Continue Reading | Back to reading | Rewrite | [F074:340](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:340), [F074:436](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:436) |
| N086 | Close (Esc) | Close (Esc) | Keep | [F074:346](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:346) |
| N087 | Close | Close | Keep | [F074:347](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:347) |
| N088 | Permission to Pause | Time for a break | Rewrite | [F074:397](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:397) |
| N089 | Deep focus requires intentional recovery. Stepping away helps reset cognitive bandwidth and consolidate learning. | You can stop here and return when you’re ready. | Rewrite | [F074:400](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:400) |
| N090 | Reflection on Rest | — | Remove | [F074:408](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:408) |
| N091 | Mindful Break | Break | Rewrite | [F074:415](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:415) |
| N092 | Step Away for Now | Take a break | Rewrite | [F074:429](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:429) |
| N093 | Back to Quotes | Back to quotes | Rewrite | [F074:443](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:443) |
| N094 | Quote # | Quote # | Keep | [F074:468](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:468) |
| N095 | Author &amp; Thinker | — | Remove | [F074:488](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:488) |
| N096 | Practical Takeaway | A thought to try | Rewrite | [F074:496](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:496) |
| N097 | Read aloud | Read aloud | Keep | [F074:517](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:517), [F074:527](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:527) |
| N098 | Copied! | Copied | Rewrite | [F074:533](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:533) |
| N099 | Copy quote (C) | Copy quote (C) | Keep | [F074:533](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:533) |
| N100 | Copy quote | Copy quote | Keep | [F074:543](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:543) |
| N101 | Random quote (R) | Random quote (R) | Keep | [F074:549](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:549) |
| N102 | Random quote | Random quote | Keep | [F074:553](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:553) |
| N103 | Previous Quote (↑ / K) | Previous quote (↑ / K) | Rewrite | [F074:562](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:562) |
| N104 | Previous quote | Previous quote | Keep | [F074:566](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:566) |
| N105 | Next Quote (↓ / J / Space) | Next quote (↓ / J / Space) | Rewrite | [F074:571](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:571) |
| N106 | Next quote | Next quote | Keep | [F074:575](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:575) |
| N107 | Next | Next | Keep | [F074:577](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:577) |
| N108 | This Hour | This hour | Rewrite | [F075:51](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:51) |
| N109 | ${stats.secondsThisMinute}s remaining | ${stats.secondsThisMinute}s left in this minute | Rewrite | [F075:53](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:53) |
| N110 | Today | Today | Keep | [F075:61](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:61) |
| N111 | ~${Math.floor(stats.minutesToday / 60)}h ${stats.minutesToday % 60}m remaining | ~${Math.floor(stats.minutesToday / 60)}h ${stats.minutesToday % 60}m remaining | Keep | [F075:63](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:63) |
| N112 | This Week | This week | Rewrite | [F075:71](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:71) |
| N113 | ~${(stats.minutesThisWeek / (60 \* 24)).toFixed(1)} days remaining | ~${(stats.minutesThisWeek / (60 \* 24)).toFixed(1)} days remaining | Keep | [F075:73](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:73) |
| N114 | This Month | This month | Rewrite | [F075:81](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:81) |
| N115 | ~${Math.floor(stats.minutesThisMonth / (60 \* 24))} days remaining | ~${Math.floor(stats.minutesThisMonth / (60 \* 24))} days remaining | Keep | [F075:83](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:83) |
| N116 | This Year | This year | Rewrite | [F075:91](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:91) |
| N117 | ~${Math.floor(stats.minutesThisYear / (60 \* 24))} days remaining in ${new Date().getFullYear()} | ~${Math.floor(stats.minutesThisYear / (60 \* 24))} days remaining in ${new Date().getFullYear()} | Keep | [F075:93](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:93) |
| N118 | Time Perspective | Time perspective | Rewrite | [F075:113](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:113) |
| N119 | Real-time awareness across finite horizons | — | Remove | [F075:115](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:115) |
| N120 | Edit DOB &amp; expected lifespan | Edit birth date and lifespan estimate | Rewrite | [F075:132](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:132) |
| N121 | Save | Save | Keep | [F075:135](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:135) |
| N122 | Edit Targets | Edit estimate | Rewrite | [F075:135](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:135) |
| N123 | Date of Birth | Date of birth | Rewrite | [F075:144](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:144) |
| N124 | Expected Lifespan (Years) | Estimated lifespan (years) | Rewrite | [F075:153](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:153) |
| N125 | Estimated Lifetime Remaining | Time remaining based on your estimate | Rewrite | [F075:177](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:177) |
| N126 | minutes | minutes | Keep | [F075:188](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:188) |
| N127 | days | days | Keep | [F075:192](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:192) |
| N128 | years left | years in estimate | Rewrite | [F075:195](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:195) |
| N129 | % elapsed | % elapsed | Keep | [F075:198](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:198) |
| N130 | mins | min | Rewrite | [F075:240](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:240) |
| N131 | Why track time? | — | Remove | [F075:258](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:258) |
| N132 | Time is our only non-renewable resource. Read, reflect, and create with clear intent. | — | Remove | [F075:258](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx:258) |
| N133 | Theme | Theme | Keep | [F076:22](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/theme-selector/theme-selector.tsx:22), [F076:25](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/theme-selector/theme-selector.tsx:25) |
| N134 | Do everything 100 times better. | Your apps | Rewrite | [F090:14](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx:14)<br>Rendered message assembled from text and dynamic values. |
| N135 | "${current.quote}"\n— ${current.by}\n\nKey Takeaway: ${current.meaning} | "${current.quote}"\n— ${current.by}\n\n${current.meaning} | Rewrite | [F074:166](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx:166)<br>Copied quote wrapper; quote, attribution and returned commentary are not rewritten. |
| N136 | do100x — Your everyday tools | do100x | Rewrite | [F048:8](D:/PersonalProjects/reader/reader-frontend/index.html:8)<br>Browser tab title. |
| N137 | Reader, Finance and Tasks — simple tools to read with clarity, stay on track and know your cash flow. One Google account, one place. | Read, manage tasks and track your finances with do100x. | Rewrite | [F048:9](D:/PersonalProjects/reader/reader-frontend/index.html:9)<br>Search-result description, not landing-page body. |
