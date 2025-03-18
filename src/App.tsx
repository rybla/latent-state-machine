import "@/App.css";
import { useState } from "react";
import * as machine from "./frontend/machine";
import { machine as tokens } from "./frontend/machine/tokens";

const machines = { tokens } as const;

export default function App(props: {}) {
  const [selected_machine_key, set_selected_machine_key] = useState<
    keyof typeof machines | ""
  >("");

  return (
    <div className="App">
      <div className="AppControls">
        <div>
          Machine:{" "}
          <select
            value={selected_machine_key}
            onChange={(e) => {
              set_selected_machine_key(
                e.target.value as keyof typeof machines | "",
              );
            }}
          >
            {["", ...Object.keys(machines)].map((key) => {
              return (
                <option key={key}>
                  {key === "" ? "select a machine" : key}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <div className="AppMachine">
        {selected_machine_key && (
          <machine.Component machine={machines[selected_machine_key]} />
        )}
      </div>
    </div>
  );
}
