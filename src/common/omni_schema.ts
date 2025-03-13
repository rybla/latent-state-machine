import google, { BaseSchema } from "@google/generative-ai";

// ----------------------------------------------------------------------------

export type Schema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | ArraySchema<unknown>
  | ObjectSchema<{ [key: string]: unknown }>;

// ----------------------------------------------------------------------------

export type StringSchema = { type: "string"; description?: string };
export type NumberSchema = { type: "number"; description?: string };
export type BooleanSchema = { type: "boolean"; description?: string };
export type ArraySchema<ItemSchema> = {
  type: "array";
  item: ItemSchema;
  description?: string;
};
export type ObjectSchema<PropsSchema extends { [key: string]: unknown }> = {
  type: "object";
  props: { [K in keyof PropsSchema]: [number, PropsSchema[K]] };
  description?: string;
};

// ----------------------------------------------------------------------------

export function string(description?: string): StringSchema {
  return { type: "string", description };
}

export function number(description?: string): NumberSchema {
  return { type: "number", description };
}

export function boolean(description?: string): BooleanSchema {
  return { type: "boolean", description };
}

export function array<ItemSchema extends Schema>(
  items: ItemSchema,
  description?: string,
): ArraySchema<ItemSchema> {
  return { type: "array", item: items, description };
}

export function object<PropsSchema extends { [key: string]: [number, Schema] }>(
  props: PropsSchema,
  description?: string,
): ObjectSchema<{ [K in keyof PropsSchema]: PropsSchema[K][1] }> {
  return { type: "object", props, description };
}

// ----------------------------------------------------------------------------

export type Infer<S extends Schema> = S["type"] extends "string"
  ? string
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

export function toGoogleSchema(schema: Schema): google.Schema {
  switch (schema.type) {
    case "string":
      return { type: google.SchemaType.STRING };
    case "number":
      return { type: google.SchemaType.NUMBER };
    case "boolean":
      return { type: google.SchemaType.BOOLEAN };
    case "array":
      const schema_item = schema.item as Schema;
      return {
        type: google.SchemaType.ARRAY,
        items: toGoogleSchema(schema_item),
      };
    case "object": {
      const props: [string, Schema][] = Object.entries(schema.props)
        .sort(([_x, [i, _s]], [_y, [j, _t]]) => i - j)
        .map(([x, [_i, s]]) => [x, s as Schema] as [string, Schema]);
      const properties: { [key: string]: google.Schema } = {};
      for (const [name, schema] of props) {
        properties[name] = toGoogleSchema(schema);
      }
      const required = props.map(([name, _schema]) => name);
      return {
        type: google.SchemaType.OBJECT,
        description: schema.description,
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
});

type T_ex1_prime = Infer<typeof schema_ex1>;
