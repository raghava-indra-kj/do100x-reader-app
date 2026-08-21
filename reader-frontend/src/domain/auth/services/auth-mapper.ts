import { CurrentUser } from '../models/current-user';
import type { CurrentUserData } from '../models/current-user';

export function toCurrentUser(data: CurrentUserData): CurrentUser {
    return new CurrentUser({
        id: data.id,
        email: data.email,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        homepageId: data.homepageId,
    });
}
