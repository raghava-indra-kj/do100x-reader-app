export const homePageRoute = "/"
export const readerPageWithIdRoute = "/reader/pages/:id"
export const readerPageWithIdRouteValue = (pageId: string) => `/reader/pages/${encodeURIComponent(pageId)}`
export const loginPageRoute = "/login"
export const readerPageRoute = "/reader"
export const vocabularyPageRoute = "/reader/vocabulary"
export const settingsPageRoute = "/settings"
export const tasksPageRoute = "/tasks"
export const financePageRoute = "/finance"
