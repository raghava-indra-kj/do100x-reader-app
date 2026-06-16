import { CurrentUser } from '../models/current-user';
import type { CurrentUserData } from '../models/current-user';

export function toCurrentUser(data: CurrentUserData): CurrentUser {
    return new CurrentUser({
        id: data.id,
        username: data.username,
        password: data.password,
        homepageId: data.homepageId,
    });
}
