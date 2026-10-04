# Source register and coverage

Draft for review · Source snapshot: 4 October 2026

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md)

The copy tables reference the following application source files. Source IDs are local to this review. Line links refer to this source snapshot and may move after implementation. These files contain the reviewed labels/messages; this is not a list of every code file scanned.

| Source ID | Application source |
| --- | --- |
| F001 | [packages/finance-core/src/csv.ts](D:/PersonalProjects/reader/packages/finance-core/src/csv.ts) |
| F002 | [packages/finance-core/src/dates.ts](D:/PersonalProjects/reader/packages/finance-core/src/dates.ts) |
| F003 | [packages/finance-core/src/forecast.ts](D:/PersonalProjects/reader/packages/finance-core/src/forecast.ts) |
| F004 | [packages/finance-core/src/money.ts](D:/PersonalProjects/reader/packages/finance-core/src/money.ts) |
| F005 | [packages/md-ast/src/internal/frontmatter.ts](D:/PersonalProjects/reader/packages/md-ast/src/internal/frontmatter.ts) |
| F006 | [packages/md-ast/src/json.ts](D:/PersonalProjects/reader/packages/md-ast/src/json.ts) |
| F007 | [packages/md-ast/src/parse-markdown.ts](D:/PersonalProjects/reader/packages/md-ast/src/parse-markdown.ts) |
| F008 | [packages/md-ast/src/section-edit.ts](D:/PersonalProjects/reader/packages/md-ast/src/section-edit.ts) |
| F009 | [packages/md-view/src/components/blocks/iframe.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/blocks/iframe.tsx) |
| F010 | [packages/md-view/src/components/code/code-block.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/code/code-block.tsx) |
| F011 | [packages/md-view/src/components/code/d2-block.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-block.tsx) |
| F012 | [packages/md-view/src/components/code/d2-diagram.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-diagram.tsx) |
| F013 | [packages/md-view/src/components/code/d2-fullscreen-modal.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/code/d2-fullscreen-modal.tsx) |
| F014 | [packages/md-view/src/components/code/mermaid-block.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-block.tsx) |
| F015 | [packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx](D:/PersonalProjects/reader/packages/md-view/src/components/code/mermaid-fullscreen-modal.tsx) |
| F016 | [reader-backend/src/auth/auth-router.ts](D:/PersonalProjects/reader/reader-backend/src/auth/auth-router.ts) |
| F017 | [reader-backend/src/auth/google.ts](D:/PersonalProjects/reader/reader-backend/src/auth/google.ts) |
| F018 | [reader-backend/src/chat.ts](D:/PersonalProjects/reader/reader-backend/src/chat.ts) |
| F019 | [reader-backend/src/comments.ts](D:/PersonalProjects/reader/reader-backend/src/comments.ts) |
| F020 | [reader-backend/src/finance/catalog-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/catalog-service.ts) |
| F021 | [reader-backend/src/finance/context.ts](D:/PersonalProjects/reader/reader-backend/src/finance/context.ts) |
| F022 | [reader-backend/src/finance/contract.ts](D:/PersonalProjects/reader/reader-backend/src/finance/contract.ts) |
| F023 | [reader-backend/src/finance/finance-router.ts](D:/PersonalProjects/reader/reader-backend/src/finance/finance-router.ts) |
| F024 | [reader-backend/src/finance/forecast-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/forecast-service.ts) |
| F025 | [reader-backend/src/finance/import-csv.ts](D:/PersonalProjects/reader/reader-backend/src/finance/import-csv.ts) |
| F026 | [reader-backend/src/finance/import-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/import-service.ts) |
| F027 | [reader-backend/src/finance/ledger-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/ledger-service.ts) |
| F028 | [reader-backend/src/finance/ledger-validation.ts](D:/PersonalProjects/reader/reader-backend/src/finance/ledger-validation.ts) |
| F029 | [reader-backend/src/finance/plan-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/plan-service.ts) |
| F030 | [reader-backend/src/finance/reconciliation-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/reconciliation-service.ts) |
| F031 | [reader-backend/src/finance/report-service.ts](D:/PersonalProjects/reader/reader-backend/src/finance/report-service.ts) |
| F032 | [reader-backend/src/model-config.ts](D:/PersonalProjects/reader/reader-backend/src/model-config.ts) |
| F033 | [reader-backend/src/page-content.ts](D:/PersonalProjects/reader/reader-backend/src/page-content.ts) |
| F034 | [reader-backend/src/pages.ts](D:/PersonalProjects/reader/reader-backend/src/pages.ts) |
| F035 | [reader-backend/src/quiz/attempt-service.ts](D:/PersonalProjects/reader/reader-backend/src/quiz/attempt-service.ts) |
| F036 | [reader-backend/src/quiz/evaluation-service.ts](D:/PersonalProjects/reader/reader-backend/src/quiz/evaluation-service.ts) |
| F037 | [reader-backend/src/quiz/quiz-contract.ts](D:/PersonalProjects/reader/reader-backend/src/quiz/quiz-contract.ts) |
| F038 | [reader-backend/src/quiz/quiz-router.ts](D:/PersonalProjects/reader/reader-backend/src/quiz/quiz-router.ts) |
| F039 | [reader-backend/src/quiz/quiz-service.ts](D:/PersonalProjects/reader/reader-backend/src/quiz/quiz-service.ts) |
| F040 | [reader-backend/src/reader/reader-preferences.ts](D:/PersonalProjects/reader/reader-backend/src/reader/reader-preferences.ts) |
| F041 | [reader-backend/src/session.ts](D:/PersonalProjects/reader/reader-backend/src/session.ts) |
| F042 | [reader-backend/src/task-lists.ts](D:/PersonalProjects/reader/reader-backend/src/task-lists.ts) |
| F043 | [reader-backend/src/tasks.ts](D:/PersonalProjects/reader/reader-backend/src/tasks.ts) |
| F044 | [reader-backend/src/timer.ts](D:/PersonalProjects/reader/reader-backend/src/timer.ts) |
| F045 | [reader-backend/src/user-models.ts](D:/PersonalProjects/reader/reader-backend/src/user-models.ts) |
| F046 | [reader-backend/src/user-preferences.ts](D:/PersonalProjects/reader/reader-backend/src/user-preferences.ts) |
| F047 | [reader-backend/src/vocabulary.ts](D:/PersonalProjects/reader/reader-backend/src/vocabulary.ts) |
| F048 | [reader-frontend/index.html](D:/PersonalProjects/reader/reader-frontend/index.html) |
| F049 | [reader-frontend/src/domain/auth/repos/auth-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/auth/repos/auth-repo-api.ts) |
| F050 | [reader-frontend/src/domain/chat/repos/chat-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/chat/repos/chat-repo-api.ts) |
| F051 | [reader-frontend/src/domain/comment/repos/comments-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/comment/repos/comments-repo-api.ts) |
| F052 | [reader-frontend/src/domain/dictionary/services/dictionary-service.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/dictionary/services/dictionary-service.ts) |
| F053 | [reader-frontend/src/domain/finance/repos/finance-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/finance/repos/finance-repo-api.ts) |
| F054 | [reader-frontend/src/domain/page/repos/page-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/page/repos/page-repo-api.ts) |
| F055 | [reader-frontend/src/domain/page/services/pages-service.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/page/services/pages-service.ts) |
| F056 | [reader-frontend/src/domain/settings/repos/settings-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/settings/repos/settings-repo-api.ts) |
| F057 | [reader-frontend/src/domain/tasks/models/task-list.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/tasks/models/task-list.ts) |
| F058 | [reader-frontend/src/domain/tasks/models/time-analytics.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/tasks/models/time-analytics.ts) |
| F059 | [reader-frontend/src/domain/tasks/repos/task-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/tasks/repos/task-repo-api.ts) |
| F060 | [reader-frontend/src/domain/vocabulary/repos/vocabulary-repo-api.ts](D:/PersonalProjects/reader/reader-frontend/src/domain/vocabulary/repos/vocabulary-repo-api.ts) |
| F061 | [reader-frontend/src/lib/md-parser/internal/frontmatter.ts](D:/PersonalProjects/reader/reader-frontend/src/lib/md-parser/internal/frontmatter.ts) |
| F062 | [reader-frontend/src/lib/md-parser/parse-markdown.ts](D:/PersonalProjects/reader/reader-frontend/src/lib/md-parser/parse-markdown.ts) |
| F063 | [reader-frontend/src/modules/auth/login/google-client.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-client.ts) |
| F064 | [reader-frontend/src/modules/auth/login/google-sign-in.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/google-sign-in.tsx) |
| F065 | [reader-frontend/src/modules/auth/login/page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/login/page.tsx) |
| F066 | [reader-frontend/src/modules/auth/provider/guard.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/auth/provider/guard.tsx) |
| F067 | [reader-frontend/src/modules/core/apps/app-catalog.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/app-catalog.ts) |
| F068 | [reader-frontend/src/modules/core/apps/apps-switcher.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/apps/apps-switcher.tsx) |
| F069 | [reader-frontend/src/modules/core/theme/theme.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/core/theme/theme.ts) |
| F070 | [reader-frontend/src/modules/core/ui/components/appbar/appbar-logo.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar-logo.tsx) |
| F071 | [reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/appbar.tsx) |
| F072 | [reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/appbar/logout-button.tsx) |
| F073 | [reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/deep-breath-panel.tsx) |
| F074 | [reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/motivation-reels-dialog.tsx) |
| F075 | [reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/motivation-reels/time-perspective-panel.tsx) |
| F076 | [reader-frontend/src/modules/core/ui/components/theme-selector/theme-selector.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/core/ui/components/theme-selector/theme-selector.tsx) |
| F077 | [reader-frontend/src/modules/finance/components/catalog-forms.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/catalog-forms.tsx) |
| F078 | [reader-frontend/src/modules/finance/components/common.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/common.tsx) |
| F079 | [reader-frontend/src/modules/finance/components/import-panels.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/import-panels.tsx) |
| F080 | [reader-frontend/src/modules/finance/components/ledger-panels.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/ledger-panels.tsx) |
| F081 | [reader-frontend/src/modules/finance/components/manage-panels.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/manage-panels.tsx) |
| F082 | [reader-frontend/src/modules/finance/components/plan-panels.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/plan-panels.tsx) |
| F083 | [reader-frontend/src/modules/finance/components/report-panels.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/report-panels.tsx) |
| F084 | [reader-frontend/src/modules/finance/components/transaction-form.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/components/transaction-form.tsx) |
| F085 | [reader-frontend/src/modules/finance/format.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/format.ts) |
| F086 | [reader-frontend/src/modules/finance/page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/page.tsx) |
| F087 | [reader-frontend/src/modules/finance/store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/store.ts) |
| F088 | [reader-frontend/src/modules/finance/transaction-draft.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/finance/transaction-draft.ts) |
| F089 | [reader-frontend/src/modules/home/not-found.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/home/not-found.tsx) |
| F090 | [reader-frontend/src/modules/home/page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/home/page.tsx) |
| F091 | [reader-frontend/src/modules/page/components/ai-lookup-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx) |
| F092 | [reader-frontend/src/modules/page/components/appbar.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx) |
| F093 | [reader-frontend/src/modules/page/components/comments-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx) |
| F094 | [reader-frontend/src/modules/page/components/delete-page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/delete-page.tsx) |
| F095 | [reader-frontend/src/modules/page/components/dictionary-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx) |
| F096 | [reader-frontend/src/modules/page/components/doubt-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx) |
| F097 | [reader-frontend/src/modules/page/components/empty-page-placeholder.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx) |
| F098 | [reader-frontend/src/modules/page/components/explanation-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx) |
| F099 | [reader-frontend/src/modules/page/components/main-content.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/main-content.tsx) |
| F100 | [reader-frontend/src/modules/page/components/meaning-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx) |
| F101 | [reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx) |
| F102 | [reader-frontend/src/modules/page/components/page-skeleton-loader.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/page-skeleton-loader.tsx) |
| F103 | [reader-frontend/src/modules/page/components/section-edit-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx) |
| F104 | [reader-frontend/src/modules/page/components/section-reader.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-reader.tsx) |
| F105 | [reader-frontend/src/modules/page/components/selection-popover.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx) |
| F106 | [reader-frontend/src/modules/page/components/settings.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx) |
| F107 | [reader-frontend/src/modules/page/components/share-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx) |
| F108 | [reader-frontend/src/modules/page/components/start-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/start-panel.tsx) |
| F109 | [reader-frontend/src/modules/page/components/subpage-item.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpage-item.tsx) |
| F110 | [reader-frontend/src/modules/page/components/subpages.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx) |
| F111 | [reader-frontend/src/modules/page/components/toc.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx) |
| F112 | [reader-frontend/src/modules/page/components/upsert-page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx) |
| F113 | [reader-frontend/src/modules/page/components/vocabulary-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx) |
| F114 | [reader-frontend/src/modules/page/dictionary-store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/dictionary-store.ts) |
| F115 | [reader-frontend/src/modules/page/doubt-store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts) |
| F116 | [reader-frontend/src/modules/page/explanation-store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts) |
| F117 | [reader-frontend/src/modules/page/meaning-store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts) |
| F118 | [reader-frontend/src/modules/page/quizzes/quiz-api.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-api.ts) |
| F119 | [reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx) |
| F120 | [reader-frontend/src/modules/page/quizzes/quiz-draft.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts) |
| F121 | [reader-frontend/src/modules/page/quizzes/quiz-editor.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx) |
| F122 | [reader-frontend/src/modules/page/quizzes/quiz-panel.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx) |
| F123 | [reader-frontend/src/modules/page/quizzes/quiz-preview.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx) |
| F124 | [reader-frontend/src/modules/page/theme/page-color-schema.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-color-schema.ts) |
| F125 | [reader-frontend/src/modules/page/theme/page-font-families.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-families.ts) |
| F126 | [reader-frontend/src/modules/page/theme/page-font-sizes.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-sizes.ts) |
| F127 | [reader-frontend/src/modules/page/theme/page-heading-level.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-heading-level.ts) |
| F128 | [reader-frontend/src/modules/page/theme/page-subpage-group.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-group.ts) |
| F129 | [reader-frontend/src/modules/page/theme/page-subpage-sort.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-sort.ts) |
| F130 | [reader-frontend/src/modules/page/view.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/page/view.tsx) |
| F131 | [reader-frontend/src/modules/reader/home.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/reader/home.tsx) |
| F132 | [reader-frontend/src/modules/settings/page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx) |
| F133 | [reader-frontend/src/modules/settings/store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts) |
| F134 | [reader-frontend/src/modules/tasks/components/confirm-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/confirm-dialog.tsx) |
| F135 | [reader-frontend/src/modules/tasks/components/list-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/list-dialog.tsx) |
| F136 | [reader-frontend/src/modules/tasks/components/matrix-view.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/matrix-view.tsx) |
| F137 | [reader-frontend/src/modules/tasks/components/session-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/session-dialog.tsx) |
| F138 | [reader-frontend/src/modules/tasks/components/sidebar.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/sidebar.tsx) |
| F139 | [reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/stop-timer-dialog.tsx) |
| F140 | [reader-frontend/src/modules/tasks/components/task-detail-pane.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-detail-pane.tsx) |
| F141 | [reader-frontend/src/modules/tasks/components/task-list-pane.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/task-list-pane.tsx) |
| F142 | [reader-frontend/src/modules/tasks/components/time-analytics-view.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/components/time-analytics-view.tsx) |
| F143 | [reader-frontend/src/modules/tasks/page.tsx](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/page.tsx) |
| F144 | [reader-frontend/src/modules/tasks/store.ts](D:/PersonalProjects/reader/reader-frontend/src/modules/tasks/store.ts) |

## Scope covered

- Production frontend modules: home, authentication, shared navigation/theme/break controls, Reader/page tools/quizzes, settings, Tasks and Finance.
- Frontend domain/API fallback messages that can be shown in the interface.
- Shared Markdown rendering/parsing and finance helpers whose messages may reach a user.
- Backend API/service errors, custom validation, default labels and warnings returned to the frontend.
- HTML browser title and description, accessibility labels, tooltips, placeholders, loading states, toast messages, confirmations and empty states.
- Generated display labels and composed messages, listed separately.

## Deliberately not rewritten

| Content | Reason |
| --- | --- |
| User pages, questions, answers, comments, names and statement descriptions | User content, not fixed product wording. |
| Attributed quotations and their authors | Preserve the original quotation and attribution. Product-owned surrounding labels are reviewed. |
| AI-generated replies, quote commentary and imported source fields | Dynamic content, not a fixed copy catalog. |
| AI system/user prompt templates | Model behavior instructions, not interface microcopy. Exported question/context headings are included when they are product-owned visible formatting. |
| MCP tool schemas, descriptions and client instructions | Technical integration contracts; no MCP/security redesign is part of this task. Existing MCP settings labels and helper copy are included. |
| The complete Markdown/LLM format reference | Technical reference content, not marketing or control copy. Its heading, explanation and copy actions are included. |
| SQL, CSS/font stacks, DOM keys, request/event names, machine enums and internal IDs | Implementation details. Their human-readable display labels are covered where applicable. |
| Console logs, provider hooks/invariants, tests, scripts and unreachable demo screens | Developer-only or non-production content. |
| Native browser/Google wording and third-party runtime diagnostics | Not fully controlled or enumerable as static application copy; see generated-label guidance. |

## Review method and limits

Source-based inventory with component, domain and backend message inspection; repeated labels are grouped and each recommendation is linked back to source. The tables include unchanged copy so “not listed among rewrites” does not mean “missed.” Longer safety messages were shortened without dropping the corresponding restrictions.

This is a draft copy review, not a browser/visual review. No application tests, production builds, migrations or browser checks were run for this task. No runtime code, navigation behavior, dependencies, authentication, database data or API/MCP contracts were changed. Existing uncommitted application changes were left untouched.
