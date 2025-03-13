// -----------------------------------------------------------------------------

export type Domain =
  | StringDomain
  | NumberDomain
  | BooleanDomain
  | ArrayDomain<any>
  | ObjectDomain<{ [key: string]: any }>;

export type StringDomain = { type: "string" };
export type NumberDomain = { type: "number" };
export type BooleanDomain = { type: "boolean" };
export type ArrayDomain<D_items extends Domain> = {
  type: "array";
  items: D_items;
};
export type ObjectDomain<D_props extends { [key: string]: Domain }> = {
  type: "object";
  props: D_props;
};

export type FromDomain<D extends Domain> = D extends StringDomain
  ? string
  : D extends NumberDomain
    ? number
    : D extends BooleanDomain
      ? boolean
      : D extends ArrayDomain<infer D_items>
        ? FromDomain<D_items>[]
        : D extends ObjectDomain<infer D_props>
          ? {
              [K in keyof D_props]: D_props[K] extends Domain
                ? FromDomain<D_props[K]>
                : never;
            }
          : never;

type D_ex1 = ObjectDomain<{
  a: StringDomain;
  b: ArrayDomain<BooleanDomain>;
  c: NumberDomain;
  d: BooleanDomain;
}>;

type T_ex1 = FromDomain<D_ex1>;

// -----------------------------------------------------------------------------

type Schema<D extends Domain> =
  | { type: "string"; description?: string }
  | { type: "number"; description?: string }
  | { type: "boolean"; description?: string }
  | { type: "array"; items: Schema<any>; description?: string }
  | {
      type: "object";
      props: { [key: string]: [number, Schema<any>] };
      description?: string;
    };

export function string(description?: string): Schema<StringDomain> {
  return { type: "string", description };
}

export function number(description?: string): Schema<NumberDomain> {
  return { type: "number", description };
}

export function boolean(description?: string): Schema<BooleanDomain> {
  return { type: "boolean", description };
}

export function array<D_items extends Domain>(
  items: Schema<D_items>,
  description?: string,
): Schema<ArrayDomain<D_items>> {
  return { type: "array", items, description };
}

export function object<D_props extends { [key: string]: Domain }>(
  props: { [K in keyof D_props]: [number, Schema<D_props[K]>] },
  description?: string,
): Schema<ObjectDomain<D_props>> {
  return { type: "object", props, description };
}

const schema_ex1 = object({
  a: [0, string()],
  b: [1, array(boolean())],
  c: [2, number()],
  d: [3, boolean()],
});

type GetDomain<S extends Schema<any>> = S extends Schema<infer D> ? D : never;

type T_ex1_prime = GetDomain<typeof schema_ex1>;
