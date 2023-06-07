import { useState, useCallback } from "react";
import { RecoilRoot } from "recoil"
import { SideBar } from "./components/SideBar"
import { GraphvizSource } from "./components/GraphvizSource";
import { Graphviz } from "./components/Graphviz";

function usePageSelector(): [boolean, (e: React.ChangeEvent<HTMLInputElement>) => void] {
  const [value, setter] = useState(true)
  const event = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    (setter as (v: boolean) => void)(e.target.checked)
  }, [setter])
  return [value, event] as [boolean, (e: React.ChangeEvent<HTMLInputElement>) => void]
}

function App() {
  const [isSource, onChange] = usePageSelector();

  return (
    <RecoilRoot>
      <SideBar />
      <main className="h-full flex-grow items-center bg-sky-200 flex flex-col">
        <div className="form-control">
          <label className="label cursor-pointer p-2">
            <input type="checkbox" className="toggle mx-2" checked={isSource} onChange={onChange} />
            <span className="label-text">{isSource ? "Source" : "Rendering"}</span>
          </label>
        </div>
        {isSource ? <GraphvizSource/> : <Graphviz options={{fit: true}}/>}
      </main>
    </RecoilRoot>
  )
}

export default App
