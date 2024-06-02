import { isSubsetOf } from "./isSubsetOf";

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

export class Processor<T extends Registry> {
  unprocessed: Partial<T>
  result: Partial<ProcessorResult<T>> = {}
  deps: DependencySet<T>

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
    this.unprocessed = fns
  }

  async run(): Promise<ProcessorResult<T>> {
    while (!this.allProcessed()) {
      const canProcess = this.listCanProcess()
      await mapValuesAsync(canProcess, async (_, key: keyof T) => {
        const fn = this.fns[key]
        this.result[key] = await fn(this.result as never) as never
        delete this.unprocessed[key]
      })
    }
    return this.result as never
  }

  private listCanProcess(): Partial<T> {
    const resolved = new Set(Object.keys(this.result))
    return filterValue(this.unprocessed, (_, key) => {
      const deps = this.deps[key]
      return isSubsetOf(deps, resolved)
    })
  }

  private allProcessed() {
    return Object.keys(this.unprocessed).length === 0
  }
}

async function mapAsync<T, U>(array: T[], fn: (item: T) => Promise<U>): Promise<U[]> {
  return Promise.all(array.map(fn))
}

async function mapValuesAsync<T extends Record<keyof any, any>, R>(
  obj: T,
  fn: (item: T[keyof T], key: string) => Promise<R>,
): Promise<{ [K in keyof T]: R }> {
  return Object.fromEntries(await mapAsync(Object.entries(obj), async ([k, v]) => {
    return [k, await fn(v, k)]
  })) as never
}

function filterValue<T extends Record<keyof any, any>>(obj: T, fn: (item: T[keyof T], key: keyof T) => boolean): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(v, k))) as never
}
