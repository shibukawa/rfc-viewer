export type RFC = {
    number: number
    title: string
    published: number
    updates: number[]
    updatedBy: number[]
    obsoletes: number[]
    obsoletedBy: number[]
}

const dateMap: Record<string, number> = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

export function parse(src: string[]): RFC | null {
    const joinedSrc = src.join(" ").replace(/\s+/g, " ")
    const fragments = joinedSrc.split(". ")
    const match = /(?<num>\d+) (?<title>.*)/.exec(fragments[0])
    if (!match) {
        throw new Error(`invalid: ${src.join("")}`)
    }
    if (match.groups?.title === "Not Issued") {
        return null
    }
    const date = fragments[fragments.length-2]
    const [ month, year ] = date.split(" ")
    const published = Number(year) * 100 + dateMap[month] as number

    let updates: number[] = []
    let updatedBy: number[] = []
    let obsoletes: number[] = []
    let obsoletedBy: number[] = []

    const items = fragments[fragments.length-1].matchAll(/\((.*?)\)/g)
    for (const item of items) {
        if (item[1].startsWith("Obsoletes ")) {
            obsoletes = item[1].slice("Obsoletes ".length).split(", ").map(rfc => Number(rfc.slice(3)))
        } else if (item[1].startsWith("Obsoleted by ")) {
            obsoletedBy = item[1].slice("Obsoleted by ".length).split(", ").map(rfc => Number(rfc.slice(3)))
        } else if (item[1].startsWith("Updates ")) {
            updates = item[1].slice("Updates ".length).split(", ").map(rfc => Number(rfc.slice(3)))
        } else if (item[1].startsWith("Updated by ")) {
            updatedBy = item[1].slice("Updated by ".length).split(", ").map(rfc => Number(rfc.slice(3)))
        }
    }

    return {
        number: Number(match.groups?.num),
        title: match.groups?.title || "",
        published,
        updates,
        updatedBy,
        obsoletes,
        obsoletedBy,
    }
}

export function parseAll(src: string): Map<number, RFC> {
    const result = new Map<number, RFC>()

    const lines = src.split("\n")

    let block: string[] = []
    let skip = 2
    for (let i = 0; i < lines.length; i++) {
        if (skip) {
            if (lines[i].includes("RFC INDEX")) {
                skip--
                i++ // skip underline
            }
        } else {
            const line = lines[i]
            if (line === "") {
                if (block.length > 0) {
                    const rfc = parse(block)
                    if (rfc) {
                        result.set(rfc.number, rfc)
                    }
                    block = []
                }
            } else {
                block.push(line)
            }
        }
    }
    if (block.length > 0) {
        const rfc = parse(block)
        if (rfc) {
            result.set(rfc.number, rfc)
        }
    }
    return result
}

type Opts = {
    from: number | null
    to: number | null
    includes: string
    excludes: string
    searchAncestors: boolean
    searchDescendants: boolean
}

type Result = {
    rfcs: number[]
    obsoletes: [number, number][]
    updates: [number, number][]
}

export function detectRFC(src: Map<number, RFC>, opts: Opts): Result {
    const rfcs: number[] = []
    const obsoletes: [number, number][] = []
    const updates: [number, number][] = []

    const checked = new Set<number>()

    const checkNext: number[] = []

    const includes = opts.includes !== "" ? opts.includes.split(/,\s*/).map(s => s.toLocaleLowerCase()) : []
    const excludes = opts.excludes !== "" ? opts.excludes.split(/,\s*/).map(s => s.toLocaleLowerCase()) : []

    for (const [num, value] of src.entries()) {
        if (opts.from !== null && num < opts.from) {
            continue
        }
        if (opts.to !== null && num > opts.to) {
            continue
        }
        const numStr = String(num)
        const title = value.title.toLocaleLowerCase()
        if (includes.includes(numStr) && !excludes.includes(numStr) || includes.some(i => title.includes(i)) && !excludes.some(e => title.includes(e))) {
            checkNext.push(num)
            rfcs.push(num)
            checked.add(num)
        }
    }

    const pushIfNotExists = (list: [number, number][], value: [number, number]) => {
        for (const e of list) {
            if (e[0] === value[0] && e[1] === value[1]) {
                return
            }
        }
        list.push(value)
    }

    while (checkNext.length > 0) {
        const checks = [...checkNext]
        checkNext.splice(0, checkNext.length)
        if (opts.searchAncestors) {
            for (const num of checks) {
                for (const parentNum of src.get(num)?.updates || []) {
                    pushIfNotExists(updates, [parentNum, num])
                    if (!checked.has(parentNum)) {
                        checkNext.push(parentNum)
                        checked.add(parentNum)
                        rfcs.push(parentNum)
                    }
                }
                for (const parentNum of src.get(num)?.obsoletes || []) {
                    pushIfNotExists(obsoletes, [parentNum, num])
                    if (!checked.has(parentNum)) {
                        checkNext.push(parentNum)
                        checked.add(parentNum)
                        rfcs.push(parentNum)
                    }
                }
            }
        }
        if (opts.searchDescendants) {
            for (const num of checks) {
                for (const childNum of src.get(num)?.updatedBy || []) {
                    pushIfNotExists(updates,[num, childNum])
                    if (!checked.has(childNum)) {
                        checkNext.push(childNum)
                        checked.add(childNum)
                        rfcs.push(childNum)
                    }
                }
                for (const childNum of src.get(num)?.obsoletedBy || []) {
                    pushIfNotExists(obsoletes,[num, childNum])
                    if (!checked.has(childNum)) {
                        checkNext.push(childNum)
                        checked.add(childNum)
                        rfcs.push(childNum)
                    }
                }
            }
        }
    }
    rfcs.sort((a, b) => a - b)
    return {
        rfcs,
        obsoletes,
        updates
    }
}

export function generateDot(searchResult: Result, rfcs: Map<number, RFC>): string {
    const nodes = searchResult.rfcs.map(num => {
        const rfc = rfcs.get(num)
        return `    RFC${num} [label="RFC-${num}\\n${rfc?.title}\\n(${String(rfc?.published).slice(0, 4)})"];`
    })
    const updates = searchResult.updates.map(([from, to]) => {
        return `    RFC${from} -> RFC${to} [label="update"];`
    })
    const obsoletes = searchResult.obsoletes.map(([from, to]) => {
        return `    RFC${from} -> RFC${to} [label="obsolete"];`
    })

    return `digraph G {
    node [shape=box];
${nodes.join("\n")}

    // Updates
    edge [style="dotted"];
${updates.join("\n")}

    // Obsoletes
    edge [color=gray, style="solid"];
${obsoletes.join("\n")}
}
`
}