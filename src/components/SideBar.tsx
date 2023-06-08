import { useCallback } from 'react';
import { atom, selector, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import type { AtomEffect, RecoilState } from 'recoil';

import { canGenerate, searchResultState, useUpdateGraphvizSource } from "../rfc/state";
import { Opts } from '../rfc/parser';

const keepNumberEffect: AtomEffect<string> = ({setSelf, onSet}) => {
  onSet((newValue, oldValue) => {
    if (isNaN(Number(newValue))) {
      setSelf(oldValue)
    }
  })
}

function convertNum(value: string): number|null {
  if (value === '') {
    return null
  }
  const num = Number(value)
  if (isNaN(num)) {
    return null
  }
  return num
}

const rfcNumberFromRaw = atom({
  key: "rfcNumberFromRaw",
  default: "",
  effects: [keepNumberEffect]
})

const rfcNumberFromState = selector<null|number>({
  key: "rfcNumberFrom",
  get: ({get}) => {
    return convertNum(get(rfcNumberFromRaw))
  }
})

const rfcNumberToRaw = atom({
  key: "rfcNumberToRaw",
  default: "",
  effects: [keepNumberEffect]
})

const rfcNumberToState = selector<null|number>({
  key: "rfcNumberTo",
  get: ({get}) => {
    return convertNum(get(rfcNumberToRaw))
  }
})

const includesState = atom({
  key: "includes",
  default: "",
})

const excludesState = atom({
  key: "excludes",
  default: "",
})

const searchAncestorsState = atom({
  key: "searchAncestor",
  default: false,
})

const searchDescendantsState = atom({
  key: "searchDescendant",
  default: false,
})

export const directionState = atom({
  key: "direction",
  default: false,
})

export const searchOption = selector({
  key: "searchOption",
  get: ({get}) => {
    return {
      from: get(rfcNumberFromState),
      to: get(rfcNumberToState),
      includes: get(includesState),
      excludes: get(excludesState),
      searchAncestors: get(searchAncestorsState),
      searchDescendants: get(searchDescendantsState),
    }
  }
})

function useSampleCallback(opts: Partial<Opts>) {
  const setFrom = useSetRecoilState(rfcNumberFromRaw)
  const setTo = useSetRecoilState(rfcNumberToRaw)
  const setIncludes = useSetRecoilState(includesState)
  const setExcludes = useSetRecoilState(excludesState)
  const setSearchAncestors = useSetRecoilState(searchAncestorsState)
  const setSearchDescendants = useSetRecoilState(searchDescendantsState)

  return useCallback(() => {
    setFrom(opts.from ? String(opts.from) : "")
    setTo(opts.to ? String(opts.to) : "")
    setIncludes(opts.includes ?? '')
    setExcludes(opts.excludes ?? '')
    setSearchAncestors(opts.searchAncestors ?? false)
    setSearchDescendants(opts.searchDescendants ?? false)
  }, [opts])
}

function useRecoilWithReact<T extends string|boolean>(state: RecoilState<T>): [T, (e: React.ChangeEvent<HTMLInputElement>) => void] {
  const [value, setter] = useRecoilState(state)
  const event = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof value === 'string') {
      (setter as (v: string) => void)(e.target.value)
    } else {
      (setter as (v: boolean) => void)(e.target.checked)
    }
  }, [setter])
  return [value, event] as [T, (e: React.ChangeEvent<HTMLInputElement>) => void]
}

export function SideBar() {
  const [rfcNumberFrom, onChangeFrom] = useRecoilWithReact(rfcNumberFromRaw)
  const [rfcNumberTo, onChangeTo] = useRecoilWithReact(rfcNumberToRaw)
  const [includes, onChangeIncludes] = useRecoilWithReact(includesState)
  const [excludes, onChangeExcludes] = useRecoilWithReact(excludesState)
  const [searchAncestors, onChangeSearchAncestors] = useRecoilWithReact(searchAncestorsState)
  const [searchDescendants, onChangeSearchDescendants] = useRecoilWithReact(searchDescendantsState)
  const [direction, onChangeDirection] = useRecoilWithReact(directionState)

  const searchResult = useRecoilValue(searchResultState)
  const disabled = !useRecoilValue(canGenerate)
  const updateGraphvizSource = useUpdateGraphvizSource()

  const onHttpPreset = useSampleCallback({
    includes: "Hypertext Transfer Protocol",
    searchAncestors: true,
    searchDescendants: true,
  })

  const onWebSocketPreset = useSampleCallback({
    from: 5000,
    includes: "WebSocket",
    searchDescendants: true,
  })

  return (
    <aside className="h-full basis-1/4 bg-amber-200 p-4 flex flex-col prose">
      <h1>RFC Viewer</h1>
      <h2>Source Options</h2>
      <div className="flex items-center">
        <span className="form-control grow max-w-xs">
          <label className="label">
            <span className="label-text">RFC number: from</span>
          </label>
          <input type="text" className="input input-bordered w-full max-w-xs" value={rfcNumberFrom} onChange={onChangeFrom}/>
        </span>
        <span className="mx-2">~</span>
        <span className="form-control grow max-w-xs">
          <label className="label">
            <span className="label-text">to</span>
          </label>
          <input type="text" className="input input-bordered w-full max-w-xs" value={rfcNumberTo} onChange={onChangeTo}/>
        </span>
      </div>
      <span className="form-control max-w-xs">
        <label className="label">
          <span className="label-text">Include Words (Comma Separated)</span>
        </label>
        <input type="text" className="input input-bordered w-full max-w-xs" value={includes} onChange={onChangeIncludes}/>
      </span>
      <span className="form-control max-w-xs">
        <label className="label">
          <span className="label-text">Exclude Words (Comma Separated)</span>
        </label>
        <input type="text" className="input input-bordered w-full max-w-xs" value={excludes} onChange={onChangeExcludes}/>
      </span>
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Detect ancestors: {searchAncestors ? "ON" : "OFF"}</span> 
          <input type="checkbox" className="toggle" checked={searchAncestors} onChange={onChangeSearchAncestors} />
        </label>
      </div>
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Detect descendants: {searchDescendants ? "ON" : "OFF"}</span> 
          <input type="checkbox" className="toggle" checked={searchDescendants} onChange={onChangeSearchDescendants} />
        </label>
      </div>
      <h2>Rendering Option</h2>
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Direction: {direction ? "Horizontal" : "Vertical"}</span>
          <input type="checkbox" className="toggle" checked={direction} onChange={onChangeDirection} />
        </label>
      </div>
      <h2>Samples</h2>
      <button className="btn btn-sm m-2" onClick={onHttpPreset}>HTTP</button>
      <button className="btn btn-sm m-2" onClick={onWebSocketPreset}>WebSocket</button>
      <span className="grow"></span>
      <button disabled={disabled} className="btn btn-primary" onClick={updateGraphvizSource}>Generate{ searchResult.rfcs.length > 0 ? `(${searchResult.rfcs.length})` : ""}</button>
    </aside>
  )
}