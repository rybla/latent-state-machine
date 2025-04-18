import { ReactNode, useEffect, useRef, useState } from "react";
import {
  NumberSchema,
  ObjectSchema,
  Schema,
  StringSchema,
} from "@/common/schema";
import * as schema from "@/common/schema";
import "./machine.css";
import * as request from "@/frontend/request";
import * as google from "@google/generative-ai";

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
  initial_state: State;
  get_finished: (state: State) => boolean;
  get_transitions: (state: State) => T;
  prompt: (
    history: History<State, T>,
    state: State,
  ) => Promise<{
    system: string;
    messages: Message[];
  }>;
  update_state: (state: State, transitions: Transition<T>[]) => Promise<State>;
  render_state_and_transitions: (
    transitions: Transition<T>[],
    state: State,
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

async function generate_transitions<State, T extends TransitionForm>(
  machine: Machine<State, T>,
  history: History<State, T>,
  state: State,
): Promise<Transition<T>[]> {
  const prompt = await machine.prompt(history, state);

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

  const transitions: Transition<T>[] = (
    (result.response.candidates ?? []) as google.GenerateContentCandidate[]
  ).flatMap((candidate) =>
    candidate.content.parts.flatMap((part) =>
      part.functionCall === undefined
        ? []
        : ({
            name: part.functionCall.name,
            args: part.functionCall.args,
          } as Transition<T>),
    ),
  );

  return transitions;
}

async function generate_next_state<State, T extends TransitionForm>(
  machine: Machine<State, T>,
  history: History<State, T>,
  state: State,
): Promise<History<State, T>[number]> {
  const ts = await generate_transitions(machine, history, state);
  return [ts, await machine.update_state(state, ts)];
}

// -----------------------------------------------------------------------------

export type History<State, T extends TransitionForm> = [
  Transitions<T>,
  State,
][];

export function Component<State, T extends TransitionForm>(props: {
  machine: Machine<State, T>;
}): ReactNode {
  const [history, set_history] = useState<History<State, T>>([
    [[], props.machine.initial_state],
  ]);
  const [history_index, set_history_index] = useState(0);
  const running_ref = useRef(false);

  function push_history(ts: Transitions<T>, state: State) {
    set_history((history) => [...history, [ts, state]]);
  }

  function modify_history_index(f: (i: number) => number) {
    const i = f(history_index);
    if (i < 0 || i >= history.length) return;
    set_history_index(i);
  }

  useEffect(() => {
    modify_history_index(() => history.length - 1);
  }, [history]);

  async function update() {
    const [_, s] = history[history_index];
    const [ts, s_new] = await generate_next_state(props.machine, history, s);
    push_history(ts, s_new);
  }

  async function start() {
    var [_, s] = history[history_index];
    running_ref.current = true;

    while (running_ref.current && !props.machine.get_finished(s)) {
      const [ts, s_new] = await generate_next_state(props.machine, history, s);
      push_history(ts, s_new);
      s = s_new;
    }

    running_ref.current = false;
  }

  async function stop() {
    running_ref.current = false;
  }

  async function step_forward() {
    modify_history_index((i) => i + 1);
  }

  async function step_backward() {
    modify_history_index((i) => i - 1);
  }

  const [state, transitions] = history[history_index];

  return (
    <div className="Machine">
      <div className="Controls">
        <div>
          <button onClick={start}>start</button>
          <button onClick={stop}>stop</button>
        </div>
        <div>
          <button onClick={update}>update</button>
        </div>
        <div>
          State
          <button onClick={step_backward} disabled={history_index === 0}>
            {" - "}
          </button>
          {history_index + 1} / {history.length}
          <button
            onClick={step_forward}
            disabled={history_index === history.length - 1}
          >
            {" + "}
          </button>
        </div>
      </div>

      <div className="State">
        {props.machine.render_state_and_transitions(state, transitions)}
      </div>
    </div>
  );
}
