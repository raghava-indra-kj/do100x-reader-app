# Quizzes: editing, attempts and feedback

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Includes question authoring, options, answer fields, quiz versions, attempts, submission warnings, feedback and archived quizzes. Objective and Subjective remain the two question types. Submission immutability and old-version attempt behavior are preserved.

126 entries: 52 rewrite, 2 remove, 72 keep. Identical current/proposed pairs are grouped within this part of the app; all their source locations are listed. Some short entries are fragments of composed messages. See [generated labels](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) for their complete display patterns. Literal template expressions and escaped newlines are shown as source text, not executed.

| ID | Current text | Proposed text | Decision | Sources / notes |
| --- | --- | --- | --- | --- |
| Q001 | Discard unsaved answers? | Discard your unsaved answers? | Rewrite | [F119:42](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:42) |
| Q002 | Could not save answers | Couldn’t save your answers. Try again. | Rewrite | [F119:57](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:57) |
| Q003 | Could not submit attempt | Couldn’t submit your answers. Try again. | Rewrite | [F119:70](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:70) |
| Q004 | Opening quiz… | Opening quiz… | Keep | [F119:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:77), [F123:22](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:22) |
| Q005 | Revision ${attempt.revisionNo} · ${attempt.status === 'SUBMITTED' ? 'Submitted' : 'In progress'} | Version ${attempt.revisionNo} · ${attempt.status === 'SUBMITTED' ? 'Submitted' : 'In progress'} | Rewrite | [F119:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:77) |
| Q006 | Submitted | Submitted | Keep | [F119:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:77), [F122:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:78) |
| Q007 | In progress | In progress | Keep | [F119:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:77) |
| Q008 | Your paper is being prepared | Loading questions… | Rewrite | [F119:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:77) |
| Q009 | Hide history | Hide history | Keep | [F119:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:78) |
| Q010 | Feedback history | Feedback history | Keep | [F119:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:78) |
| Q011 | Close quiz | Close quiz | Keep | [F119:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:78) |
| Q012 | Question | Question | Keep | [F119:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:84), [F121:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:106), [F123:30](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:30) |
| Q013 | Choose one | Choose one | Keep | [F119:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:84), [F123:30](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:30) |
| Q014 | Choose all that apply | Choose all that apply | Keep | [F119:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:84), [F123:30](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:30) |
| Q015 | Short answer | Short answer | Keep | [F119:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:84), [F121:109](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:109), [F123:30](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:30) |
| Q016 | Long answer | Long answer | Keep | [F119:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:84), [F121:109](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:109), [F123:30](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:30) |
| Q017 | Correct choice | Correct answer | Rewrite | [F119:90](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:90) |
| Q018 | Your answer | Your answer | Keep | [F119:92](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:92) |
| Q019 | \_No answer submitted.\_ | \_No answer submitted.\_ | Keep | [F119:92](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:92) |
| Q020 | Answer to question ${index + 1} | Answer to question ${index + 1} | Keep | [F119:92](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:92) |
| Q021 | Write your answer in Markdown | Write your answer… | Rewrite | [F119:92](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:92) |
| Q022 | Awaiting feedback | Awaiting feedback | Keep | [F119:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:94) |
| Q023 | Unanswered | Unanswered | Keep | [F119:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:94) |
| Q024 | Correct | Correct | Keep | [F119:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:94) |
| Q025 | Incorrect | Incorrect | Keep | [F119:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:94) |
| Q026 | Reference answer | Reference answer | Keep | [F119:95](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:95) |
| Q027 | Explanation | Explanation | Keep | [F119:96](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:96) |
| Q028 | AI feedback · | AI feedback · | Keep | [F119:97](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:97) |
| Q029 | AI | AI | Keep | [F119:98](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:98) |
| Q030 | · ${entry.modelId} | · ${entry.modelId} | Keep | [F119:98](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:98) |
| Q031 | This submission is read-only. | Submitted answers can’t be edited. | Rewrite | [F119:105](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:105) |
| Q032 | Unsaved answers | Unsaved answers | Keep | [F119:105](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:105) |
| Q033 | Answers saved | Answers saved | Keep | [F119:105](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:105) |
| Q034 | Answers cannot change after submission. | You can’t change answers after submitting. | Rewrite | [F119:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:106) |
| Q035 | Close | Close | Keep | [F119:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:106), [F123:38](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:38) |
| Q036 | Keep editing | Keep editing | Keep | [F119:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:106) |
| Q037 | Submit now | Submit answers | Rewrite | [F119:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:106) |
| Q038 | Save answers | Save answers | Keep | [F119:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:106) |
| Q039 | Submit | Submit answers | Rewrite | [F119:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-attempt.tsx:106) |
| Q040 | The draft contains a question from another revision | This draft includes a question from a different quiz version. | Rewrite | [F120:46](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:46) |
| Q041 | Add a quiz title. | Enter a quiz title. | Rewrite | [F120:69](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:69) |
| Q042 | A quiz needs at least one question. | Add at least one question. | Rewrite | [F120:70](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:70) |
| Q043 | Question ${index + 1} needs a prompt and an explanation. | Add the question and explanation for question ${index + 1}. | Rewrite | [F120:73](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:73) |
| Q044 | Question ${index + 1} needs 2–10 options. | Add 2–10 options to question ${index + 1}. | Rewrite | [F120:75](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:75) |
| Q045 | Question ${index + 1} has an empty option. | Fill in every option for question ${index + 1}. | Rewrite | [F120:76](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:76) |
| Q046 | Question ${index + 1} needs valid correct choices. | Select the correct option or options for question ${index + 1}. | Rewrite | [F120:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:78) |
| Q047 | Question ${index + 1} needs a reference answer. | Add a reference answer for question ${index + 1}. | Rewrite | [F120:79](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-draft.ts:79) |
| Q048 | Discard the unsaved quiz draft? | Discard unsaved quiz changes? | Rewrite | [F121:48](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:48) |
| Q049 | Could not save quiz | Couldn’t save the quiz. Try again. | Rewrite | [F121:64](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:64) |
| Q050 | This quiz changed elsewhere. Your draft is preserved. Copy anything important, close, and reopen the latest revision before reapplying it. ${message} | This quiz has changed. Your draft is kept here. Copy it, close the editor and reopen the latest version before saving. ${message} | Rewrite | [F121:65](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:65) |
| Q051 | Edit quiz | Edit quiz | Keep | [F121:71](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:71), [F122:71](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:71) |
| Q052 | Create quiz | Create quiz | Keep | [F121:71](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:71), [F122:64](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:64) |
| Q053 | Each save publishes one complete revision. Existing attempts keep their original paper. | Saving creates a new version. Existing attempts keep their original questions. | Rewrite | [F121:71](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:71) |
| Q054 | Close quiz editor | Close quiz editor | Keep | [F121:72](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:72) |
| Q055 | Loading quiz… | Loading quiz… | Keep | [F121:75](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:75) |
| Q056 | Title | Title | Keep | [F121:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:77) |
| Q057 | Instructions · Markdown | Instructions (Markdown) | Rewrite | [F121:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:78) |
| Q058 | Preview instructions | Preview instructions | Keep | [F121:79](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:79) |
| Q059 | Add question | Add question | Keep | [F121:83](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:83) |
| Q060 | Earlier revisions | Previous versions | Rewrite | [F121:85](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:85) |
| Q061 | Revision | Version | Rewrite | [F121:86](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:86), [F121:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:87), [F122:70](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:70), [F122:85](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:85) |
| Q062 | (read-only) | (read-only) | Keep | [F121:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:87) |
| Q063 | Markdown source is saved unchanged. | — | Remove | [F121:93](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:93) |
| Q064 | Cancel | Cancel | Keep | [F121:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:94) |
| Q065 | Save quiz | Save quiz | Keep | [F121:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:94) |
| Q066 | Move question ${number} up | Move question ${number} up | Keep | [F121:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:106) |
| Q067 | Move question ${number} down | Move question ${number} down | Keep | [F121:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:106) |
| Q068 | Remove question ${number} | Remove question ${number} | Keep | [F121:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:106) |
| Q069 | Type | Type | Keep | [F121:107](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:107) |
| Q070 | Objective | Objective | Keep | [F121:107](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:107) |
| Q071 | Subjective | Subjective | Keep | [F121:107](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:107) |
| Q072 | Selection | Selection | Keep | [F121:108](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:108) |
| Q073 | Single select | Single select | Keep | [F121:108](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:108) |
| Q074 | Multi-select | Multi-select | Keep | [F121:108](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:108) |
| Q075 | Answer length | Answer length | Keep | [F121:109](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:109) |
| Q076 | Question · Markdown | Question (Markdown) | Rewrite | [F121:111](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:111) |
| Q077 | Options · Markdown · | Options (Markdown) · | Rewrite | [F121:112](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:112) |
| Q078 | Option ${optionIndex + 1} is correct | Option ${optionIndex + 1} is correct | Keep | [F121:112](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:112) |
| Q079 | Option ${optionIndex + 1} Markdown | Option ${optionIndex + 1} text (Markdown) | Rewrite | [F121:112](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:112) |
| Q080 | Remove option ${optionIndex + 1} | Remove option ${optionIndex + 1} | Keep | [F121:112](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:112) |
| Q081 | Add option | Add option | Keep | [F121:112](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:112) |
| Q082 | Clear reference answer · Markdown | Reference answer (Markdown) | Rewrite | [F121:113](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:113) |
| Q083 | Detailed explanation · Markdown | Explanation (Markdown) | Rewrite | [F121:114](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:114) |
| Q084 | Preview Markdown | Preview Markdown | Keep | [F121:115](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-editor.tsx:115) |
| Q085 | Could not load quizzes | Couldn’t load quizzes. Try again. | Rewrite | [F122:35](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:35) |
| Q086 | Could not load more quizzes | Couldn’t load more quizzes. Try again. | Rewrite | [F122:43](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:43) |
| Q087 | Could not reorder quizzes | Couldn’t reorder quizzes. Try again. | Rewrite | [F122:48](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:48) |
| Q088 | Could not archive quiz | Couldn’t archive the quiz. Try again. | Rewrite | [F122:52](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:52) |
| Q089 | Could not load attempts | Couldn’t load attempts. Try again. | Rewrite | [F122:58](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:58) |
| Q090 | Quizzes | Quizzes | Keep | [F122:63](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:63) |
| Q091 | Question papers for this page | — | Remove | [F122:63](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:63) |
| Q092 | Retry | Retry | Keep | [F122:67](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:67) |
| Q093 | No quizzes on this page yet. | No quizzes yet. | Rewrite | [F122:68](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:68) |
| Q094 | Edit ${item.title} | Edit ${item.title} | Keep | [F122:71](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:71) |
| Q095 | Preview | Preview | Keep | [F122:73](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:73) |
| Q096 | Take quiz | Take quiz | Keep | [F122:73](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:73) |
| Q097 | Hide attempts | Hide attempts | Keep | [F122:74](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:74), [F122:86](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:86) |
| Q098 | My attempts | My attempts | Keep | [F122:74](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:74), [F122:86](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:86) |
| Q099 | Sign in to save an attempt. | Sign in to save your answers. | Rewrite | [F122:76](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:76), [F123:37](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:37) |
| Q100 | Move ${item.title} up | Move ${item.title} up | Keep | [F122:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:77) |
| Q101 | Move ${item.title} down | Move ${item.title} down | Keep | [F122:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:77) |
| Q102 | Archive | Archive | Keep | [F122:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:77) |
| Q103 | Hide this quiz from new attempts? Past submissions stay available. | Archive this quiz? No new attempts can start. Past submissions stay available. | Rewrite | [F122:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:77) |
| Q104 | Keep quiz | Cancel | Rewrite | [F122:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:77) |
| Q105 | Archive now | Archive quiz | Rewrite | [F122:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:77) |
| Q106 | Loading attempts… | Loading attempts… | Keep | [F122:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:78) |
| Q107 | No attempts yet. | No attempts yet. | Keep | [F122:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:78) |
| Q108 | · Revision | · Version | Rewrite | [F122:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:78), [F122:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:87) |
| Q109 | Continue | Continue | Keep | [F122:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:78) |
| Q110 | More attempts | More attempts | Keep | [F122:78](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:78), [F122:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:87) |
| Q111 | Loading… | Loading… | Keep | [F122:80](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:80), [F122:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:87) |
| Q112 | Load more | Load more | Keep | [F122:81](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:81) |
| Q113 | Archived quizzes | Archived quizzes | Keep | [F122:83](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:83) |
| Q114 | · Past attempts remain available | · Past submissions stay available | Rewrite | [F122:85](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:85) |
| Q115 | No attempts. | No attempts yet. | Rewrite | [F122:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:87) |
| Q116 | Could not load archived quizzes | Couldn’t load archived quizzes. Try again. | Rewrite | [F122:89](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:89) |
| Q117 | More archived | Load more archived quizzes | Rewrite | [F122:89](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:89) |
| Q118 | Refresh | Refresh | Keep | [F122:92](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-panel.tsx:92) |
| Q119 | Could not load quiz | Couldn’t load the quiz. Try again. | Rewrite | [F123:16](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:16) |
| Q120 | Revision ${quiz.revisionNo} · Preview | Version ${quiz.revisionNo} · Preview | Rewrite | [F123:22](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:22) |
| Q121 | Loading questions | Loading questions | Keep | [F123:22](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:22) |
| Q122 | Close preview | Close preview | Keep | [F123:23](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:23) |
| Q123 | Write your answer in Markdown when you start an attempt. | Start the quiz to write your answer. | Rewrite | [F123:32](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:32) |
| Q124 | Answers are saved in an attempt. | Your answers are saved separately from the quiz. | Rewrite | [F123:37](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:37) |
| Q125 | Start attempt | Start quiz | Rewrite | [F123:38](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-preview.tsx:38) |
| Q126 | Could not complete the quiz request | Couldn’t complete the quiz request. Try again. | Rewrite | [F118:52](D:/PersonalProjects/reader/reader-frontend/src/modules/page/quizzes/quiz-api.ts:52)<br>Fallback API error shown by quiz dialogs. |
