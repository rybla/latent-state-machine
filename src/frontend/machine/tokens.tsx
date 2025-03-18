import { Codomain, identity, wrap } from "@/utilities";
import {
  Machine,
  make_Machine,
  make_user_message,
  Transition,
} from "../machine";
import * as schema from "@/common/schema";
import Diagram from "../widgets/diagram";
import deepcopy from "deepcopy";

type Player = {
  name: string;
  secret_objective: string;
};

type State = {
  active_player_index: number;
  players: Player[];
  tokens: { [key: string]: number };
};

const starting_tokens = 10;
const diagram_scale = 0.7;
const diagram_width = 600;
const diagram_height = 600;
const diagram_radius = diagram_scale * diagram_width;
const node_radius = 90;

const get_transitions = (state: State) => ({
  send_tokens: {
    description:
      "Secretly send some tokens to another player. Only that player is notified that you sent the tokens.",
    schema: schema.object({
      sender: [
        0,
        schema.string_enum(
          state.players.map((p) => p.name),
          {
            description: "Your name.",
          },
        ),
      ],
      receiver: [
        1,
        schema.string_enum(
          state.players.map((p) => p.name),
          {
            description:
              "The name of the player to secretly send the tokens to.",
          },
        ),
      ],
      amount: [
        2,
        schema.integer({
          description:
            "The number of tokens to secretly send. This must be at LEAST 1 and at MOST the number of tokens you have.",
        }),
      ],
    }),
  },
  send_message: {
    description:
      "Send a short secret message to another player. Only that player can read it, and no other players will know that you sent the message.",
    schema: schema.object({
      sender: [
        0,
        schema.string_enum(
          state.players.map((p) => p.name),
          {
            description: "Your name.",
          },
        ),
      ],
      receiver: [
        1,
        schema.string_enum(
          state.players.map((p) => p.name),
          {
            description:
              "The name of the player to send the secret message to.",
          },
        ),
      ],
      message: [
        2,
        schema.string({
          description:
            "The text of the secret message to send. Keep it brief (up to ~50 words).",
        }),
      ],
    }),
  },
});

type T = Codomain<typeof get_transitions>;

export const machine = make_Machine<State, T>({
  name: "tokens",
  initial_State: (() => {
    const players = [
      {
        name: "Alice",
        secret_objective:
          "subtly convince the other players to give you their tokens",
      },
      {
        name: "Bob",
        secret_objective:
          "figure out which player is trying to collect the most tokens, and give some tokens to all players other than them",
      },
      {
        name: "Charlie",
        secret_objective:
          "distribute tokens so that each player has the same number of tokens",
      },
    ];
    return {
      active_player_index: 0,
      players,
      tokens: players.reduce(
        (acc, player) => ({ ...acc, [player.name]: starting_tokens }),
        {} as { string: number },
      ),
    };
  })(),
  get_transitions,
  prompt_transition: async (history, state) => {
    const i_you = state.active_player_index;
    const you = state.players[i_you];

    return {
      system: `
You are playing a casual role-playing game with several other players. Each player has their own secret objective.
Your name is ${you.name} and your secret objective is: ${you.secret_objective}.
The other players are: ${state.players
        .filter((other) => other !== you)
        .map((other) => other.name)
        .join(", ")}.

Here's how the game works. The players take turns in a random order. On each turn, the active player can do any number of the following actions:
  - Secretly send a short message to another player.
  - Secretly send some tokens to another player.

The goal of the game is to accumulate the most tokens by the end of the game.

Use the appropriate tools to perform your actions each turn.
`.trim(),
      messages: [
        make_user_message(
          `

${(() => {
  if (history.length === 0) {
    return `It's now your turn, which is the first turn of the game.`;
  } else {
    return `It's now your turn in the game. You have observed the following actions recently:\n
    ${history
      .slice(history.length - 5)
      .flatMap(([ts, _]) =>
        ts.flatMap((t) => {
          switch (t.name) {
            case "send_message": {
              if (you.name === t.args.sender) {
                return [`  - You told ${t.args.receiver}: ${t.args.message}`];
              } else if (you.name === t.args.receiver) {
                return [`  - ${t.args.sender} told you: ${t.args.message}`];
              } else {
                return [];
              }
            }
            case "send_tokens": {
              if (you.name === t.args.sender) {
                return [
                  `  - You sent ${t.args.amount} tokens to ${t.args.receiver}.`,
                ];
              } else if (you.name === t.args.receiver) {
                return [
                  `  - ${t.args.sender} sent you ${t.args.amount} tokens.`,
                ];
              } else {
                return [];
              }
            }
          }
        }),
      )
      .join("\n")}`.trim();
  }
})()}

You currently have ${state.tokens[you.name]} tokens.

Use the appropriate tools to perform your actions this turn.
`.trim(),
        ),
      ],
    };
  },
  update_state: async (state_, transitions) => {
    const state = deepcopy(state_);
    for (const t of transitions) {
      if (
        !(
          state.active_player_index ==
          state.players.findIndex((p) => p.name == t.args.sender)
        )
      ) {
        console.error("active player is not sender");
        break;
      }
      switch (t.name) {
        case "send_message": {
          break;
        }
        case "send_tokens": {
          if (state.tokens[t.args.sender] >= t.args.amount) {
            state.tokens[t.args.sender] -= t.args.amount;
            state.tokens[t.args.receiver] += t.args.amount;
          }
          break;
        }
      }
    }
    state.active_player_index =
      (state.active_player_index + 1) % state.players.length;
    return state;
  },
  render_state_and_transitions: (s, ts) => {
    const ts_collected: [
      { sender: string; receiver: string },
      Transition<T>[],
    ][] = [];
    for (const t of ts) {
      const ts_c = ts_collected.find(
        ([{ sender, receiver }, _]) =>
          sender == t.args.sender && receiver == t.args.receiver,
      );
      if (ts_c === undefined) {
        ts_collected.push([
          { sender: t.args.sender, receiver: t.args.receiver },
          [t],
        ]);
      } else {
        ts_c[1].push(t);
      }
    }
    return (
      <Diagram
        width={diagram_width}
        height={diagram_height}
        nodes={s.players.map((p, i_p) => ({
          id: p.name,
          label: `${p.name}: ${s.tokens[p.name]}\n\n${wrap(p.secret_objective, 30)}`,
          x:
            diagram_width / 2 +
            diagram_scale *
              (diagram_width / 2) *
              Math.cos(2 * Math.PI * (i_p / s.players.length)),
          y:
            diagram_height / 2 +
            diagram_scale *
              (diagram_height / 2) *
              Math.sin(2 * Math.PI * (i_p / s.players.length)),
          fillStyle: i_p === s.active_player_index ? "lightblue" : "lightgray",
          radius: node_radius,
        }))}
        edges={ts_collected.map(([{ sender, receiver }, ts], index) => ({
          source: sender,
          target: receiver,
          label: ts
            .map((t) => {
              switch (t.name) {
                case "send_message":
                  return `${wrap(t.args.message, 30)}`;
                case "send_tokens":
                  return `sent ${t.args.amount} tokens`;
              }
            })
            .join("\n\n"),
        }))}
      />
    );
  },
});
