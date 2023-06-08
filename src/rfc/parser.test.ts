import assert from 'node:assert/strict';
import { describe, test, expect } from "vitest"
import { detectRFC, generateDot, parse, parseAll } from "./parser"
import { rfcIndex } from "./rfcIndex"

const sampleData1 = `9110 HTTP Semantics. R. Fielding, Ed., M. Nottingham, Ed., J. Reschke,
     Ed.. June 2022. (Format: HTML, TXT, PDF, XML) (Obsoletes RFC2818,
     RFC7230, RFC7231, RFC7232, RFC7233, RFC7235, RFC7538, RFC7615,
     RFC7694) (Updates RFC3864) (Also STD0097) (Status: INTERNET
     STANDARD) (DOI: 10.17487/RFC9110) `.split("\n")

test("parse(with updates, obsoletes)", () => {
    const result = parse(sampleData1)
    expect(result).not.toBe(null)
    assert(result)
    expect(result.number).toBe(9110)
    expect(result.title).toBe("HTTP Semantics")
    expect(result.published).toBe(202206)
    expect(result.obsoletes).toStrictEqual([2818, 7230, 7231, 7232, 7233, 7235, 7538, 7615, 7694])
    expect(result.updates).toStrictEqual([3864])
})

const sampleData2 = `7230 Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing.
     R. Fielding, Ed., J. Reschke, Ed.. June 2014. (Format: TXT, HTML)
     (Obsoletes RFC2145, RFC2616) (Obsoleted by RFC9110, RFC9112)
     (Updates RFC2817, RFC2818) (Updated by RFC8615) (Status: PROPOSED
     STANDARD) (DOI: 10.17487/RFC7230) `.split("\n")

test("parse(with updatedBy, obsoletedBy)", () => {
    const result = parse(sampleData2)
    expect(result).not.toBe(null)
    assert(result)
    expect(result.number).toBe(7230)
    expect(result.title).toBe("Hypertext Transfer Protocol (HTTP/1.1): Message Syntax and Routing")
    expect(result.published).toBe(201406)
    expect(result.obsoletes).toStrictEqual([2145, 2616])
    expect(result.obsoletedBy).toStrictEqual([9110, 9112])
    expect(result.updates).toStrictEqual([2817, 2818])
    expect(result.updatedBy).toStrictEqual([8615])
})

const sampleData3 = `4999 Not Issued. `.split("\n")

test("parse(not issued)", () => {
    const result = parse(sampleData3)
    expect(result).toBe(null)
})

test("parseAll", () => {
    const result = parseAll(rfcIndex)
    expect(result.size).toBeGreaterThan(9000)
})

describe("detectRFC", () => {
    const rfcs = parseAll(rfcIndex)

    test.each([
        {
            name: "empty option",
            opts: {
                includes: "",
                excludes: "",
                from: null,
                to: null,
                searchAncestors: false,
                searchDescendants: false,
            },
            expects: {
                rfcs: [],
                updates: [],
                obsoletes: [],
            }
        },
        {
            name: "search one (number)",
            opts: {
                includes: "9110, 9111, 9112",
                excludes: "9112",
                from: null,
                to: null,
                searchAncestors: false,
                searchDescendants: false,
            },
            expects: {
                rfcs: [9110, 9111],
                updates: [],
                obsoletes: [],
            }
        },
        {
            name: "search one (include/exclude)",
            opts: {
                includes: "HTTP/3",
                excludes: "WebSockets",
                from: null,
                to: null,
                searchAncestors: false,
                searchDescendants: false,
            },
            expects: {
                rfcs: [9114, 9204],
                updates: [],
                obsoletes: [],
            }
        },
        {
            name: "exclude during search ancestors/descendants",
            opts: {
                includes: "2616",
                excludes: "Hypertext",
                from: null,
                to: null,
                searchAncestors: false,
                searchDescendants: true,
            },
            expects: {
                rfcs: [2616, 2817, 5785, 6585, 8615],
                updates: [[2616, 2817], [2616, 5785], [2616, 6585]],
                obsoletes: [[5785, 8615]],
            }
        },
        {
            name: "search one (from/to)",
            opts: {
                includes: "HTTP",
                excludes: "",
                from: 1000,
                to: 2100,
                searchAncestors: false,
                searchDescendants: false,
            },
            expects: {
                rfcs: [1945, 2068, 2069],
                updates: [],
                obsoletes: [],
            }
        },
        {
            name: "search ancestors",
            opts: {
                includes: "7230",
                excludes: "",
                from: null,
                to: null,
                searchAncestors: true,
                searchDescendants: false,
            },
            expects: {
                rfcs: [2068, 2145, 2616, 2817, 2818, 7230],
                updates: [[ 2817, 7230 ], [ 2818, 7230 ], [ 2616, 2817 ]],
                obsoletes: [
                    [ 2145, 7230 ], [ 2616, 7230 ], [ 2068, 2616 ],
                ],
            }
        },
        {
            name: "search descendants",
            opts: {
                includes: "7230",
                excludes: "",
                from: null,
                to: null,
                searchAncestors: false,
                searchDescendants: true,
            },
            expects: {
                rfcs: [7230, 8615, 9110, 9112],
                updates: [[ 7230, 8615 ]],
                obsoletes: [
                    [ 7230, 9110 ], [ 7230, 9112 ]
                ],
            }
        },
    ])("name: $name", ({opts, expects}) => {
        const result = detectRFC(rfcs, opts)
        expect(result.rfcs).toStrictEqual(expects.rfcs)
        expect(result.updates).toStrictEqual(expects.updates)
        expect(result.obsoletes).toStrictEqual(expects.obsoletes)
    })
})

const expectedDot = `digraph G {
    rankdir="TB"
    node [shape=box];
    RFC1000 [label="RFC-1000(1980)\\ntitle1" URL="https://www.rfc-editor.org/rfc/rfc1000"];
    RFC1100 [label="RFC-1100(1990)\\ntitle2" URL="https://www.rfc-editor.org/rfc/rfc1100"];
    RFC1200 [label="RFC-1200(2000)\\ntitle3" URL="https://www.rfc-editor.org/rfc/rfc1200"];

    // Updates
    edge [style="dotted"];
    RFC1000 -> RFC1100 [label="update"];

    // Obsoletes
    edge [color=gray, style="solid"];
    RFC1100 -> RFC1200 [label="obsolete"];
}
`

test("generateDot", () => {
    const src = generateDot({
        rfcs: [1000, 1100, 1200],
        updates: [[1000, 1100]],
        obsoletes: [[1100, 1200]]
    }, new Map([
        [1000, {
            number: 1000,
            title: "title1",
            published: 198001,
            updates: [], updatedBy: [], obsoletes: [], obsoletedBy: [],
        }],
        [1100, {
            number: 1100,
            title: "title2",
            published: 199001,
            updates: [], updatedBy: [], obsoletes: [], obsoletedBy: [],
        }],
        [1200, {
            number: 1200,
            title: "title3",
            published: 200001,
            updates: [], updatedBy: [], obsoletes: [], obsoletedBy: [],
        }],
    ]), false)
    expect(src).toBe(expectedDot)
})