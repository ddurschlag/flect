import {
	ArrayType,
	BrandType,
	IntersectionType,
	RecordType,
	Type,
	UnionType,
	bigintType,
	boolType,
	neverType,
	nullType,
	numberType,
	stringType,
	symbolType,
	voidType
} from "@flect/core";

// Guards
export type Guard<T = unknown> = (u: unknown) => u is T;
export interface GuardRepository {
	get<T>(t: Type<T>): Guard<T> | undefined;
}
export class GuardMap implements GuardRepository {
	constructor() {
		this._map = new Map();
	}

	public add<T>(t: Type<T>, guard: Guard<T>) {
		this._map.set(t, guard);
	}

	public get<T>(t: Type<T>) {
		const result = this._map.get(t);
		return result === undefined ? undefined : (result as Guard<T>);
	}

	private _map: Map<Type, Guard>;
}

export class GuardChain implements GuardRepository {
	constructor() {
		this._chain = [];
	}

	public add(r: GuardRepository) {
		this._chain.push(r);
	}

	public get<T>(t: Type<T>) {
		for (const rep of this._chain) {
			const result = rep.get(t);
			if (result !== undefined) {
				return result;
			}
		}
	}

	private _chain: GuardRepository[];
}

export class GuardCache implements GuardRepository {
	constructor(inner: GuardRepository) {
		this._inner = inner;
		this._cache = new Map();
	}

	get<T>(t: Type<T>) {
		let result = this._cache.get(t);
		if (result !== undefined) {
			return result as Guard<T>;
		}
		result = this._inner.get(t);
		if (result !== undefined) {
			this._cache.set(t, result);
		}
		return result as Guard<T>;
	}

	private _inner: GuardRepository;

	private _cache: Map<Type, Guard>;
}

export const defaultGuards = new GuardMap();
defaultGuards.add(stringType, (u): u is string => typeof u === "string");
defaultGuards.add(numberType, (u): u is number => typeof u === "number");
defaultGuards.add(bigintType, (u): u is bigint => typeof u === "bigint");
defaultGuards.add(boolType, (u): u is boolean => typeof u === "boolean");
defaultGuards.add(symbolType, (u): u is symbol => typeof u === "symbol");
defaultGuards.add(voidType, (u): u is void => typeof u === "undefined");
defaultGuards.add(nullType, (u): u is null => u === null);
defaultGuards.add(neverType, (u): u is never => false);

// Guards for brands are always false -- there's no way to inspect data
// and see that it's the branded version. That's the point.
// Use a custom repository for when this should return true
export const brandRepository: GuardRepository = {
	get: <T>(t: Type<T>) => {
		if (t instanceof BrandType) {
			return (u: unknown): u is T => false;
		}
	}
};

export class AlgebraRepository implements GuardRepository {
	constructor(subRepo: GuardRepository) {
		this._subRepo = subRepo;
	}

	public get<T>(t: Type<T>) {
		if (t instanceof UnionType) {
			const subGuards: Guard<unknown>[] = [];
			for (let i = 0; i < t.subsets.length; i++) {
				const g = this._subRepo.get(t.subsets[i]);
				if (g === undefined) {
					return; // Can't validate if we can't find sub-validators
				}
				subGuards.push(g);
			}
			return (u: unknown): u is T => {
				for (const g of subGuards) {
					if (g(u)) {
						return true;
					}
				}
				return false;
			};
		}
		if (t instanceof IntersectionType) {
			const subGuards: Guard<unknown>[] = [];
			for (let i = 0; i < t.subsets.length; i++) {
				const g = this._subRepo.get(t.subsets[i]);
				if (g === undefined) {
					return; // Can't validate if we can't find sub-validators
				}
				subGuards.push(g);
			}
			return (u: unknown): u is T => {
				for (const g of subGuards) {
					if (!g(u)) {
						return false;
					}
				}
				return true;
			};
		}
	}

	private _subRepo: GuardRepository;
}

function objectHas(
	o: object,
	k: string | number
): o is {[key in typeof k]: unknown} {
	return Object.hasOwn(o, k);
}

export class GenericRecordValidator implements GuardRepository {
	constructor(subRepo: GuardRepository) {
		this._subRepo = subRepo;
	}

	get<T>(t: Type<T>) {
		if (t instanceof RecordType) {
			const subGuards: {key: string; val: Guard<unknown>}[] = [];
			for (const p of t.properties) {
				const val = this._subRepo.get(p[1]);
				if (val === undefined) {
					return; // Can't validate if we can't find sub-validators
				}
				subGuards.push({key: p[0], val});
			}
			return (u: unknown): u is T => {
				if (typeof u !== "object" || u === null) {
					return false;
				}
				for (const prop of subGuards) {
					if (!objectHas(u, prop.key) || !prop.val(u[prop.key])) {
						return false;
					}
				}
				return true;
			};
		}
	}

	private _subRepo: GuardRepository;
}

export class GenericArrayValidator implements GuardRepository {
	constructor(subRepo: GuardRepository) {
		this._subRepo = subRepo;
	}

	get<T>(t: Type<T>) {
		if (t instanceof ArrayType) {
			const subVal = this._subRepo.get(t.itemType);
			if (subVal === undefined) {
				return; // Can't validate if we can't find sub-validators
			}
			return (u: unknown): u is T => {
				if (!Array.isArray(u)) {
					return false;
				}
				for (let i = 0; i < u.length; i++) {
					if (!subVal(u[i])) {
						return false;
					}
				}
				return true;
			};
		}
	}

	private _subRepo: GuardRepository;
}
