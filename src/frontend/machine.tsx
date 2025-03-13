import { ReactNode, useState } from "react";
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

type Transitions = {
  [key: string]: {
    description: string;
    schema: ObjectSchema<{ [key: string]: unknown }>;
  };
};

export type Machine<State, Ts extends Transitions> = {
  name: string;
  initial_State: State;
  Transitions: (state: State) => Ts;
  prompt_Transition: (state: State) => Promise<{
    system: string;
    messages: Message[];
  }>;
  update_State: (state: State, transitions: Transition<Ts>[]) => Promise<State>;
  render_State: (state: State) => ReactNode;
  render_Transition: (transition: Transition<Ts>) => ReactNode;
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

export type Transition<Ts extends Transitions> = {
  [K in keyof Ts]: { name: K; args: schema.Infer<Ts[K]["schema"]> };
}[keyof Ts];

// -----------------------------------------------------------------------------

export function make_Machine<State, Ts extends Transitions>(
  machine: Machine<State, Ts>,
): Machine<State, Ts> {
  return machine;
}

// -----------------------------------------------------------------------------

async function generate_Transitions<State, Ts extends Transitions>(
  machine: Machine<State, Ts>,
  state: State,
): Promise<Transition<Ts>[]> {
  const prompt = await machine.prompt_Transition(state);

  const functionDeclarations: google.FunctionDeclaration[] = Object.entries(
    machine.Transitions(state),
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
  const transitions: Transition<Ts>[] = functionCalls.map(
    (fc) => ({ name: fc.name, args: fc.args }) as Transition<Ts>,
  );
  return transitions;
}

async function generate_Next_State<State, Ts extends Transitions>(
  machine: Machine<State, Ts>,
  state: State,
): Promise<State> {
  const transitions = await generate_Transitions(machine, state);
  return await machine.update_State(state, transitions);
}

// -----------------------------------------------------------------------------

export function Component<State, Ts extends Transitions>(props: {
  machine: Machine<State, Ts>;
}): ReactNode {
  const [history, set_history] = useState<State[]>([
    props.machine.initial_State,
  ]);

  const [viewing_state_index, set_viewing_state_index] = useState(0);

  async function update() {
    const current_State = history[history.length - 1];
    const next_State = await generate_Next_State(props.machine, current_State);
    set_history((history) => [...history, next_State]);
    set_viewing_state_index(history.length - 1);
  }

  async function step_forward() {
    set_viewing_state_index((viewing_state_index) =>
      viewing_state_index < history.length - 1
        ? viewing_state_index + 1
        : viewing_state_index,
    );
  }

  async function step_backward() {
    set_viewing_state_index((viewing_state_index) =>
      viewing_state_index > 0 ? viewing_state_index - 1 : viewing_state_index,
    );
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
            disabled={viewing_state_index === history.length - 1}
          >
            {"-"}
          </button>
          {viewing_state_index + 1} / {history.length}
          <button onClick={step_backward} disabled={viewing_state_index === 0}>
            {"+"}
          </button>
        </div>
      </div>

      <div className="State">
        {props.machine.render_State(history[viewing_state_index])}
      </div>
    </div>
  );
}
