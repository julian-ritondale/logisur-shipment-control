/** Any value JSON can hold. `null` here is JSON's own null. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | JsonObject;

/** A JSON object. Optional (`undefined`) properties are left out when serialized. */
export type JsonObject = { [key: string]: JsonValue | undefined };
