export type StringRecord<T> = { [key: string]: T };

export type FromAssocToRecord<T extends [string, any][] = []> = {
  [I in T[number] as I[0]]: I[1];
};
