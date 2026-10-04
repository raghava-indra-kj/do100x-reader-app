# Custom in-app confirmations

Approved replacements: delete all comments, discard section changes, discard quiz changes and discard unsaved quiz answers.

- All four use one controlled ConfirmationDialog built from the existing Dialog and Button primitives, with linked title/description and the safe action first.
- Nested editor confirmations are rendered inside their parent dialog tree. The optional stacked presentation lifts their backdrop and popup above the full-screen editor; ordinary dialogs retain their existing layering.
- Cancel, Escape or backdrop dismissal closes only the confirmation and keeps the draft. Clean editors close directly. Pending saves/answer operations cannot discard or close through the confirmation.
- Delete-all-comments is bound to the page ID selected when the confirmation opens. Page changes dismiss it; responses for another page do not replace the current comments. A synchronous submission guard blocks repeat deletions. Failures remain visible in the confirmation and allow retry.
- Native beforeunload protection in the three editors remains unchanged: browsers own the reload/tab-close warning, which cannot be replaced by an in-app modal.
- Existing Tasks, Finance, sign-out and page-delete dialogs are outside this change and remain unchanged.

Added shared-dialog presentation tests, not run. Builds, tests, type checks and browser checks remain deferred. Runtime verification should cover nested Escape/backdrop/focus behavior, cancellation preserving drafts, clean versus dirty closes, pending operations, deletion failures/retries and page changes during deletion.
