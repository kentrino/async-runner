import { test } from "bun:test";
import { Processor } from "./Processor.ts"


test("Processor", async () => {
  const start = +new Date()
  const fns = {
    a: async (): Promise<"a"> => {
      console.log("a")
      await delay(1)
      return "a"
    },
    b: async (): Promise<"b"> => {
      console.log("b")
      await delay(2)
      return "b"
    },
    c: async (): Promise<"c"> => {
      console.log("c")
      await delay(4)
      return "c"
    },
    d: async ({ a, b }: { a: "a"; b: "b" }): Promise<"d"> => {
      console.log("d")
      await delay(8)
      return "d"
    },
    e: async ({ b, c }: { b: "b"; c: "c" }): Promise<"e"> => {
      console.log("e")
      await delay(16)
      return "e"
    },
    f: async ({ d, e }: { d: "d"; e: "e" }): Promise<"f"> => {
      console.log("f")
      await delay(32)
      return "f"
    },
  } as const

  const p = new Processor(fns, {
    a: [],
    b: [],
    c: [],
    d: ["b", "a"],
    e: ["b", "c"],
    f: ["d", "e"],
  })
  const res = await p.run()
  console.log(res)
  console.log(+new Date() - start, "ms")
})

function delay(s: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, s * 10))
}
