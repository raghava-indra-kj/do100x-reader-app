export class TaskHierarchyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
