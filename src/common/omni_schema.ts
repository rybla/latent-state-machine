type Schema =
  | { type: "string"; description?: string }
  | { type: "number"; description?: string }
  | { type: "boolean"; description?: string }
  | { type: "array"; items: Schema; description?: string }
  | {
      type: "object";
      props: { [key: string]: [number, Schema] };
      description?: string;
    };

export function string(description?: string): Schema {
  return { type: "string", description };
}

export function number(description?: string): Schema {
  return { type: "number", description };
}

export function boolean(description?: string): Schema {
  return { type: "boolean", description };
}

export function array(items: Schema, description?: string): Schema {
  return { type: "array", items, description };
}

export function object(
  props: { [key: string]: [number, Schema] },
  description?: string,
): Schema {
  return { type: "object", props, description };
}

const schema_ex1 = object({
  a: [0, string()],
  b: [1, array(boolean())],
  c: [2, number()],
  d: [3, boolean()],
});

// type GetDomain<S extends Schema<any>> = S extends Schema<infer D> ? D : never;

// type T_ex1_prime = GetDomain<typeof schema_ex1>;
