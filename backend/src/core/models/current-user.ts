export class CurrentUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;

  constructor({ id, name, email }: { id: string; name: string; email: string }) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
}
