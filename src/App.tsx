import "@/index.css";
import { useState } from "react";
import * as machine from "./frontend/machine";
import { machine as example1 } from "./frontend/machine/example1";

const machines = { example1 } as const;

export default function App(props: {}) {
  const [selected_machine_key, set_selected_machine_key] = useState<
    keyof typeof machines | undefined
  >(undefined);

  return (
    <div className="App">
      {/* <div>
        Machine:{" "}
        <select
          onChange={(e) => {
            set_selected_machine_key(
              e.target.value === "select a machine"
                ? undefined
                : (e.target.value as keyof typeof machines),
            );
          }}
        >
          {["select a machine", ...Object.keys(machines)].map((key) => {
            return <option key={key}>{key}</option>;
          })}
        </select>
      </div>
      {selected_machine_key && (
        <machine.Component machine={machines[selected_machine_key]} />
      )} */}
      <machine.Component machine={example1} />
    </div>
  );
}
