import { Codomain, identity, wrap } from "@/utilities";
import { make_Machine, make_user_message } from "../machine";
import * as schema from "@/common/schema";
import deepcopy from "deepcopy";
import { ReactNode } from "react";
import "./generative_ui.css";

// -----------------------------------------------------------------------------

const design_goal =
  "A simple, user-friendly interface for a task management app aimed at busy students. The goal is to create a clean, single-screen layout that lets users quickly add tasks, mark them as complete, and view their upcoming deadlines, using a minimal color palette and clear typography to keep it approachable and distraction-free.";

// -----------------------------------------------------------------------------

type State = {
  doc: Doc;
  id_counter: number;
  design_goal: string;
};

const get_transitions = (state: State) => ({
  insert_text: {
    description: "Insert text into a placeholder",
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
  insert_title: {
    description: "Insert title into a placeholder",
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
  insert_container: {
    description: "Insert container into a placeholder",
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
  add_child: {
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
  wrap_with_border: {
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
  wrap_in_container: {
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
  },
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
          case "Placeholder":
            return d;
        }
      }
    }

    for (const t of ts) {
      switch (t.name) {
        case "insert_text": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Text",
            id: `${s_new.id_counter++}`,
            content: t.args.text,
          }));
          break;
        }
        case "insert_title": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Title",
            id: `${s_new.id_counter++}`,
            content: t.args.title,
          }));
          break;
        }
        case "insert_container": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, () => ({
            type: "Container",
            id: `${s_new.id_counter++}`,
            style: t.args.style as "row" | "column",
            children: [],
          }));
          break;
        }
        case "add_child": {
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
        case "wrap_with_border": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, (d) => ({
            type: "Bordered",
            id: `${s_new.id_counter++}`,
            child: d,
          }));
          break;
        }
        case "wrap_in_container": {
          s_new.doc = modify_at_id(s_new.doc, t.args.id, (d) => ({
            type: "Container",
            id: `${s_new.id_counter++}`,
            style: "column",
            children: [d],
          }));
          break;
        }
      }
    }

    return s_new;
  },

  render_state_and_transitions: (ts, s) => {
    return (
      <>
        <pre>{JSON.stringify(s.doc, undefined, 4)}</pre>
        <pre>{JSON.stringify(ts, undefined, 4)}</pre>
        <DocComponent doc={s.doc} />
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
  | { type: "Placeholder"; id: string; hint: string };

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
          <div className={`Doc ${d.type}`}>
            {d.children.map((d, i) => render(d, `${i}`))}
          </div>
        );
      case "Bordered":
        return <div className={`Doc ${d.type}`}>{render(d.child)}</div>;
    }
  }

  return render(props.doc);
}

/** Constructs a string that is a structured description of the given Doc. */
function show_Doc(d: Doc, depth?: number): string {
  depth = depth ?? 0;
  const indent = "    ".repeat(depth);

  switch (d.type) {
    case "Placeholder":
      return `${indent}placeholder (id: ${d.id}): ${d.hint}`;
    case "Text":
      return `${indent}text (id: ${d.id}) ${d.content}`;
    case "Title":
      return `${indent}title (id: ${d.id}) ${d.content}`;
    case "Container":
      return `${indent}container (id: ${d.id}, style: ${d.style}):\n${d.children.map((d) => show_Doc(d, depth + 1)).join("\n")}`;
    case "Bordered":
      return `${indent}bordered (id: ${d.id}):\n${show_Doc(d.child, depth + 1)}`;
  }
}
