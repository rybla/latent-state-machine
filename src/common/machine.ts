import { ReactNode } from "react";
import { NumberSchema, ObjectSchema, Schema, StringSchema } from "./schema";
import * as schema from "./schema";

export type Machine<
  State,
  Transitions extends {
    [key: string]: ObjectSchema<{ [key: string]: unknown }>;
  },
> = {
  initial_State: State;
  Transitions: Transitions;
  update: (state: State, transition: Transition<Transitions>) => State;
};

export function make_Machine<
  State,
  Transitions extends {
    [key: string]: ObjectSchema<{ [key: string]: unknown }>;
  },
>(machine: Machine<State, Transitions>): Machine<State, Transitions> {
  return machine;
}

export type Transition<
  Transitions extends {
    [key: string]: ObjectSchema<{ [key: string]: unknown }>;
  },
> = {
  [K in keyof Transitions]: { name: K; args: schema.Infer<Transitions[K]> };
}[keyof Transitions];

type Transition_Ex1 = Transition<{
  announce: ObjectSchema<{ message: StringSchema }>;
  move: ObjectSchema<{ distance: NumberSchema }>;
}>;
