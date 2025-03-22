export type StringRecord<T> = { [key: string]: T };

export type FromAssocToRecord<T extends [string, any][] = []> = {
  [I in T[number] as I[0]]: I[1];
};

export const identity = <T>(x: T): T => x;

export type Codomain<T extends (...args: any) => any> = ReturnType<T>;

export type UnReadonly<T> = {
  -readonly [P in keyof T]: T[P];
};

export type UnReadonlyTuple<T> = T extends readonly any[]
  ? { -readonly [P in keyof T]: T[P] }
  : never;

export type ReadonlyTuple<T> = T extends any[] ? readonly T[number][] : never;

export function wrap(text: string, max_width: number): string {
  const words = text.split(" ");
  let lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= max_width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

export function show_any(x: any, level?: number): string {
  const level_ = level === undefined ? 0 : level;
  const indent = "\n" + "    ".repeat(level_);

  switch (typeof x) {
    case "string":
      return x;
    case "symbol":
    case "bigint":
    case "symbol":
    case "boolean":
    case "number":
      return x.toString();
    case "object": {
      if (Array.isArray(x)) {
        return `${x.map((y) => `${indent}- ${show_any(y, level_ + 1)}`).join("")}`;
      } else {
        return `${Object.entries(x)
          .map(([k, v]) => `${indent}- ${k}: ${show_any(v, level_ + 1)}`)
          .join("")}`;
      }
    }
    case "function":
      return `<function ${x.name || "anonymous"}>`;
    case "undefined":
      return "undefined";
  }
}
