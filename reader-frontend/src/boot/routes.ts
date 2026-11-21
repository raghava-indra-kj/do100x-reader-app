export const homePageRoute = "/"
export const readerPageWithIdRoute = "/reader/pages/:id"
export const readerPageWithIdRouteValue = (pageId: string) => `/reader/pages/${encodeURIComponent(pageId)}`
export const loginPageRoute = "/login"
export const readerPageRoute = "/reader"
export const vocabularyPageRoute = "/reader/vocabulary"
export const settingsPageRoute = "/settings"
export function settingsSectionRoute(section: 'account' | 'ai' | 'mcp' | 'guide', currentParams?: URLSearchParams) {
    const params = new URLSearchParams(currentParams);
    if (section === 'account') params.delete('section');
    else params.set('section', section);
    const query = params.toString();
    return query ? `${settingsPageRoute}?${query}` : settingsPageRoute;
}
export const tasksPageRoute = "/tasks"
export const financePageRoute = "/finance"
export const habitsPageRoute = "/habits"
export const calendarPageRoute = "/calendar"
