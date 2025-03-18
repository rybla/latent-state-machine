import { ReactNode, useEffect, useState } from "react";
import {
  NumberSchema,
  ObjectSchema,
  Schema,
  StringSchema,
} from "@/common/schema";
import * as schema from "@/common/schema";
import "./machine.css";
import * as request from "@/frontend/request";
import google from "@google/generative-ai";

// -----------------------------------------------------------------------------

type TransitionForm = {
  [key: string]: {
    description: string;
    schema: ObjectSchema<{ [key: string]: unknown }>;
  };
};

export type Transition<T extends TransitionForm> = {
  [K in keyof T]: { name: K; args: schema.Infer<T[K]["schema"]> };
}[keyof T];

export type Transitions<T extends TransitionForm> = Transition<T>[];

// -----------------------------------------------------------------------------

export type Machine<State, T extends TransitionForm> = {
  name: string;
  initial_State: State;
  get_transitions: (state: State) => T;
  prompt_Transition: (state: State) => Promise<{
    system: string;
    messages: Message[];
  }>;
  update_State: (state: State, transitions: Transition<T>[]) => Promise<State>;
  render_State_And_Transitions: (
    state: State,
    transitions: Transition<T>[],
  ) => ReactNode;
};

export type Message = {
  role: "assistant" | "user";
  content: string;
};

export function make_assistant_message(content: string): Message {
  return { role: "assistant", content };
}

export function make_user_message(content: string): Message {
  return { role: "user", content };
}

// ----------------------------------------------------------------------------

export function make_Machine<State, Ts extends TransitionForm>(
  machine: Machine<State, Ts>,
): Machine<State, Ts> {
  return machine;
}

// -----------------------------------------------------------------------------

async function generate_Transitions<State, T extends TransitionForm>(
  machine: Machine<State, T>,
  state: State,
): Promise<Transition<T>[]> {
  const prompt = await machine.prompt_Transition(state);

  const functionDeclarations: google.FunctionDeclaration[] = Object.entries(
    machine.get_transitions(state),
  ).map(([name, t]) => ({
    name,
    description: t.description,
    parameters: schema.to_GoogleSchema(
      t.schema,
    ) as google.FunctionDeclarationSchema,
  }));

  const tools: google.Tool[] = [{ functionDeclarations }];

  const { result } = await request.Generate({
    model: "gemini-2.0-flash",
    tools,
    toolConfig: {
      functionCallingConfig: {
        allowedFunctionNames: functionDeclarations.map((fd) => fd.name),
        mode: google.FunctionCallingMode.ANY,
      },
    },
    systemInstruction: { role: "system", parts: [{ text: prompt.system }] },
    content: prompt.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  });

  // TODO: is this ever anything interesting?
  // const text = result.response.text();

  const functionCalls = result.response.functionCalls();
  if (functionCalls === undefined) throw new Error("No function calls");
  const transitions: Transition<T>[] = functionCalls.map(
    (fc) => ({ name: fc.name, args: fc.args }) as Transition<T>,
  );
  return transitions;
}

async function generate_Next_State<State, T extends TransitionForm>(
  machine: Machine<State, T>,
  state: State,
): Promise<[State, Transitions<T>]> {
  const ts = await generate_Transitions(machine, state);
  return [await machine.update_State(state, ts), ts];
}

// -----------------------------------------------------------------------------

export function Component<State, T extends TransitionForm>(props: {
  machine: Machine<State, T>;
}): ReactNode {
  const [history, set_history] = useState<[State, Transitions<T>][]>([]);

  function get_State_and_Transitions(): [State, Transitions<T>] {
    if (history.length === 0) return [props.machine.initial_State, []];
    return history[history_index];
  }

  function push_history(state: State, ts: Transitions<T>) {
    set_history((history) => [...history, [state, ts]]);
  }

  const [history_index, set_history_index] = useState(0);

  function modify_history_index(f: (i: number) => number) {
    const i = f(history_index);
    if (i < 0 || i >= history.length) return;
    set_history_index(i);
  }

  useEffect(() => {
    modify_history_index(() => history.length - 1);
  }, [history]);

  async function update() {
    const [s, _] = get_State_and_Transitions();
    const [s_new, ts] = await generate_Next_State(props.machine, s);
    push_history(s_new, ts);
  }

  async function step_forward() {
    modify_history_index((i) => i + 1);
  }

  async function step_backward() {
    modify_history_index((i) => i - 1);
  }

  return (
    <div className="Machine">
      <div className="Title">Machine: {props.machine.name}</div>

      <div className="Controls">
        <button onClick={update}>update</button>
        <div>
          State{" "}
          <button
            onClick={step_forward}
            disabled={history_index === history.length - 1}
          >
            {"-"}
          </button>
          {history_index + 1} / {history.length}
          <button onClick={step_backward} disabled={history_index === 0}>
            {"+"}
          </button>
        </div>
      </div>

      <div className="State">
        {props.machine.render_State_And_Transitions(
          history[history_index][0],
          history[history_index][1],
        )}
      </div>
    </div>
  );
}
