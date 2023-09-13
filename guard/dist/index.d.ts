import { Type } from '@flect/core';
export type Guard<T = unknown> = (u: unknown) => u is T;
export interface GuardRepository {
    get<T>(t: Type<T>): Guard<T> | undefined;
}
export declare class GuardMap implements GuardRepository {
    constructor();
    add<T>(t: Type<T>, guard: Guard<T>): void;
    get<T>(t: Type<T>): Guard<T> | undefined;
    private _map;
}
export declare class GuardChain implements GuardRepository {
    constructor();
    add(r: GuardRepository): void;
    get<T>(t: Type<T>): Guard<T> | undefined;
    private _chain;
}
export declare const defaultGuards: GuardMap;
export declare class GenericRecordValidator implements GuardRepository {
    constructor(subRepo: GuardRepository);
    get<T>(t: Type<T>): ((u: unknown) => u is T) | undefined;
    private _subRepo;
}
export declare class GenericArrayValidator implements GuardRepository {
    constructor(subRepo: GuardRepository);
    get<T>(t: Type<T>): ((u: unknown) => u is T) | undefined;
    private _subRepo;
}
