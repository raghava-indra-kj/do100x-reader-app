# Account settings, preferences, AI models and MCP

Draft for review · Source snapshot: 4 October 2026 · No implementation changes

[Review index](D:/PersonalProjects/reader/docs/microcopy-review.md) · [Source register](D:/PersonalProjects/reader/docs/microcopy-review/10-source-register.md)

Includes account identity, preferences, quotes/breaks, AI connections and model selection, custom models, MCP setup and format-guide controls. Technical terms belong here when users need them. This review does not change model configuration, credentials, MCP access or the technical guide itself.

87 entries: 60 rewrite, 1 remove, 26 keep. Identical current/proposed pairs are grouped within this part of the app; all their source locations are listed. Some short entries are fragments of composed messages. See [generated labels](D:/PersonalProjects/reader/docs/microcopy-review/09-generated-labels.md) for their complete display patterns. Literal template expressions and escaped newlines are shown as source text, not executed.

| ID | Current text | Proposed text | Decision | Sources / notes |
| --- | --- | --- | --- | --- |
| S001 | Account &amp; Preferences | Account &amp; preferences | Rewrite | [F132:46](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:46), [F132:210](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:210) |
| S002 | Profile &amp; lifespan settings | Your account and preferences | Rewrite | [F132:47](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:47) |
| S003 | AI Models | AI models | Rewrite | [F132:52](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:52), [F132:327](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:327) |
| S004 | Providers &amp; model keys | Providers, models and API keys | Rewrite | [F132:53](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:53) |
| S005 | MCP Server | MCP server | Rewrite | [F132:58](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:58), [F132:742](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:742) |
| S006 | Agent connections &amp; config | Connect an AI client | Rewrite | [F132:59](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:59) |
| S007 | Format Guide | Format guide | Rewrite | [F132:64](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:64), [F132:831](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:831) |
| S008 | format.llm.md specification | Page formatting reference | Rewrite | [F132:65](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:65) |
| S009 | Settings | Settings | Keep | [F132:130](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:130) |
| S010 | Your Google account and personal settings | — | Remove | [F132:212](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:212) |
| S011 | Profile | Profile | Keep | [F132:222](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:222) |
| S012 | Name | Name | Keep | [F132:227](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:227) |
| S013 | Google account | Google account | Keep | [F132:234](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:234) |
| S014 | Google is the only sign-in method. | Signed in with Google. | Rewrite | [F132:236](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:236) |
| S015 | Motivations | Quotes and breaks | Rewrite | [F132:248](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:248) |
| S016 | Show inspirations and a quote when you finish reading a private page. Always off on public pages. | Show quotes and break reminders on private pages. Never shown on public pages. | Rewrite | [F132:250](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:250) |
| S017 | Enable motivations | Show quotes and breaks | Rewrite | [F132:257](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:257) |
| S018 | Could not save this preference. Please try again. | Couldn’t save this preference. Try again. | Rewrite | [F132:270](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:270) |
| S019 | Life Perspective | Time perspective | Rewrite | [F132:281](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:281) |
| S020 | Remaining time counter on the Inspirations screen | Shows a time estimate on the break screen. | Rewrite | [F132:282](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:282) |
| S021 | Saved | Saved | Keep | [F132:287](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:287) |
| S022 | Date of Birth | Date of birth | Rewrite | [F132:294](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:294) |
| S023 | Expected Lifespan (Years) | Estimated lifespan (years) | Rewrite | [F132:305](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:305) |
| S024 | Configure provider credentials and custom models | Choose the models used for explanations, meanings and questions. | Rewrite | [F132:329](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:329) |
| S025 | Default Credentials | Default connection | Rewrite | [F132:339](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:339) |
| S026 | Provider Base URL | Provider URL | Rewrite | [F132:344](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:344) |
| S027 | API Key | API key | Rewrite | [F132:354](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:354) |
| S028 | Hide | Hide | Keep | [F132:363](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:363) |
| S029 | Show | Show | Keep | [F132:363](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:363) |
| S030 | Copied | Copied | Keep | [F132:375](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:375), [F132:784](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:784), [F132:858](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:858) |
| S031 | Copy | Copy | Keep | [F132:375](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:375), [F132:816](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:816) |
| S032 | Enter provider API key | Enter provider API key | Keep | [F132:385](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:385) |
| S033 | Hide API key | Hide API key | Keep | [F132:392](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:392), [F132:579](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:579), [F132:716](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:716) |
| S034 | Show API key | Show API key | Keep | [F132:392](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:392), [F132:579](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:579), [F132:716](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:716) |
| S035 | Model Assignments | Models by feature | Rewrite | [F132:403](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:403) |
| S036 | Passage Explanation | Explanations | Rewrite | [F132:407](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:407) |
| S037 | None | None | Keep | [F132:412](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:412), [F132:424](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:424), [F132:436](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:436) |
| S038 | Select model | Select model | Keep | [F132:415](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:415), [F132:427](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:427), [F132:439](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:439) |
| S039 | Word Meanings | Word meanings | Rewrite | [F132:419](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:419) |
| S040 | Asking Doubts | Questions | Rewrite | [F132:431](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:431) |
| S041 | System Prompts (Optional) | Custom instructions (optional) | Rewrite | [F132:448](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:448) |
| S042 | Explanation Prompt | Explanation instructions | Rewrite | [F132:452](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:452) |
| S043 | Custom instructions for passage explanation... | How should passages be explained? | Rewrite | [F132:456](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:456) |
| S044 | Meanings Prompt | Word-meaning instructions | Rewrite | [F132:461](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:461) |
| S045 | Custom instructions for word meanings... | How should words be explained? | Rewrite | [F132:465](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:465) |
| S046 | Doubts Prompt | Question instructions | Rewrite | [F132:470](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:470) |
| S047 | Custom instructions for answering reading doubts... | How should questions be answered? | Rewrite | [F132:474](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:474) |
| S048 | Save Settings | Save | Rewrite | [F132:483](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:483) |
| S049 | Custom Models | Custom models | Rewrite | [F132:496](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:496) |
| S050 | Add models with custom endpoints or API keys | Add a model. Set its connection details only if they differ from the defaults. | Rewrite | [F132:498](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:498) |
| S051 | Model | Model | Keep | [F132:503](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:503) |
| S052 | No custom models added yet. | No models added. | Rewrite | [F132:512](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:512) |
| S053 | Edit Model | Edit model | Rewrite | [F132:526](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:526) |
| S054 | Display Name | Display name | Rewrite | [F132:539](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:539), [F132:676](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:676) |
| S055 | Model ID | Model ID | Keep | [F132:547](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:547), [F132:684](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:684) |
| S056 | Base URL (Optional) | Provider URL (optional) | Rewrite | [F132:558](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:558), [F132:695](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:695) |
| S057 | Inherits default Base URL if empty | Leave blank to use the default provider URL | Rewrite | [F132:562](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:562) |
| S058 | API Key (Optional) | API key (optional) | Rewrite | [F132:566](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:566), [F132:703](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:703) |
| S059 | Inherits default API Key if empty | Leave blank to use the default API key | Rewrite | [F132:572](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:572) |
| S060 | Save Changes | Save | Rewrite | [F132:593](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:593) |
| S061 | Cancel | Cancel | Keep | [F132:600](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:600) |
| S062 | Custom Key | Custom API key | Rewrite | [F132:625](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:625) |
| S063 | Uses default credentials | Uses the default connection | Rewrite | [F132:631](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:631) |
| S064 | Edit model | Edit model | Keep | [F132:643](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:643) |
| S065 | Delete model | Delete model | Keep | [F132:653](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:653) |
| S066 | Add Model | Add model | Rewrite | [F132:671](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:671), [F132:731](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:731) |
| S067 | e.g. Groq LLaMA 3.3 70B | e.g. Groq LLaMA 3.3 70B | Keep | [F132:680](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:680) |
| S068 | e.g. llama-3.3-70b-versatile | e.g. llama-3.3-70b-versatile | Keep | [F132:688](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:688) |
| S069 | e.g. https://api.groq.com/openai/v1 | e.g. https://api.groq.com/openai/v1 | Keep | [F132:699](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:699) |
| S070 | Custom API key | Custom API key | Keep | [F132:709](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:709) |
| S071 | Connect external AI agents to Reader, Tasks and Finance with this one MCP server | Use this connection for Reader, Tasks and Finance. | Rewrite | [F132:744](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:744) |
| S072 | Connection Details | Connection | Rewrite | [F132:755](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:755) |
| S073 | Live SSE | SSE connection | Rewrite | [F132:760](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:760) |
| S074 | Server URL | Server URL | Keep | [F132:767](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:767) |
| S075 | Copy URL | Copy URL | Keep | [F132:784](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:784) |
| S076 | Copied Config | Copied | Rewrite | [F132:796](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:796) |
| S077 | Copy JSON Config | Copy configuration | Rewrite | [F132:796](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:796) |
| S078 | Configuration Snippet | Configuration | Rewrite | [F132:805](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:805) |
| S079 | Markdown format rules for AI-generated pages | Formatting reference for pages created by an AI client. | Rewrite | [F132:833](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:833) |
| S080 | format.llm.md | format.llm.md | Keep | [F132:844](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:844) |
| S081 | Copy Guide | Copy guide | Rewrite | [F132:858](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/page.tsx:858) |
| S082 | Base URL and API Key are required | Enter a provider URL and API key. | Rewrite | [F133:155](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:155) |
| S083 | AI configuration saved successfully | Settings saved | Rewrite | [F133:172](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:172) |
| S084 | Model Name and Model ID are required | Enter a display name and model ID. | Rewrite | [F133:181](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:181), [F133:215](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:215) |
| S085 | Model added successfully | Model added | Rewrite | [F133:204](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:204) |
| S086 | Model updated successfully | Model updated | Rewrite | [F133:235](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:235) |
| S087 | Model deleted successfully | Model deleted | Rewrite | [F133:253](D:/PersonalProjects/reader/reader-frontend/src/modules/settings/store.ts:253) |
