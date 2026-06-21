export class CurrentUser {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly homepageId: string;
    readonly sessionId: string;

    constructor({
        id,
        name,
        email,
        homepageId,
        sessionId,
    }: {
        id: string;
        name: string;
        email: string;
        homepageId: string;
        sessionId: string;
    }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.homepageId = homepageId;
        this.sessionId = sessionId;
    }
}
