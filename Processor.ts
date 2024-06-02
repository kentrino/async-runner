import { isSubsetOf } from "./isSubsetOf";
import EventEmitter from "events"

type AnyAsyncFunction1 = (args: never) => Promise<unknown>
type Registry = Record<string, AnyAsyncFunction1>

type Dependency<T extends AnyAsyncFunction1> = keyof Parameters<T>[0]
type Dependencies<T extends Registry> = {
  [K in keyof T]: Dependency<T[K]>[]
}
type DependencySet<T extends Registry> = {
  [K in keyof T]: Set<Dependency<T[K]>>
}

type AsyncReturnType<T extends AnyAsyncFunction1> = ReturnType<T> extends Promise<infer U> ? U : never
type ProcessorResult<T extends Registry> =  {
  [K in keyof T]: AsyncReturnType<T[K]>
}

const PROCESS = "process"
const FINISH = "finish"

type EventMap<T extends Registry> = {
  [PROCESS]: never[]
  [FINISH]: ProcessorResult<T>[]
}

export class Processor<T extends Registry> {
  private result: Partial<ProcessorResult<T>> = {}
  private readonly deps: Readonly<DependencySet<T>>
  private readonly ev = new EventEmitter<EventMap<T>>()
  private readonly started: Set<keyof T> = new Set()

  constructor(
    private fns: T,
    deps: Dependencies<T>,
  ) {
    this.deps = Object.entries(deps).reduce((acc, [key, value]) => {
      return {
        [key]: new Set(value),
        ...acc
      }
    }, {} as DependencySet<T>)
  }

  async run(): Promise<ProcessorResult<T>> {
    const promise = new Promise<ProcessorResult<T>>((resolve) => {
      this.ev.on(PROCESS, () => {
        this.tick()
      })
      this.ev.on(FINISH, (result) => resolve(result))
    })
    this.ev.emit(PROCESS)
    return await promise
  }

  tick() {
    this.notStarted().map(async (k) => {
      await this.one(k)
      if (this.allProcessed()) {
        this.ev.emit(FINISH, this.result as never)
      }
    })
  }

  async one(key: keyof T): Promise<void> {
    if (this.started.has(key)) {
      return
    }
    const resolved = new Set(Object.keys(this.result))
    const deps = this.deps[key]
    if (isSubsetOf(deps, resolved)) {
      const fn = this.fns[key]
      this.started.add(key)
      // FIXME: pick
      this.result[key] = await fn(this.result as never) as never
      this.ev.emit(PROCESS)
    }
    return
  }

  private notStarted() {
    return Object.keys(this.fns).filter((k) => !this.started.has(k))
  }

  private allProcessed() {
    return Object.entries(this.result).length === Object.keys(this.fns).length
  }
}
