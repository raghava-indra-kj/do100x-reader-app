export class CurrentUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly homepageId: string;

  constructor({ id, name, email, homepageId }: { id: string; name: string; email: string; homepageId: string }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.homepageId = homepageId;
  }
}
