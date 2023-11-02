import {
	ArrayType,
	FIRST_GENERIC_TYPE,
	IntersectionType,
	MapType,
	RecordType,
	SECOND_GENERIC_TYPE,
	SetType,
	TupleType,
	Type,
	UnionType,
	doubleGenericFunctionType,
	functionType,
	metaType,
	record,
	Reify,
	tuple,
	undefinedType,
	union,
	voidType
} from "@flect/core";

export type Transformer<T = never, U = unknown> = (t: T) => U;
export const TransformerRepository = record({
	get: doubleGenericFunctionType(
		union(functionType(SECOND_GENERIC_TYPE, FIRST_GENERIC_TYPE), undefinedType),
		metaType(FIRST_GENERIC_TYPE),
		metaType(SECOND_GENERIC_TYPE)
	)
});
export type TransformerRepository = Reify<typeof TransformerRepository>;

export class ChainTransformer implements TransformerRepository {
	constructor(...repos: TransformerRepository[]) {
		this._chain = [];
		for (const r of repos) {
			this.add(r);
		}
	}

	public add(r: TransformerRepository) {
		this._chain.push(r);
	}

	public addLoopRepo(T: {
		new (subRepo: TransformerRepository): TransformerRepository;
	}) {
		this.add(new T(this));
	}

	public get<T, U>(t: Type<T>, u: Type<U>) {
		for (const rep of this._chain) {
			const result = rep.get(t, u);
			if (result !== undefined) {
				return result;
			}
		}
	}

	private _chain: TransformerRepository[];
}

export class CachedTransformer implements TransformerRepository {
	constructor(inner: TransformerRepository) {
		this._inner = inner;
		this._cache = new Map();
	}

	get<T, U>(t: Type<T>, u: Type<U>) {
		let innerSet = this._cache.get(t);
		if (innerSet === undefined) {
			innerSet = new Map();
			this._cache.set(t, innerSet);
		}
		let result = innerSet.get(u);
		if (result !== undefined) {
			return result as Transformer<T, U>;
		}
		result = this._inner.get(t, u);
		if (result !== undefined) {
			innerSet.set(u, result);
		}
		return result as Transformer<T, U>;
	}

	private _inner: TransformerRepository;
	private _cache: Map<Type, Map<Type, Transformer>>;
}

export class IdentityTransformer implements TransformerRepository {
	get<T, U>(t: Type<T>, u: Type<U>): Transformer<T, U> | undefined {
		if ((t as unknown) === u) {
			return (input) => input as unknown as U;
		}
		if (u instanceof UnionType && u.subsets.includes(t)) {
			return (input) => input as unknown as U;
		}
		if (t instanceof IntersectionType && t.subsets.includes(u)) {
			return (input) => input as unknown as U;
		}
		// Can't do polymorphism because we don't know about parent types :(
	}
}

function isIterable(u: unknown) {
	if (u instanceof ArrayType) {
		return {type: u.itemType};
	}
	if (u instanceof MapType) {
		return {type: tuple(u.keyType, u.valueType)};
	}
	if (u instanceof SetType) {
		return {type: u.itemType};
	}
	if (u instanceof TupleType) {
		return {type: union(...u.subsets)};
	}
	return null;
}

function* map<T, U>(input: Iterable<T>, f: (t: T) => U): Iterable<U> {
	for (const t of input) {
		yield f(t);
	}
}

export class IterableTransformer implements TransformerRepository {
	constructor(private subRepo: TransformerRepository) {}
	get<T, U>(fromType: Type<T>, toType: Type<U>): Transformer<T, U> | undefined {
		const iterT = isIterable(fromType);
		const iterU = isIterable(toType);
		if (iterT === null || iterU === null) {
			return undefined;
		}
		// TS pretty much stops being able to follow here. Any remaining types
		// are basically for humans reading the code.
		type InnerT = T extends Iterable<infer I> ? I : never;
		type InnerU = U extends Iterable<infer I> ? I : never;
		const subTransformer = this.subRepo.get<InnerT, InnerU>(
			iterT.type,
			iterU.type
		);
		if (subTransformer === undefined) {
			return undefined; // can't transform if we can't find sub-transformer
		}
		if (toType instanceof ArrayType || toType instanceof TupleType) {
			return ((input: Iterable<InnerT>) => [
				...map(input, subTransformer)
			]) as unknown as Transformer<T, U>;
		}
		if (toType instanceof SetType) {
			return ((input: Iterable<InnerT>) =>
				new Set(map(input, subTransformer))) as unknown as Transformer<T, U>;
		}
		if (toType instanceof MapType) {
			return ((input: Iterable<InnerT>) =>
				new Map(
					map(input, subTransformer) as Iterable<[unknown, unknown]>
				)) as unknown as Transformer<T, U>;
		}
	}
}

export class RecordTransformer implements TransformerRepository {
	constructor(private subRepo: TransformerRepository) {}
	get<T, U>(fromType: Type<T>, toType: Type<U>): Transformer<T, U> | undefined {
		if (fromType instanceof RecordType && toType instanceof RecordType) {
			const subTransforms: {key: string; trans: Transformer<T, any>}[] = [];
			for (const p of toType.properties) {
				// We'll try a couple ways to produce these:
				// - First, map from the original property (if available).
				// - Second, map from the original *record* (if available). This is good for
				// aggregates
				// - Third, map from nothingness. This allows whole cloth creation
				// of data, such as when adding a new property to an object

				const fromProp = fromType.properties.find(
					([pName, pType]) => pName === p[0]
				);
				const trans =
					(fromProp && this.getPropTransformer<T, U>(fromProp, p)) ||
					this.subRepo.get(fromType, p[1]) ||
					(this.subRepo.get(voidType, p[1]) as Transformer<T, any>);
				if (trans === undefined) {
					return; // Can't transform if we can't produce all properties
				}
				subTransforms.push({key: p[0], trans});
			}
			return (input) => {
				const result: any = {};
				for (const {key, trans} of subTransforms) {
					result[key] = trans(input);
				}
				return result;
			};
		}
	}

	private getPropTransformer<T, U>(
		fromProp: [string, Type<any>],
		p: [string, Type<any>]
	) {
		const fromPropT = this.subRepo.get(fromProp[1], p[1]);
		if (fromPropT) {
			return (input: T) => fromPropT((input as any)[fromProp[0]]);
		}
		return undefined;
	}
}

export function getDefaultTransformerRepository<DefaultType>(
	type: Type<DefaultType>,
	defaultValue: DefaultType
): TransformerRepository {
	return {
		get: (t, u) => {
			if (t === voidType && (u as unknown) === type) {
				return () => defaultValue as any;
			}
			return undefined;
		}
	};
}

export function getSingletonTransformerRepository<T, U>(
	input: Type<T>,
	output: Type<U>,
	f: (i: T) => U
): TransformerRepository {
	return {
		get: (t, u) => {
			if ((t as unknown) === input && (u as unknown) === output) {
				return f as any;
			}
			return undefined;
		}
	};
}
