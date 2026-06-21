export type AuthUser = {
    id: string;
    name: string;
    email: string;
    homepageId: string;
};

export type AuthToken = {
    accessToken: string;
};

export type AuthResult = {
    user: AuthUser;
    token: AuthToken;
};
