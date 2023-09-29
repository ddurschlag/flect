import {Type} from "@flect/core";

// What can be injected/resoslved
type Injectable = Type;

// Possible keys for differentiating between multiple implementations
// Default is null
type KeyType = symbol | null;

// Full dependencies, including keys and strictness
type Dependency<T> = {type: Type<T>; strict: boolean; key: KeyType};
type Dependencies<T extends readonly [...unknown[]]> = {
	[K in keyof T]: Dependency<T[K]>;
};
type RawDependency<T> = Dependency<T> | Type<T>;
type RawDependencies<T extends readonly [...unknown[]]> = {
	[K in keyof T]: RawDependency<T[K]>;
};

// Functions for ensuring raw dependencies become full dependencies
function buildDependency<T extends unknown>(
	maybeDep: RawDependency<T>
): Dependency<T> {
	if (maybeDep instanceof Type) {
		const type = maybeDep;
		const strict = false;
		const key = null;
		return {type, strict, key};
	}
	return maybeDep;
}
function buildDependencies<T extends readonly [...unknown[]]>(
	deps: RawDependencies<T>
): Dependencies<T> {
	return deps.map(buildDependency) as any; // todo: wish this could be a less aggresssive cast, or none at all somehow
}

// The type of the factory function needed to register a provider
type Factory<
	TDeps extends readonly [...unknown[]],
	TInterface extends unknown
> = (...args: TDeps) => TInterface;

// How an injectable is resolved
type Provider = {
	// Dependencies needed to resolve this injectable
	dependencies: Dependencies<readonly [...unknown[]]>;
	// Implementation to call to get injectable.
	// Dependencies are provided as parameters
	// Note that types are wrapped in a function which calls their constructor
	// It would be very nice if this could be Factory<Dependencies, Injectable> instead
	impl: Factory<any, any>;
	// Optional key if multiple implementations are desired
	key: symbol | null;
};

// A type that implements an interface. Once bound will be wrapped in an appropriate factory
type Implementor<
	TInterface extends unknown,
	TDeps extends readonly [...unknown[]]
> = {new (...args: TDeps): TInterface};

export class DependencyResolutionError extends Error {
	constructor(
		public bound: Injectable,
		public key: KeyType
	) {
		super(`Could not resolve dependency: ${JSON.stringify({bound, key})}`);
		Object.setPrototypeOf(this, DependencyResolutionError.prototype);
	}
}

// Storage for providers
class ProviderStorage {
	constructor() {
		this._map = new Map();
	}

	public store(bound: Injectable, provider: Provider) {
		let keyMap = this._map.get(bound);
		if (keyMap === undefined) {
			keyMap = new Map();
			this._map.set(bound, keyMap);
		}
		keyMap.set(provider.key, provider);
	}

	public retrieve(bound: Injectable, key: KeyType) {
		const keyMap = this._map.get(bound);
		if (keyMap === undefined) {
			throw new DependencyResolutionError(bound, key);
		}
		const result = keyMap.get(key);
		if (result === undefined) {
			throw new DependencyResolutionError(bound, key);
		}
		return result;
	}

	private _map: Map<
		Injectable, // What we're going to get
		Map<KeyType, Provider>
	>;
}

// Fluent builder for implementation provision
// Should these be reduced to underlying types, with wrapping done in params?
class Binder<
	TInterface extends unknown,
	TDepTypes extends readonly [...unknown[]]
> {
	constructor(
		storage: ProviderStorage,
		bound: Type<TInterface>,
		dependencies: Dependencies<TDepTypes>,
		key: KeyType
	) {
		this._storage = storage;
		this._bound = bound;
		this._dependencies = dependencies;
		this._key = key;
	}

	public with<TMoreDeps extends readonly [...unknown[]]>(
		...moreDeps: RawDependencies<TMoreDeps>
	) {
		// Would be nice to infer this :(
		return new Binder<TInterface, readonly [...TDepTypes, ...TMoreDeps]>(
			this._storage,
			this._bound,
			[...this._dependencies, ...buildDependencies(moreDeps)] as const,
			this._key
		);
	}

	public toFactory(impl: Factory<TDepTypes, TInterface>) {
		this._storage.store(this._bound, {
			dependencies: this._dependencies,
			impl,
			key: this._key
		});
	}

	public toType(Implementor: Implementor<TInterface, TDepTypes>) {
		const impl: (...args: TDepTypes) => TInterface = (...args) =>
			new Implementor(...args);
		this._storage.store(this._bound, {
			dependencies: this._dependencies,
			impl,
			key: this._key
		});
	}

	// TODO FIX: Make instance use parameters!

	public toInstance(instance: TInterface) {
		return this.toFactory(() => instance);
	}

	private _storage: ProviderStorage;
	private _bound: Type<TInterface>;
	private _dependencies: Dependencies<TDepTypes>;
	private _key: KeyType;
}

// IoC container. Bind stuff in, resolve stuff out.
export class Container {
	constructor() {
		this._storage = new ProviderStorage();
	}

	// Bind to a type, with optional key. Use keys
	// if you have multiple implementations of a type
	public bind<TInterface extends unknown>(
		bound: Type<TInterface>,
		key: KeyType = null
	) {
		return new Binder(this._storage, bound, [] as const, key);
	}

	// Resolve a type with optional key. Will resolve
	// any dependencies of the implementation as well.
	// Use keys if you have multiple implementations of a type
	public resolve<TInterface extends unknown>(
		boundInterface: Type<TInterface>,
		key: KeyType = null
	): TInterface {
		const {dependencies, impl} = this._storage.retrieve(boundInterface, key);
		return Reflect.apply<null, Injectable[], TInterface>(
			impl,
			null,
			dependencies.map((d) => this.resolveDependency(d)) as any
		); // TODO -- tuple map
	}

	private resolveDependency<TInterface extends unknown>(
		toResolve: Dependency<TInterface>
	) {
		if (toResolve.key !== null) {
			try {
				return this.resolve(toResolve.type, toResolve.key);
			} catch (ex) {
				if (!toResolve.strict) {
					return this.resolve(toResolve.type);
				}
				throw ex;
			}
		}
		return this.resolve(toResolve.type);
	}

	private _storage: ProviderStorage;
}

// Function to get a full dependency instead
// of just a type.
export function dep<T>(
	type: Type<T>,
	key: KeyType = null,
	strict: boolean = true
): Dependency<T> {
	return {type, key, strict};
}
