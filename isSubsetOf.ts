/**
 * if a < b
 * @param a 
 * @param b 
 * @returns boolean
 */
export function isSubsetOf<T>(a: Set<T>, b: Set<T>): boolean {
    return [...a].every((v) => b.has(v));
}
