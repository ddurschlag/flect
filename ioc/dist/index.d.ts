import { Type } from "@flect/core";
type Injectable = Type;
type KeyType = symbol | null;
type Dependency<T> = {
    type: Type<T>;
    strict: boolean;
    key: KeyType;
};
type Dependencies<T extends readonly [...unknown[]]> = {
    [K in keyof T]: Dependency<T[K]>;
};
type RawDependency<T> = Dependency<T> | Type<T>;
type RawDependencies<T extends readonly [...unknown[]]> = {
    [K in keyof T]: RawDependency<T[K]>;
};
type Factory<TDeps extends readonly [...unknown[]], TInterface extends unknown> = (...args: TDeps) => TInterface;
type Provider = {
    dependencies: Dependencies<readonly [...unknown[]]>;
    impl: Factory<any, any>;
    key: symbol | null;
};
type Implementor<TInterface extends unknown, TDeps extends readonly [...unknown[]]> = {
    new (...args: TDeps): TInterface;
};
export declare class DependencyResolutionError extends Error {
    bound: Injectable;
    key: KeyType;
    constructor(bound: Injectable, key: KeyType);
}
declare class ProviderStorage {
    constructor();
    store(bound: Injectable, provider: Provider): void;
    retrieve(bound: Injectable, key: KeyType): Provider;
    private _map;
}
declare class Binder<TInterface extends unknown, TDepTypes extends readonly [...unknown[]]> {
    constructor(storage: ProviderStorage, bound: Type<TInterface>, dependencies: Dependencies<TDepTypes>, key: KeyType);
    with<TMoreDeps extends readonly [...unknown[]]>(...moreDeps: RawDependencies<TMoreDeps>): Binder<TInterface, readonly any[]>;
    toFactory(impl: Factory<TDepTypes, TInterface>): void;
    toType(implementor: Implementor<TInterface, TDepTypes>): void;
    toInstance(instance: TInterface): void;
    private _storage;
    private _bound;
    private _dependencies;
    private _key;
}
export declare class Container {
    constructor();
    bind<TInterface extends unknown>(bound: Type<TInterface>, key?: KeyType): Binder<TInterface, unknown[]>;
    resolve<TInterface extends unknown>(boundInterface: Type<TInterface>, key?: KeyType): TInterface;
    private resolveDependency;
    private _storage;
    private _instanceStorage;
}
export declare function dep<T>(type: Type<T>, key?: KeyType, strict?: boolean): Dependency<T>;
export {};
