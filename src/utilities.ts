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
