import { Codomain, identity, wrap } from "@/utilities";
import { make_Machine, make_user_message } from "../machine";
import * as schema from "@/common/schema";

type State = {};

const get_transitions = (state: State) => ({});

type T = Codomain<typeof get_transitions>;

export const machine = make_Machine<State, T>({
  name: "TODO",
  initial_state: {},
  get_transitions,
  prompt: async (h, s) => {
    return { system: "TODO", messages: [make_user_message("TODO")] };
  },
  update_state: async (s, ts) => {
    return s;
  },
  render_state_and_transitions: async (ts, s) => {
    return <></>;
  },
});
