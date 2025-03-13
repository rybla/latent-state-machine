import { UnReadonlyTuple } from "@/utilities";
import google from "@google/generative-ai";

// ----------------------------------------------------------------------------

export type Schema =
  | StringSchema
  | StringEnumSchema<readonly string[]>
  | IntegerSchema
  | NumberSchema
  | BooleanSchema
  | ArraySchema<unknown>
  | ObjectSchema<{ [key: string]: unknown }>;

// ----------------------------------------------------------------------------

export type StringSchema = {
  type: "string";
  description?: string;
};

export type StringEnumSchema<Vs> = {
  type: "string_enum";
  values: Vs;
  description?: string;
};

export type IntegerSchema = { type: "integer"; description?: string };

export type NumberSchema = { type: "number"; description?: string };

export type BooleanSchema = { type: "boolean"; description?: string };

export type ArraySchema<ItemSchema> = {
  type: "array";
  item: ItemSchema;
  description?: string;
  minItems?: number;
  maxItems?: number;
};

export type ObjectSchema<PropsSchema extends { [key: string]: unknown }> = {
  type: "object";
  props: { [K in keyof PropsSchema]: [number, PropsSchema[K]] };
};

// ----------------------------------------------------------------------------

export function string(options?: { description?: string }): StringSchema {
  return {
    type: "string",
    description: options?.description,
  };
}

export function string_enum<Vs extends readonly string[]>(
  values: Vs,
  options?: {
    description?: string;
  },
): StringEnumSchema<Vs> {
  return {
    type: "string_enum",
    description: options?.description,
    values,
  };
}

export function integer(options?: { description?: string }): IntegerSchema {
  return { type: "integer", description: options?.description };
}

export function number(options?: { description?: string }): NumberSchema {
  return { type: "number", description: options?.description };
}

export function boolean(options?: { description?: string }): BooleanSchema {
  return { type: "boolean", description: options?.description };
}

export function array<ItemSchema extends Schema>(
  items: ItemSchema,
  options?: {
    description?: string;
    minItems?: number;
    maxItems?: number;
  },
): ArraySchema<ItemSchema> {
  return {
    type: "array",
    item: items,
    description: options?.description,
    minItems: options?.minItems,
    maxItems: options?.maxItems,
  };
}

export function object<
  PropsSchema extends { readonly [key: string]: [number, Schema] },
>(
  props: PropsSchema,
): ObjectSchema<{ [K in keyof PropsSchema]: PropsSchema[K][1] }> {
  return { type: "object", props };
}

// ----------------------------------------------------------------------------

export type Infer<S extends Schema> = S["type"] extends "string"
  ? string
  : S["type"] extends "string_enum"
    ? S extends { values: readonly string[] }
      ? UnReadonlyTuple<S["values"]>[number]
      : never
    : S["type"] extends "integer"
      ? number
      : S["type"] extends "number"
        ? number
        : S["type"] extends "boolean"
          ? boolean
          : S["type"] extends "array"
            ? S extends { item: Schema }
              ? Infer<S["item"]>[]
              : never
            : S["type"] extends "object"
              ? S extends { props: { [key: string]: [number, Schema] } }
                ? { [K in keyof S["props"]]: Infer<S["props"][K][1]> }
                : never
              : never;

// ----------------------------------------------------------------------------

export function to_GoogleSchema(schema: Schema): google.Schema {
  switch (schema.type) {
    case "string": {
      return {
        type: google.SchemaType.STRING,
        description: schema.description,
      };
    }
    case "string_enum": {
      return {
        type: google.SchemaType.STRING,
        description: schema.description,
        enum: [...schema.values],
        format: "enum",
      };
    }
    case "integer":
      return { type: google.SchemaType.INTEGER };
    case "number":
      return { type: google.SchemaType.NUMBER };
    case "boolean":
      return { type: google.SchemaType.BOOLEAN };
    case "array":
      const schema_item = schema.item as Schema;
      return {
        type: google.SchemaType.ARRAY,
        items: to_GoogleSchema(schema_item),
        minItems: schema.minItems,
        maxItems: schema.maxItems,
      };
    case "object": {
      const props: [string, Schema][] = Object.entries(schema.props)
        .sort(([_x, [i, _s]], [_y, [j, _t]]) => i - j)
        .map(([x, [_i, s]]) => [x, s as Schema] as [string, Schema]);
      const properties: { [key: string]: google.Schema } = {};
      for (const [name, schema] of props) {
        properties[name] = to_GoogleSchema(schema);
      }
      const required = props.map(([name, _schema]) => name);
      return {
        type: google.SchemaType.OBJECT,
        properties,
        required,
        // @ts-ignore
        propertyOrdering: required,
      };
    }
  }
}

// ----------------------------------------------------------------------------

const schema_ex1 = object({
  a: [0, string()],
  b: [1, array(boolean())],
  c: [2, number()],
  d: [3, boolean()],
  e: [4, string_enum(["a", "b", "c"] as const)],
});
type T_ex1_prime = Infer<typeof schema_ex1>;

const schema_ex2 = string_enum(["a", "b", "c"] as const);
type T_ex2_prime = Infer<typeof schema_ex2>;
