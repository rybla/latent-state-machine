import { absurd, Codomain, identity, wrap } from "@/utilities";
import { make_Machine, make_user_message } from "../machine";
import * as schema from "@/common/schema";
import deepcopy from "deepcopy";
import { ReactNode } from "react";
import "./generative_ui.css";

// -----------------------------------------------------------------------------

// const design_goal =
//   "A simple, user-friendly interface for a task management app aimed at busy students. The goal is to create a clean, single-screen layout that lets users quickly add tasks, mark them as complete, and view their upcoming deadlines, using a minimal color palette and clear typography to keep it approachable and distraction-free.";

const design_goal = `
- **Header (top bar)**
  - Fixed at the top, full width
  - Light gray background, subtle shadow
  - Left: "TODO" title in bold, dark gray text
  - Right: Blue circular "Add" button with white "+" icon
    - Darkens slightly when hovered or tapped

- **Main Content (middle area)**
  - Soft white background, fills remaining screen space
  - Tasks in a single-column list
    - Each task in a white card with light gray border, subtle shadow
    - Cards spaced with small gaps (about 10px)
    - Inside each card:
      - Left: Circular checkbox (gray outline, fills blue with white checkmark when checked)
      - Right: Task text
        - Bold, dark gray title
        - Smaller, light gray description below (if any)
  - Empty list shows:
    - Centered light gray "No tasks yet" text (italicized)
    - Simple line-drawn empty list icon above it

- **Footer (bottom bar)**
  - Fixed at bottom, full width
  - Light gray background
  - Right: Small blue "Clear Completed" button with white text
    - Rounded edges, darkens on hover/tap

- **Overall Style**
  - Clean, minimal look with sans-serif font (e.g., Roboto)
  - Soft whites/grays, blue accents for buttons and checks
  - Lots of padding for an uncluttered feel
  - Smooth, simple animations (e.g., checkbox fill, new tasks slide in)
  - Adjusts for screen size:
    - Smaller screens: Cards shrink, text fits neatly
    - Larger screens: Centered content with wider margins
`.trim();

// -----------------------------------------------------------------------------

type State = {
  doc: Doc;
  id_counter: number;
  design_goal: string;
  finished: boolean;
};

const get_transitions = (state: State) => ({
  replace_placeholder_with_text: {
    description: "Replace a placeholder with a text element.",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description:
            "The ID of the placeholder where the text should be inserted.",
        }),
      ],
      text: [1, schema.string()],
    }),
  },
  replace_placeholder_with_title: {
    description: "Replace a placeholder with a title element.",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description:
            "The ID of the placeholder where the title will be inserted.",
        }),
      ],
      title: [1, schema.string()],
    }),
  },
  replace_placeholder_with_container: {
    description: "Replace a placeholder with a container element.",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description:
            "The ID of the placeholder where the container will be inserted.",
        }),
      ],
      style: [1, schema.string_enum(["row", "column"])],
    }),
  },
  replace_placeholder_with_button: {
    description: "Replace a placeholder with a button element.",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description:
            "The ID of the placeholder where the button will be inserted.",
        }),
      ],
      label: [1, schema.string()],
    }),
  },
  add_child_to_container: {
    description: "Add child placeholder to a container",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description:
            "The ID of a container. A new child placeholder will be added to its array of children.",
        }),
      ],
    }),
  },
  wrap_border_around_element: {
    description: "Wrap a border around an element",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description: "The ID of the element to wrap with a border.",
        }),
      ],
    }),
  },
  wrap_container_around_element: {
    description:
      "Wrap an element in a container. The element will become the first child of the new container.",
    schema: schema.object({
      id: [
        0,
        schema.string({
          description: "The ID of the element to wrap in a container.",
        }),
      ],
      style: [1, schema.string_enum(["row", "column"])],
    }),
  },
  set_finished: {
    description:
      "Set whether or not the design is finished. Use this tool to set the design as finished (i.e. finished = true) when the design has satisfied the user's design goal.",
    schema: schema.object({ finished: [0, schema.boolean()] }),
  },
});

type T = Codomain<typeof get_transitions>;

export const machine = make_Machine<State, T>({
  name: "generative_ui",
  initial_state: {
    doc: {
      type: "Placeholder",
      id: `${0}`,
      hint: "this is the root of the page",
    },
    id_counter: 1,
    design_goal,
    finished: false,
  },
  get_finished: (s) => s.finished,
  get_transitions,
  prompt: async (h, s) => {
    const prompt = {
      system: `
You are an assistant for creating mockup UI designs for web applications.
Your designs should have excellent aesthetic taste as well as being very user-friendly.

The user is currently working on a UI design. They describe their design goal as follows:

  ${s.design_goal}

The user will provide you with a structured representation of their design so far.
Since it is still in progress, the design will have some placeholders in it, which are annotated with a hint about what they are for.
Each element (including placeholders) will have a unique ID so that you can refer to a particular element by its ID.

Given the user's in-progress design, you should use appropriate tools to build upon the design along the lines of their design goal by wrapping and inserting elements. Make sure to only insert elements into placeholders, and only add a child to a container.
`.trim(),
      messages: [
        make_user_message(
          `
Here's my design so far:

${show_Doc(s.doc)}
`.trim(),
        ),
      ],
    };
    console.log(prompt.system);
    console.log(prompt.messages[0].content);
    return prompt;
  },
  update_state: async (s, ts) => {
    const s_new = deepcopy(s);

    function modify_at_id(d: Doc, id: string, f: (d: Doc) => Doc): Doc {
      if (d.id === id) {
        return f(d);
      } else {
        switch (d.type) {
          case "Text":
            return d;
          case "Title":
            return d;
          case "Container":
            return {
              ...d,
              children: d.children.map((c) => modify_at_id(c, id, f)),
            };
          case "Bordered":
            return {
              ...d,
              child: modify_at_id(d.child, id, f),
            };
          case "Button":
            return d;
          case "Placeholder":
            return d;
        }
      }
    }

    for (const t of ts) {
      switch (t.name) {
        case "replace_placeholder_with_text": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Text",
            id: `${s_new.id_counter++}`,
            content: t.args.text,
          }));
          break;
        }
        case "replace_placeholder_with_title": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Title",
            id: `${s_new.id_counter++}`,
            content: t.args.title,
          }));
          break;
        }
        case "replace_placeholder_with_container": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Container",
            id: `${s_new.id_counter++}`,
            style: t.args.style as "row" | "column",
            children: [],
          }));
          break;
        }
        case "replace_placeholder_with_button": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Button",
            id: `${s_new.id_counter++}`,
            label: t.args.label,
          }));
          break;
        }
        case "add_child_to_container": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, (d) => {
            switch (d.type) {
              case "Container":
                return {
                  type: "Container",
                  id: `${s_new.id_counter++}`,
                  style: d.style,
                  children: [
                    ...d.children,
                    {
                      type: "Placeholder",
                      id: `${s_new.id_counter++}`,
                      hint: "a child of the container",
                    },
                  ],
                };
              default:
                return d;
            }
          });
          break;
        }
        case "wrap_border_around_element": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, (d) => ({
            type: "Bordered",
            id: `${s_new.id_counter++}`,
            child: d,
          }));
          break;
        }
        case "wrap_container_around_element": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, (d) => ({
            type: "Container",
            id: `${s_new.id_counter++}`,
            style: "column",
            children: [d],
          }));
          break;
        }
        case "set_finished":
          s_new.finished = true;
          break;
        default:
          return absurd(t);
      }
    }

    return s_new;
  },

  render_state_and_transitions: (ts, s) => {
    return (
      <>
        <div className="View">
          <div>
            <div>finished: {s.finished ? "true" : "false"}</div>
            <div>doc:</div>
            <pre>{show_Doc(s.doc)}</pre>
            <div>transitions:</div>
            <pre>{JSON.stringify(ts, undefined, 4)}</pre>
          </div>
          <DocComponent doc={s.doc} />
        </div>
      </>
    );
  },
});

// -----------------------------------------------------------------------------

type Doc =
  | { type: "Text"; id: string; content: string }
  | { type: "Title"; id: string; content: string }
  | { type: "Container"; id: string; style: "row" | "column"; children: Doc[] }
  | { type: "Bordered"; id: string; child: Doc }
  | { type: "Placeholder"; id: string; hint: string }
  | { type: "Button"; id: string; label: string };

function DocComponent(props: { doc: Doc }): ReactNode {
  function render(d: Doc, key?: string): ReactNode {
    switch (d.type) {
      case "Placeholder":
        return <div className={`Doc ${d.type}`}>placeholder {d.id}</div>;
      case "Text":
        return <div className={`Doc ${d.type}`}>{d.content}</div>;
      case "Title":
        return <div className={`Doc ${d.type}`}>{d.content}</div>;
      case "Container":
        return (
          <div className={`Doc ${d.type} ${d.style}`}>
            {d.children.map((d, i) => render(d, `${i}`))}
          </div>
        );
      case "Bordered":
        return <div className={`Doc ${d.type}`}>{render(d.child)}</div>;
      case "Button":
        return <button className={`Doc ${d.type}`}>{d.label}</button>;
    }
  }

  return render(props.doc);
}

/** Constructs a string that is a structured description of the given Doc. */
function show_Doc(d: Doc, depth_?: number): string {
  const depth = depth_ ?? 0;
  const indent_segment = "    ";
  const indent = (depth: number) => indent_segment.repeat(depth);

  function helper(
    label: string,
    props_: [string, string][],
    value?: string,
    children?: string[],
  ): string {
    const props_string = props_
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    if (children === undefined) {
      return `${indent(depth)}${label} (${props_string})${value === undefined ? "" : `: ${value}`}`;
    } else if (children.length === 0) {
      return `${indent(depth)}${label} (${props_string}):${value === undefined ? "" : ` ${value}`}\n${indent(depth + 1)}currently has no children`;
    } else {
      return `${indent(depth)}${label} (${props_string}):${value === undefined ? "" : ` ${value}`}\n${children.join("\n")}`;
    }
  }

  switch (d.type) {
    case "Placeholder":
      return helper(`placeholder`, [["id", `${d.id}`]], d.hint);
    case "Text":
      return helper(`text`, [["id", `${d.id}`]], d.content);
    case "Title":
      return helper(`title`, [["id", `${d.id}`]], d.content);
    case "Container":
      return helper(
        `container`,
        [
          ["id", `${d.id}`],
          ["style", d.style],
        ],
        undefined,
        d.children.map((d) => show_Doc(d, depth + 1)),
      );
    case "Bordered":
      return helper(`bordered`, [["id", `${d.id}`]], undefined, [
        show_Doc(d.child, depth + 1),
      ]);
    case "Button":
      return helper(`button`, [["id", `${d.id}`]], d.label);
  }
}
