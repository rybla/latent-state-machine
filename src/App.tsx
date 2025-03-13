import "@/index.css";
import { useState } from "react";
import * as machine from "./frontend/machine";
import { machine as example1 } from "./frontend/machine/example1";

const machines = { example1 } as const;

export function App() {
  const [selected_machine_key, set_selected_machine_key] = useState<
    keyof typeof machines | undefined
  >(undefined);

  return (
    <div className="App">
      <div>
        Machine:{" "}
        <select
          onChange={(e) =>
            set_selected_machine_key(e.target.value as keyof typeof machines)
          }
        >
          {Object.keys(machines).map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
      </div>
      {selected_machine_key && (
        <machine.Component machine={machines[selected_machine_key]} />
      )}
    </div>
  );
}

export default App;
