// import { Codomain, identity, wrap } from "@/utilities";
// import {
//   Machine,
//   make_Machine,
//   make_user_message,
//   Transition,
// } from "../machine";
// import * as schema from "@/common/schema";
// import Diagram from "../widgets/diagram";
// import deepcopy from "deepcopy";

// type State = {};

// const get_transitions = (state: State) => ({
//   send_message: {
//     description: "Send a short written message.",
//     schema: schema.object({}),
//   },
// });

// type T = Codomain<typeof get_transitions>;

// export const machine = make_Machine<State, T>({
//   name: "kingdom",
//   initial_state: {},
//   get_transitions,
//   prompt_transition: async (h, s) => {
//     return { system: "TODO", messages: [make_user_message("TODO")] };
//   },
//   update_state: async (s, ts) => {
//     return s;
//   },
//   render_state_and_transitions: async (ts, s) => {
//     return <></>;
//   },
// });
