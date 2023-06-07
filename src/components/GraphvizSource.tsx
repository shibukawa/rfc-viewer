import { useRecoilValue } from "recoil"
import { graphvizSourceState } from "../rfc/state"

export function GraphvizSource() {
    const graphvizSource = useRecoilValue(graphvizSourceState)
    return (
        <div className="w-full h-full p-5">
            <textarea className="w-full h-full textarea textarea-bordered" value={graphvizSource}></textarea>
        </div>
    )
}