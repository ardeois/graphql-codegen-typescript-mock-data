// src/operationRuntime.ts
export const RUNTIME_HELPERS = `
type _BranchKeys<T> = T extends { __typename: infer K extends string } ? K : never;
// True when the union has two or more distinct __typename values. Distributive
// instead of recursive so it scales to large interface unions.
type _HasMultipleBranches<T, K = _BranchKeys<T>> =
    [K] extends [never] ? false :
    K extends K
        ? [Exclude<_BranchKeys<T>, K>] extends [never] ? false : true
        : false;
type Branches<T> = {
    [P in _BranchKeys<T>]: (o?: DeepPartial<Extract<T, { __typename: P }>>) => Extract<T, { __typename: P }>;
};

// Distribute over union members so each branch's keys are preserved. Taking keyof
// on the union directly would only yield the keys common to every branch.
type _PerBranchPartial<T> = T extends object ? { [K in keyof T]?: _Field<T[K]> } : T;

type _Field<T> = [T] extends [never]
    ? T
    : _HasMultipleBranches<NonNullable<T>> extends true
        ? _PerBranchPartial<NonNullable<T>> | ((b: Branches<NonNullable<T>>) => NonNullable<T>)
        : DeepPartial<T>;

type DeepPartial<T> = [T] extends [never]
    ? T
    : [T] extends [Array<infer U>]
        ? _HasMultipleBranches<NonNullable<U>> extends true
            ? T | ((b: Branches<NonNullable<U>>) => U[])
            : T | ((make: (o?: DeepPartial<U>) => U) => U[])
        : T extends object ? { [K in keyof T]?: _Field<T[K]> } : T;

// NoInfer-like helper for TS <5.4. Prevents the second parameter of mergeOverrides
// from being used to infer T, so T is anchored to the defaults parameter only.
type _NoInfer<T> = [T][T extends any ? 0 : never];

function mergeOverrides<T>(defaults: T, overrides: _NoInfer<DeepPartial<T>> | undefined): T {
    if (overrides === undefined) return defaults;
    if (overrides === null) return overrides as unknown as T;
    // Callback overrides are consumed at the callsite that knows how to dispatch them;
    // by the time we get here, the dispatched value is already in defaults. Skip.
    if (typeof overrides === 'function') return defaults;
    // Arrays were already constructed by applyArrayOverride, which consumes function-typed
    // and per-element overrides. The outer mergeOverrides shouldn't replace them.
    if (Array.isArray(defaults) && Array.isArray(overrides)) {
        return defaults;
    }
    if (Array.isArray(defaults) || Array.isArray(overrides)) {
        return overrides as unknown as T;
    }
    if (typeof defaults !== 'object' || defaults === null) {
        return overrides as unknown as T;
    }
    if (typeof overrides !== 'object') {
        return overrides as unknown as T;
    }
    const out: any = { ...defaults };
    for (const key of Object.keys(overrides)) {
        const ov = (overrides as any)[key];
        if (ov === undefined) continue;
        out[key] = mergeOverrides((defaults as any)[key], ov);
    }
    return out;
}

function applyArrayOverride<T>(
    makeDefault: (o?: DeepPartial<T>) => T,
    override: T[] | ((m: (o?: DeepPartial<T>) => T) => T[]) | null | undefined,
    count: number,
): T[] {
    if (override === null || override === undefined) {
        const arr: T[] = [];
        for (let i = 0; i < count; i++) arr.push(makeDefault());
        return arr;
    }
    if (typeof override === 'function') {
        return (override as (m: (o?: DeepPartial<T>) => T) => T[])(makeDefault);
    }
    return (override as any[]).map((el) => makeDefault(el));
}

function pickByCallback<T>(
    branches: Record<string, (o?: any) => T>,
    defaultBranch: string,
    override: T | ((b: Record<string, (o?: any) => T>) => T) | undefined | null,
): T {
    if (typeof override === 'function') {
        return (override as (b: Record<string, (o?: any) => T>) => T)(branches);
    }
    return branches[defaultBranch](override ?? undefined);
}

function applyBranchedArrayOverride<T>(
    branches: Record<string, (o?: any) => T>,
    defaultBranch: string,
    override: T[] | ((b: Record<string, (o?: any) => T>) => T[]) | null | undefined,
    count: number,
): T[] {
    if (override === null || override === undefined) {
        const arr: T[] = [];
        for (let i = 0; i < count; i++) arr.push(branches[defaultBranch]());
        return arr;
    }
    if (typeof override === 'function') {
        return (override as (b: Record<string, (o?: any) => T>) => T[])(branches);
    }
    return override;
}
`;
