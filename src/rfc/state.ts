import { atom, selector, useRecoilCallback } from 'recoil';
import { rfcIndex } from './rfcIndex';
import { detectRFC, generateDot, parseAll } from './parser';
import { searchOption } from '../components/SideBar';

const rfcListState = selector({
    key: "rfcList",
    get: async () => {
        // todo: network access
        return parseAll(rfcIndex)
    }
})

export const searchResultState = selector({
    key: "searchResult",
    get: ({get}) => {
        const sources = get(rfcListState)
        const options = get(searchOption)
        console.log({options})
        return detectRFC(sources, options)
    }
})

export const graphvizSourceState = atom({
    key: "graphvizSource",
    default: ""
})

const lastUpdate = atom({
    key: "lastUpdate",
    default: JSON.stringify({rfcs: [], obsoletes: [], updates: []}),
})

export const canGenerate = selector({
    key: "canGenerate",
    get: (({get}) => {
        const currentSearchResult = get(searchResultState)
        return get(lastUpdate) !== JSON.stringify(currentSearchResult)
    })
})

export function useUpdateGraphvizSource() {
    return useRecoilCallback(({snapshot, set}) => async () => {
        const rfcSrc = await snapshot.getPromise(rfcListState)
        const searchResult = await snapshot.getPromise(searchResultState)
        set(graphvizSourceState, generateDot(searchResult, rfcSrc))
        set(lastUpdate, JSON.stringify(searchResult))
    }, []);
}
