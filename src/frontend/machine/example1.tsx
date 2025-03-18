import { Codomain, identity } from "@/utilities";
import {
  Machine,
  make_Machine,
  make_user_message,
  Transition,
} from "../machine";
import * as schema from "@/common/schema";

const players = ["Alice", "Bob", "Charlie"] as const;
type Player = (typeof players)[number];

type State = {
  active_player: Player;
  tokens: { [K in Player]: number };
  actions: { actor: Player; action: Transition<Ts> }[];
};

const starting_tokens = 10;

const Transitions = (state: State) => ({
  send_tokens: {
    description:
      "Secretly send some tokens to another player. Only that player is notified that you sent the tokens.",
    schema: schema.object({
      recipient: [
        0,
        schema.string_enum(players, {
          description: "The name of the player to secretly send the tokens to.",
        }),
      ],
      amount: [
        1,
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
      recipient: [
        0,
        schema.string_enum(players, {
          description: "The name of the player to send the secret message to.",
        }),
      ],
      message: [
        1,
        schema.string({
          description:
            "The text of the secret message to send. Keep it brief (up to ~50 words).",
        }),
      ],
    }),
  },
});

type Ts = Codomain<typeof Transitions>;
type X = Transition<Ts>;

export const machine = make_Machine<State, Ts>({
  name: "example1",
  initial_State: {
    active_player: players[0],
    tokens: players.reduce(
      (acc, player) => ({ ...acc, [player]: starting_tokens }),
      {} as { [K in Player]: number },
    ),
    actions: [],
  },
  get_transitions: Transitions,
  prompt_Transition: async (state) => {
    const you = state.active_player;
    const recent_actions = state.actions;

    return {
      system: `
You are playing a casual role-playing game with several other players. Your name is ${you}.
The other players are: ${players.filter((player) => player !== you).join(", ")}.

Here's how the game works. The players take turns in a random order. On each turn, the active player can do any number of the following actions:
  - Secretly send a short message to another player.
  - Secretly send some tokens to another player.

The goal of the game is to accumulate the most tokens by the end of the game.

Use the appropriate tools to perform your actions each turn.
`.trim(),
      messages: [
        make_user_message(
          `
It's now your turn in the game.
Since your last turn, you observed the following actions:
${recent_actions
  .flatMap(({ actor, action }) => {
    switch (action.name) {
      case "send_message": {
        if (you === actor) {
          return [
            `  - You told ${action.args.recipient}: ${action.args.message}`,
          ];
        } else if (you === action.args.recipient) {
          return [`  - ${actor} told you: ${action.args.message}`];
        } else {
          return [];
        }
      }
      case "send_tokens": {
        if (you === actor) {
          return [
            `  - You sent ${action.args.amount} tokens to ${action.args.recipient}.`,
          ];
        } else if (you === action.args.recipient) {
          return [`  - ${actor} sent you ${action.args.amount} tokens.`];
        } else {
          return [];
        }
      }
    }
  })
  .join("\n")}

Use the appropriate tools to perform your actions this turn.
`.trim(),
        ),
      ],
    };
  },
  update_State: async (old_state, transitions) => {
    const you = old_state.active_player;
    const state = { ...old_state };
    for (const action of transitions) {
      switch (action.name) {
        case "send_message": {
          old_state.actions.push({ actor: you, action: action });
          break;
        }
        case "send_tokens": {
          if (old_state.tokens[you] >= action.args.amount) {
            old_state.tokens[you] -= action.args.amount;
            old_state.tokens[action.args.recipient] += action.args.amount;
          }
          old_state.actions.push({ actor: you, action: action });
          break;
        }
      }
    }
    return state;
  },
  render_State: (state) => (
    <div>
      <h2>State</h2>
      <p>Active Player: {state.active_player}</p>
      <p>Tokens: {JSON.stringify(state.tokens)}</p>
      <p>Actions: {JSON.stringify(state.actions)}</p>
    </div>
  ),
  render_Transition: (transition) => {
    return (
      <div>
        <h2>Transition</h2>
        <p>Name: {transition.name}</p>
        <p>Recipient: {transition.args.recipient}</p>
      </div>
    );
  },
  render_State_And_Transitions: (state, transitions) => (
    <div>
      {state && state.active_player && (
        <div>
          <h2>State</h2>
          <p>Active Player: {state.active_player}</p>
          <p>Tokens: {JSON.stringify(state.tokens)}</p>
          <p>Actions: {JSON.stringify(state.actions)}</p>
        </div>
      )}
      {transitions && transitions.length > 0 && (
        <div>
          <h2>Transitions</h2>
          <ul>
            {transitions.map((transition, index) => (
              <li key={index}>{transition.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ),
});
