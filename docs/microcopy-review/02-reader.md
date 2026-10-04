# Reader: pages, sections and reading tools

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Includes Reader entry, document navigation, section tools, page and section editing, sharing, comments, saved words, dictionary lookups and AI reading tools. Reading settings is distinct from shared account settings. Markdown remains named in source-editing and format-specific controls where it helps the user.

323 entries: 171 rewrite, 5 remove, 147 keep. Identical current/proposed pairs are grouped within this part of the app; all their source locations are listed. Some short entries are fragments of composed messages. See [generated labels](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) for their complete display patterns. Literal template expressions and escaped newlines are shown as source text, not executed.

| ID | Current text | Proposed text | Decision | Sources / notes |
| --- | --- | --- | --- | --- |
| R001 | Raw error copied | Error details copied | Rewrite | [F091:113](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:113) |
| R002 | Retry Request | Try again | Rewrite | [F091:140](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:140) |
| R003 | Open Settings | Open settings | Rewrite | [F091:151](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:151) |
| R004 | Hide Raw Error | Hide error details | Rewrite | [F091:161](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:161) |
| R005 | View Raw Response | View error details | Rewrite | [F091:161](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:161) |
| R006 | Raw Error Payload | Error details | Rewrite | [F091:171](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:171) |
| R007 | Copied | Copied | Keep | [F091:177](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:177), [F091:244](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:244), [F105:453](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:453), [F107:145](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:145) |
| R008 | Copy | Copy | Keep | [F091:177](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:177), [F091:428](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:428), [F105:453](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:453), [F107:145](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:145) |
| R009 | Raw JSON copied to clipboard | Response JSON copied | Rewrite | [F091:202](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:202) |
| R010 | Raw Model Response | Model response details | Rewrite | [F091:214](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:214) |
| R011 | tokens | tokens | Keep | [F091:222](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:222) |
| R012 | Prompt: | Prompt: | Keep | [F091:235](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:235) |
| R013 | &#124; Completion: | &#124; Completion: | Keep | [F091:235](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:235) |
| R014 | Copy JSON | Copy JSON | Keep | [F091:244](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:244) |
| R015 | Clear lookup history | Clear lookup history | Keep | [F091:309](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:309) |
| R016 | Restore | Restore | Keep | [F091:317](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:317) |
| R017 | Expand to full width | Expand to full width | Keep | [F091:317](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:317) |
| R018 | Close | Close | Keep | [F091:324](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:324), [F112:371](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:371) |
| R019 | Remove item | Remove item | Keep | [F091:357](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:357) |
| R020 | Cancel Request | Cancel request | Rewrite | [F091:382](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:382) |
| R021 | AI Response: | AI response | Rewrite | [F091:409](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:409) |
| R022 | Regenerate response | Regenerate response | Keep | [F091:414](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:414) |
| R023 | Regenerate | Regenerate | Keep | [F091:417](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:417) |
| R024 | Response copied | Response copied | Keep | [F091:422](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:422) |
| R025 | Copy response markdown | Copy response | Rewrite | [F091:425](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:425) |
| R026 | Re-ask | Ask again | Rewrite | [F091:460](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/ai-lookup-panel.tsx:460) |
| R027 | Back to parent page | Back to parent page | Keep | [F092:103](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:103) |
| R028 | Public | Public | Keep | [F092:123](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:123) |
| R029 | Previous section (←) | Previous section (←) | Keep | [F092:150](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:150) |
| R030 | Next section (→) | Next section (→) | Keep | [F092:158](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:158) |
| R031 | Copied to clipboard | Section copied | Rewrite | [F092:162](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:162) |
| R032 | Copy section | Copy section | Keep | [F092:162](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:162), [F111:42](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:42) |
| R033 | Full page copied to clipboard | Page copied | Rewrite | [F092:167](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:167) |
| R034 | Copy whole page | Copy page | Rewrite | [F092:167](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:167) |
| R035 | Decrease font size (−) | Decrease font size (−) | Keep | [F092:178](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:178) |
| R036 | Increase font size (+) | Increase font size (+) | Keep | [F092:181](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:181) |
| R037 | Heading | Heading | Keep | [F092:213](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:213), [F106:100](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:100) |
| R038 | Heading level | Heading level | Keep | [F092:215](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:215) |
| R039 | Close Dictionary | Close dictionary | Rewrite | [F092:235](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:235) |
| R040 | Open Dictionary | Open dictionary | Rewrite | [F092:235](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:235) |
| R041 | Share page &amp; subpages publicly | Share page and subpages | Rewrite | [F092:251](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:251) |
| R042 | Shared | Shared | Keep | [F092:256](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:256) |
| R043 | Share | Share | Keep | [F092:256](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:256) |
| R044 | Feeling bored? Swipe inspirations (Alt+B) | Take a break (Alt+B) | Rewrite | [F092:266](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:266) |
| R045 | Bored? | Take a break | Rewrite | [F092:270](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:270) |
| R046 | Settings | Reading settings | Rewrite | [F092:272](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/appbar.tsx:272), [F106:52](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:52) |
| R047 | just now | just now | Keep | [F093:19](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:19), [F113:30](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:30) |
| R048 | ${days}d ago | ${days}d ago | Keep | [F093:25](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:25) |
| R049 | Marked as my explanation | Saved to your explanations | Rewrite | [F093:163](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:163) |
| R050 | Cancel | Cancel | Keep | [F093:193](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:193), [F093:237](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:237), [F094:48](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/delete-page.tsx:48), [F103:118](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:118), [F112:300](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:300) |
| R051 | Saving… | Saving… | Keep | [F093:205](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:205), [F105:504](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:504) |
| R052 | Save | Save | Keep | [F093:205](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:205), [F112:307](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:307) |
| R053 | Paste page ID… | Page ID | Rewrite | [F093:221](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:221) |
| R054 | Save link | Save link | Keep | [F093:230](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:230) |
| R055 | Go to linked page: ${comment.linkedPageId} | Go to linked page: ${comment.linkedPageId} | Keep | [F093:248](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:248) |
| R056 | Remove link | Remove link | Keep | [F093:255](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:255) |
| R057 | Link page | Link page | Keep | [F093:269](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:269) |
| R058 | Edit comment | Edit comment | Keep | [F093:277](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:277) |
| R059 | Delete comment | Delete comment | Keep | [F093:285](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:285) |
| R060 | Are you sure you want to delete all comments on this page? | Delete all comments on this page? | Rewrite | [F093:369](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:369) |
| R061 | Comments are private to each user. | Your comments are private. | Rewrite | [F093:393](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:393) |
| R062 | Sign in | Sign in | Keep | [F093:393](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:393), [F113:151](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:151) |
| R063 | to save personal notes on this page. | to add private comments. | Rewrite | [F093:393](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:393) |
| R064 | Comments | Comments | Keep | [F093:399](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:399), [F101:11](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:11) |
| R065 | Copied! | Copied | Rewrite | [F093:408](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:408) |
| R066 | Copy all comments | Copy all comments | Keep | [F093:408](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:408) |
| R067 | Collapse all | Collapse all | Keep | [F093:420](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:420) |
| R068 | Expand all | Expand all | Keep | [F093:420](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:420) |
| R069 | Delete all comments | Delete all comments | Keep | [F093:428](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:428) |
| R070 | No comments yet | No comments yet | Keep | [F093:452](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:452) |
| R071 | Select text on the page to add a comment | Select text on the page to add a comment | Keep | [F093:453](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:453) |
| R072 | Failed to load comments | Couldn’t load comments. | Rewrite | [F093:476](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/comments-panel.tsx:476) |
| R073 | Delete page | Delete page | Keep | [F094:35](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/delete-page.tsx:35), [F109:89](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpage-item.tsx:89) |
| R074 | Delete | Delete | Keep | [F094:52](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/delete-page.tsx:52) |
| R075 | Synonyms: | Synonyms | Rewrite | [F095:23](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:23), [F095:62](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:62) |
| R076 | Antonyms: | Antonyms | Rewrite | [F095:28](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:28), [F095:67](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:67) |
| R077 | Dictionary | Dictionary | Keep | [F095:93](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:93) |
| R078 | Close dictionary | Close dictionary | Keep | [F095:97](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:97) |
| R079 | Search a word… | Search a word… | Keep | [F095:110](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:110) |
| R080 | Search | Search | Keep | [F095:118](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:118) |
| R081 | Search for a word to see its definition | Enter a word to look it up. | Rewrite | [F095:129](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:129) |
| R082 | Try again | Try again | Keep | [F095:153](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:153), [F099:46](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/main-content.tsx:46) |
| R083 | Source: | Source | Rewrite | [F095:177](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:177) |
| R084 | Wiktionary | Wiktionary | Keep | [F095:184](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:184) |
| R085 | FreeDictionaryAPI.com | FreeDictionaryAPI.com | Keep | [F095:202](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/dictionary-panel.tsx:202) |
| R086 | Saved as sub-page | Saved as a subpage | Rewrite | [F096:21](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:21) |
| R087 | Save as sub-page | Save as a subpage | Rewrite | [F096:21](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:21) |
| R088 | AI Doubt | Questions | Rewrite | [F096:36](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:36) |
| R089 | Doubt | Question | Rewrite | [F096:39](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:39) |
| R090 | Re-ask or Rephrase Doubt | Edit your question | Rewrite | [F096:40](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:40) |
| R091 | Rephrase your question or ask a follow-up... | Edit your question or ask a follow-up… | Rewrite | [F096:41](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:41) |
| R092 | Select text on the page, write a question in 'Ask Doubt', and click 'Ask AI' to explain. | Select text and choose “Ask a question”. | Rewrite | [F096:42](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:42) |
| R093 | Querying AI for doubt... | Getting an answer… | Rewrite | [F096:43](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/doubt-panel.tsx:43) |
| R094 | Clipboard is empty | Clipboard is empty | Keep | [F097:70](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:70) |
| R095 | New Subpage | New subpage | Rewrite | [F097:110](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:110) |
| R096 | Add Content | Add content | Rewrite | [F097:118](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:118) |
| R097 | This page is empty. Start writing notes, paste markdown content, or create subpages to organize your thoughts. | Add content or create a subpage. | Rewrite | [F097:126](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:126) |
| R098 | Quick Actions | — | Remove | [F097:137](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:137) |
| R099 | Write Markdown | Write content | Rewrite | [F097:152](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:152) |
| R100 | Add notes, headers, code blocks, or documentation to this page. | Start writing or paste your content. | Rewrite | [F097:155](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:155) |
| R101 | Create a Subpage | Create a subpage | Rewrite | [F097:171](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:171) |
| R102 | Nest a child page under this section to build a structured hierarchy. | Add a page inside this one. | Rewrite | [F097:174](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:174) |
| R103 | Paste Content | Paste content | Rewrite | [F097:190](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:190) |
| R104 | Paste formatted Markdown or copied articles directly into the editor. | Paste from your clipboard. | Rewrite | [F097:193](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:193) |
| R105 | Subpages in this Section ( | Pages in this section ( | Rewrite | [F097:206](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:206) |
| R106 | Open | Open | Keep | [F097:235](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/empty-page-placeholder.tsx:235) |
| R107 | AI Explanation | Explanations | Rewrite | [F098:10](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx:10), [F101:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:14) |
| R108 | Passage | Passage | Keep | [F098:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx:13) |
| R109 | Rephrase Passage / Instructions | Edit selection or instructions | Rewrite | [F098:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx:14) |
| R110 | Modify passage or add custom instructions... | Edit the selection or add instructions… | Rewrite | [F098:15](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx:15) |
| R111 | Select text on the page and click 'AI Explain' to get an explanation. | Select text and choose “Explain with AI”. | Rewrite | [F098:16](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx:16) |
| R112 | Generating AI explanation... | Getting an explanation… | Rewrite | [F098:17](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/explanation-panel.tsx:17) |
| R113 | Failed to load page | Couldn’t load this page | Rewrite | [F099:35](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/main-content.tsx:35) |
| R114 | An unexpected error occurred while fetching the page content. | Couldn’t load the page. Try again. | Rewrite | [F099:37](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/main-content.tsx:37) |
| R115 | AI Meaning | Word meanings | Rewrite | [F100:10](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx:10), [F101:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:13), [F105:269](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:269) |
| R116 | Term | Term | Keep | [F100:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx:13) |
| R117 | Rephrase Term / Context | Edit word or context | Rewrite | [F100:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx:14) |
| R118 | Modify term or add instructions... | Edit the word or add context… | Rewrite | [F100:15](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx:15) |
| R119 | Select text on the page and click 'AI Meaning' to look up details. | Select a word and choose “Meaning with AI”. | Rewrite | [F100:16](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx:16) |
| R120 | Consulting AI for "${store.meaningStore.activeEntry?.searchTerm}"... | Looking up “${store.meaningStore.activeEntry?.searchTerm}”… | Rewrite | [F100:17](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/meaning-panel.tsx:17) |
| R121 | Contents | Contents | Keep | [F101:8](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:8), [F108:12](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/start-panel.tsx:12), [F111:71](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:71), [F111:127](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:127) |
| R122 | Alt+C | Alt+C | Keep | [F101:8](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:8) |
| R123 | Subpages | Subpages | Keep | [F101:9](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:9), [F108:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/start-panel.tsx:13) |
| R124 | Alt+S | Alt+S | Keep | [F101:9](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:9) |
| R125 | Quizzes | Quizzes | Keep | [F101:10](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:10) |
| R126 | Alt+Q | Alt+Q | Keep | [F101:10](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:10) |
| R127 | Alt+M | Alt+M | Keep | [F101:11](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:11) |
| R128 | Vocabulary | Saved words | Rewrite | [F101:12](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:12), [F113:157](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:157) |
| R129 | Alt+V | Alt+V | Keep | [F101:12](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:12) |
| R130 | Alt+A | Alt+A | Keep | [F101:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:13) |
| R131 | Alt+E | Alt+E | Keep | [F101:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:14) |
| R132 | AI Doubts | Questions | Rewrite | [F101:15](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:15) |
| R133 | Alt+D | Alt+D | Keep | [F101:15](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:15) |
| R134 | • ${count} | • ${count} | Keep | [F101:54](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/nav-rail/nav-rail.tsx:54) |
| R135 | Loading page content… | Loading page… | Rewrite | [F102:9](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/page-skeleton-loader.tsx:9) |
| R136 | The page changed since you opened it. Copy your draft, then close and reload the page. | This page has changed. Copy your draft, then close the editor and reload. | Rewrite | [F103:44](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:44) |
| R137 | This section no longer matches the displayed page. Reload the page before editing. | This section has changed. Reload the page before editing. | Rewrite | [F103:47](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:47) |
| R138 | Invalid section body | Invalid section body | Keep | [F103:62](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:62) |
| R139 | Discard the unsaved section draft? | Discard your unsaved changes? | Rewrite | [F103:67](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:67) |
| R140 | Edit section | Edit section | Keep | [F103:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:84) |
| R141 | Introduction / page body | Introduction | Rewrite | [F103:85](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:85), [F104:53](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-reader.tsx:53) |
| R142 | Close section editor | Close section editor | Keep | [F103:87](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:87) |
| R143 | Only this section’s body will change. Its heading, child sections, page details, and all other sections are protected. Use full-page editing to change headings. | Only this section’s content will change. Its heading and other sections stay unchanged. Use page editing to change headings. | Rewrite | [F103:90](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:90) |
| R144 | Markdown | Markdown | Keep | [F103:95](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:95) |
| R145 | Draft copied | Draft copied | Keep | [F103:96](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:96) |
| R146 | Copy draft | Copy draft | Keep | [F103:96](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:96) |
| R147 | Could not copy. Select the draft text and copy it manually. | Couldn’t copy the draft. Select the text and copy it manually. | Rewrite | [F103:97](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:97) |
| R148 | Section review | Review changes | Rewrite | [F103:104](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:104) |
| R149 | Preview | Preview | Keep | [F103:105](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:105) |
| R150 | Compare | Compare | Keep | [F103:105](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:105) |
| R151 | Original body | Current content | Rewrite | [F103:109](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:109) |
| R152 | Proposed body | New content | Rewrite | [F103:110](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:110) |
| R153 | Draft preserved. Copy it before closing or reloading. | Your draft is kept here. Copy it before closing or reloading. | Rewrite | [F103:117](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:117) |
| R154 | Markdown remains the source of truth. | — | Remove | [F103:117](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:117) |
| R155 | Checking the latest page… | Checking the latest page… | Keep | [F103:117](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:117) |
| R156 | Save section | Save section | Keep | [F103:118](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-edit-dialog.tsx:118) |
| R157 | Edit only: ${selected.title ?? 'Introduction / page body'} | Edit section: ${selected.title ?? 'Introduction'} | Rewrite | [F104:53](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/section-reader.tsx:53) |
| R158 | Explanation saved | Explanation saved | Keep | [F105:222](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:222) |
| R159 | Comment saved | Comment saved | Keep | [F105:222](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:222) |
| R160 | Added to vocabulary | Word saved | Rewrite | [F105:237](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:237) |
| R161 | Look up meaning | Look up meaning | Keep | [F105:254](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:254) |
| R162 | Select a single word | Select a single word | Keep | [F105:254](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:254) |
| R163 | Meaning | Meaning | Keep | [F105:258](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:258) |
| R164 | Get AI Meaning | Look up with AI | Rewrite | [F105:266](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:266) |
| R165 | Get AI Explanation | Explain with AI | Rewrite | [F105:277](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:277) |
| R166 | AI Explain | Explain with AI | Rewrite | [F105:280](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:280) |
| R167 | Explain with Google AI | Explain with Google AI | Keep | [F105:289](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:289) |
| R168 | Selection too long for Google | Selection too long for Google | Keep | [F105:289](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:289) |
| R169 | Explain (Google) | Explain (Google) | Keep | [F105:293](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:293) |
| R170 | Explain with DuckAI (Supports longer selections) | Explain with DuckAI | Rewrite | [F105:302](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:302) |
| R171 | Selection too long for DuckAI | Selection too long for DuckAI | Keep | [F105:302](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:302) |
| R172 | Explain (DuckAI) | Explain (DuckAI) | Keep | [F105:306](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:306) |
| R173 | Ask a doubt about this selection | Ask a question about this text | Rewrite | [F105:315](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:315) |
| R174 | Selection too long | Selection too long | Keep | [F105:315](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:315) |
| R175 | Ask Doubt | Ask a question | Rewrite | [F105:319](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:319), [F105:358](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:358) |
| R176 | Add a comment on this selection | Add a comment | Rewrite | [F105:328](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:328) |
| R177 | Add Comment | Add comment | Rewrite | [F105:331](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:331), [F105:465](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:465) |
| R178 | Add this term to your vocabulary | Save this word | Rewrite | [F105:341](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:341) |
| R179 | Adding… | Adding… | Keep | [F105:344](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:344) |
| R180 | Add to Vocabulary | Save word | Rewrite | [F105:344](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:344) |
| R181 | Back | Back | Keep | [F105:365](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:365), [F105:471](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:471) |
| R182 | What's your doubt? (Ctrl+Enter to send) | Ask a question… (Ctrl+Enter to send) | Rewrite | [F105:374](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:374) |
| R183 | chars typed | characters | Rewrite | [F105:381](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:381) |
| R184 | Google: | Google: | Keep | [F105:384](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:384) |
| R185 | ${remainingGoogleChars} left | ${remainingGoogleChars} left | Keep | [F105:384](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:384) |
| R186 | Too long | Too long | Keep | [F105:384](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:384), [F105:387](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:387) |
| R187 | DuckAI: | DuckAI: | Keep | [F105:387](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:387) |
| R188 | ${remainingDuckChars} left | ${remainingDuckChars} left | Keep | [F105:387](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:387) |
| R189 | Explain within the app | Get an answer with AI | Rewrite | [F105:403](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:403) |
| R190 | Ask AI (In-App) | Ask AI | Rewrite | [F105:406](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:406) |
| R191 | Search with Google | Search with Google | Keep | [F105:420](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:420) |
| R192 | Too long for Google | Too long for Google | Keep | [F105:420](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:420) |
| R193 | Search Google | Search Google | Keep | [F105:423](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:423) |
| R194 | Search with DuckAI | Search with DuckAI | Keep | [F105:435](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:435) |
| R195 | Too long for DuckAI | Too long for DuckAI | Keep | [F105:435](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:435) |
| R196 | Search DuckAI | Search DuckAI | Keep | [F105:438](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:438) |
| R197 | Copy doubt as prompt | Copy question and context | Rewrite | [F105:450](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:450) |
| R198 | Type your comment (Ctrl+Enter to save)... | Write a comment… (Ctrl+Enter to save) | Rewrite | [F105:479](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:479) |
| R199 | Mark as my explanation | Save to my explanations | Rewrite | [F105:491](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:491) |
| R200 | Save Comment | Save comment | Rewrite | [F105:504](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/selection-popover.tsx:504) |
| R201 | Font Size | Text size | Rewrite | [F106:58](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:58), [F106:68](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:68) |
| R202 | Font Family | Font | Rewrite | [F106:74](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:74) |
| R203 | Font | Font | Keep | [F106:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:84) |
| R204 | Default Heading Level | Default heading level | Rewrite | [F106:90](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:90) |
| R205 | Theme | Theme | Keep | [F106:106](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:106) |
| R206 | MCP Server configuration copied to clipboard | MCP configuration copied | Rewrite | [F106:116](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:116) |
| R207 | Copy MCP Server Config (JSON) | Copy MCP configuration | Rewrite | [F106:121](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:121) |
| R208 | format.llm.md copied to clipboard | Format guide copied | Rewrite | [F106:129](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:129) |
| R209 | Copy Markdown Format Guide (format.llm.md) | Copy format guide | Rewrite | [F106:134](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:134) |
| R210 | Account preferences, AI models &amp; MCP → | Account settings | Rewrite | [F106:138](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/settings.tsx:138) |
| R211 | Public link copied to clipboard | Link copied | Rewrite | [F107:37](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:37) |
| R212 | Failed to copy link | Couldn’t copy the link. Try again. | Rewrite | [F107:40](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:40) |
| R213 | Page &amp; subpages are now public | Page and subpages are public | Rewrite | [F107:49](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:49) |
| R214 | Page is now private | Page is private | Rewrite | [F107:49](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:49) |
| R215 | Failed to update share settings | Couldn’t save sharing settings. Try again. | Rewrite | [F107:51](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:51) |
| R216 | Share Page &amp; Subpages | Share page | Rewrite | [F107:77](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:77) |
| R217 | Publicly accessible with link | Anyone with the link can read | Rewrite | [F107:80](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:80) |
| R218 | Only accessible by you | Only you can read | Rewrite | [F107:80](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:80) |
| R219 | Public Access | Public access | Rewrite | [F107:94](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:94) |
| R220 | Active | Active | Keep | [F107:98](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:98) |
| R221 | Allow anyone with the link to read this page and all its nested subpages. | Anyone with the link can read this page and its subpages. | Rewrite | [F107:103](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:103) |
| R222 | Shareable Link | Link | Rewrite | [F107:129](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:129) |
| R223 | Hierarchical Sharing: | — | Remove | [F107:156](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:156) |
| R224 | All current and future subpages under this page are automatically shared. | Sharing includes existing subpages and any added later. | Rewrite | [F107:156](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:156) |
| R225 | Strict Privacy: | — | Remove | [F107:162](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:162) |
| R226 | Your personal comments, highlights, and vocabulary terms remain private and are never shared. | Your comments, highlights and vocabulary stay private. | Rewrite | [F107:162](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:162) |
| R227 | AI Key Security: | — | Remove | [F107:168](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:168) |
| R228 | Your OpenAI/LLM credentials are never used by guests. Guests use their own keys. | Visitors can’t use your AI keys. They need their own. | Rewrite | [F107:168](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/share-dialog.tsx:168) |
| R229 | Drag to reorder | Drag to reorder | Keep | [F109:54](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpage-item.tsx:54) |
| R230 | Public subpage | Public subpage | Keep | [F109:68](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpage-item.tsx:68) |
| R231 | Edit page | Edit page | Keep | [F109:82](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpage-item.tsx:82), [F111:76](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:76), [F111:138](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:138) |
| R232 | Search… | Search… | Keep | [F110:126](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:126) |
| R233 | New subpage | New subpage | Keep | [F110:132](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:132) |
| R234 | Sort | Sort | Keep | [F110:145](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:145) |
| R235 | Sort by | Sort by | Keep | [F110:147](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:147) |
| R236 | Group | Group | Keep | [F110:156](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:156) |
| R237 | Group by | Group by | Keep | [F110:158](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:158) |
| R238 | No matching pages | No matching pages | Keep | [F110:174](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:174) |
| R239 | No subpages yet | No subpages yet | Keep | [F110:181](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:181) |
| R240 | Uncategorized | Uncategorized | Keep | [F110:192](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:192) |
| R241 | Failed to load subpages | Couldn’t load subpages. | Rewrite | [F110:251](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/subpages.tsx:251) |
| R242 | Untitled | Untitled | Keep | [F111:37](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:37), [F112:378](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:378) |
| R243 | This page is empty | This page is empty | Keep | [F111:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:84) |
| R244 | No headings in this page | This page has no headings | Rewrite | [F111:84](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/toc.tsx:84) |
| R245 | Pasted content detected with frontmatter | Page details found in pasted content | Rewrite | [F112:130](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:130) |
| R246 | Edit Page | Edit page | Rewrite | [F112:204](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:204) |
| R247 | New Page | New page | Rewrite | [F112:204](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:204) |
| R248 | Read Now | Read now | Rewrite | [F112:212](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:212) |
| R249 | Title | Title | Keep | [F112:218](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:218), [F129:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-sort.ts:14) |
| R250 | Page title | Page title | Keep | [F112:222](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:222) |
| R251 | Category | Category | Keep | [F112:227](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:227), [F128:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-group.ts:13) |
| R252 | e.g. Recall, Note | e.g. Recall, Note | Keep | [F112:231](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:231) |
| R253 | Content | Content | Keep | [F112:236](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:236) |
| R254 | Write your content here… | Write your content here… | Keep | [F112:241](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:241) |
| R255 | AI Prompt Customizations (Optional) | Custom AI instructions (optional) | Rewrite | [F112:253](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:253) |
| R256 | Prompt for Explanation | Explanation instructions | Rewrite | [F112:259](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:259) |
| R257 | Use inherited page prompt... | Leave blank to use inherited instructions | Rewrite | [F112:263](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:263), [F112:272](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:272), [F112:281](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:281) |
| R258 | Prompt for Meanings | Word-meaning instructions | Rewrite | [F112:268](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:268) |
| R259 | Prompt for Asking Doubts | Question instructions | Rewrite | [F112:277](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:277) |
| R260 | Create | Create | Keep | [F112:307](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:307) |
| R261 | Preview Content | Preview | Rewrite | [F112:356](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:356) |
| R262 | Back to Edit | Back to editing | Rewrite | [F112:364](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/upsert-page.tsx:364) |
| R263 | Vocabulary is private to your account. | Your vocabulary is private. | Rewrite | [F113:151](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:151) |
| R264 | to save vocabulary terms on this page. | to save words. | Rewrite | [F113:151](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:151) |
| R265 | Vocabulary for this page | Saved words | Rewrite | [F113:173](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:173) |
| R266 | This page | This page | Keep | [F113:176](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:176) |
| R267 | Vocabulary across all pages for a day | Words saved on a selected date | Rewrite | [F113:185](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:185) |
| R268 | Day | Day | Keep | [F113:188](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:188) |
| R269 | words | words | Keep | [F113:201](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:201) |
| R270 | explanations | explanations | Keep | [F113:203](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:203) |
| R271 | Words you looked up | Saved words | Rewrite | [F113:220](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:220) |
| R272 | Select a word on the page and pick “Add to Vocabulary”. | Select a word and choose “Save word”. | Rewrite | [F113:224](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:224) |
| R273 | Remove from vocabulary | Remove word | Rewrite | [F113:250](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:250) |
| R274 | Your explanations | Your explanations | Keep | [F113:264](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:264) |
| R275 | When adding a comment, tick “Mark as my explanation” to collect them here. | Choose “Save to my explanations” when adding a comment. | Rewrite | [F113:268](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:268) |
| R276 | Failed to load vocabulary | Couldn’t load vocabulary. | Rewrite | [F113:310](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/vocabulary-panel.tsx:310) |
| R277 | Please enter a word to look up | Enter a word. | Rewrite | [F114:53](D:/PersonalProjects/reader/reader-frontend/src/modules/page/dictionary-store.ts:53) |
| R278 | Request was cancelled | Request cancelled | Rewrite | [F115:88](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:88), [F116:79](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:79), [F117:79](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:79) |
| R279 | Request Cancelled | Request cancelled | Rewrite | [F115:91](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:91), [F116:82](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:82), [F117:82](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:82) |
| R280 | The AI doubt answering request was cancelled. | The request was cancelled. | Rewrite | [F115:92](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:92) |
| R281 | AI configuration not found. Please verify your settings. | Set up your AI connection in settings. | Rewrite | [F115:203](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:203), [F116:188](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:188), [F117:188](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:188) |
| R282 | AI Configuration Missing | AI connection needed | Rewrite | [F115:206](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:206), [F116:191](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:191), [F117:191](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:191) |
| R283 | No AI configuration found. Please go to Settings to configure your Base URL and API key. | Add a provider URL and API key in settings. | Rewrite | [F115:207](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:207), [F116:192](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:192), [F117:192](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:192) |
| R284 | Default Model for Asking Doubts is not configured. Please go to Settings to select one. | Choose a model for questions in settings. | Rewrite | [F115:218](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:218) |
| R285 | Doubt Model Not Selected | Choose a question model | Rewrite | [F115:221](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:221) |
| R286 | Please go to Settings -&gt; Model Selection and select a default model for Asking Doubts. | Choose a model for questions in Settings → AI models. | Rewrite | [F115:222](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:222) |
| R287 | Failed to fetch AI answer. | Couldn’t get an answer. Try again. | Rewrite | [F115:264](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:264) |
| R288 | AI request failed | Couldn’t get a response. Try again. | Rewrite | [F115:267](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:267), [F116:251](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:251), [F117:251](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:251) |
| R289 | Doubt: ${entry.searchTerm} | Question: ${entry.searchTerm} | Rewrite | [F115:283](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:283) |
| R290 | ### Context\n\n&gt; ${entry.selectedText.split('\n').join('\n&gt; ')}\n\n### Doubt\n\n\*${entry.searchTerm}\*\n\n### Answer\n\n${entry.responseMarkdown} | ### Context\n\n&gt; ${entry.selectedText.split('\n').join('\n&gt; ')}\n\n### Question\n\n\*${entry.searchTerm}\*\n\n### Answer\n\n${entry.responseMarkdown} | Rewrite | [F115:284](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:284) |
| R291 | Doubt saved as sub-page | Answer saved as a subpage | Rewrite | [F115:293](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:293) |
| R292 | Failed to save sub-page | Couldn’t save the subpage. Try again. | Rewrite | [F115:295](D:/PersonalProjects/reader/reader-frontend/src/modules/page/doubt-store.ts:295) |
| R293 | The AI explanation request was cancelled. | The request was cancelled. | Rewrite | [F116:83](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:83) |
| R294 | Default Model for Explanation is not configured. Please go to Settings to select one. | Choose an explanation model in settings. | Rewrite | [F116:203](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:203) |
| R295 | Explanation Model Not Selected | Choose an explanation model | Rewrite | [F116:206](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:206) |
| R296 | Please go to Settings -&gt; Model Selection and select a default model for Explanations. | Choose an explanation model in Settings → AI models. | Rewrite | [F116:207](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:207) |
| R297 | Failed to fetch AI explanation. | Couldn’t get an explanation. Try again. | Rewrite | [F116:248](D:/PersonalProjects/reader/reader-frontend/src/modules/page/explanation-store.ts:248) |
| R298 | The AI request was stopped before completing. | The request was cancelled. | Rewrite | [F117:83](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:83) |
| R299 | Default Model for Meanings is not configured. Please go to Settings to select one. | Choose a word-meaning model in settings. | Rewrite | [F117:203](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:203) |
| R300 | Meaning Model Not Selected | Choose a word-meaning model | Rewrite | [F117:206](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:206) |
| R301 | Please go to Settings -&gt; Model Selection and select a default model for Meanings. | Choose a word-meaning model in Settings → AI models. | Rewrite | [F117:207](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:207) |
| R302 | Failed to fetch AI meaning. | Couldn’t look up this word. Try again. | Rewrite | [F117:248](D:/PersonalProjects/reader/reader-frontend/src/modules/page/meaning-store.ts:248) |
| R303 | Light | Light | Keep | [F124:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-color-schema.ts:14) |
| R304 | Dark | Dark | Keep | [F124:42](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-color-schema.ts:42) |
| R305 | Forest Dark | Forest dark | Rewrite | [F124:70](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-color-schema.ts:70) |
| R306 | Lexend | Lexend | Keep | [F125:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-families.ts:14) |
| R307 | Merriweather | Merriweather | Keep | [F125:20](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-families.ts:20) |
| R308 | Atkinson Hyperlegible | Atkinson Hyperlegible | Keep | [F125:26](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-families.ts:26) |
| R309 | XS | XS | Keep | [F126:14](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-sizes.ts:14) |
| R310 | Small | Small | Keep | [F126:25](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-sizes.ts:25) |
| R311 | Base | Medium | Rewrite | [F126:36](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-sizes.ts:36) |
| R312 | Large | Large | Keep | [F126:47](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-sizes.ts:47) |
| R313 | XL | XL | Keep | [F126:58](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-font-sizes.ts:58) |
| R314 | Auto | Auto | Keep | [F127:12](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-heading-level.ts:12) |
| R315 | None | None | Keep | [F128:12](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-group.ts:12) |
| R316 | Manual | Manual | Keep | [F129:12](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-sort.ts:12) |
| R317 | Created | Created | Keep | [F129:13](D:/PersonalProjects/reader/reader-frontend/src/modules/page/theme/page-subpage-sort.ts:13) |
| R318 | You completed this page! | Page finished | Rewrite | [F130:323](D:/PersonalProjects/reader/reader-frontend/src/modules/page/view.tsx:323) |
| R319 | Keep reading | Continue reading | Rewrite | [F130:342](D:/PersonalProjects/reader/reader-frontend/src/modules/page/view.tsx:342) |
| R320 | Could not open Reader | Couldn’t open Reader. Try again. | Rewrite | [F131:19](D:/PersonalProjects/reader/reader-frontend/src/modules/reader/home.tsx:19) |
| R321 | Retry | Retry | Keep | [F131:24](D:/PersonalProjects/reader/reader-frontend/src/modules/reader/home.tsx:24) |
| R322 | Opening Reader… | Opening Reader… | Keep | [F131:24](D:/PersonalProjects/reader/reader-frontend/src/modules/reader/home.tsx:24) |
| R323 | Are you sure you want to delete ${pageTitle}? This action cannot be undone. | Delete “${pageTitle}”? You can’t undo this. | Rewrite | [F094:43](D:/PersonalProjects/reader/reader-frontend/src/modules/page/components/delete-page.tsx:43)<br>Rendered message assembled from text and dynamic values. |
