/** Validate HTTP fixtures before tests rely on individual response fields. */
export async function readJson<T>(response: Response | Promise<Response>, schema: { parse(value: unknown): T }): Promise<T> {
  return schema.parse(await (await response).json());
}
