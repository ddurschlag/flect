import {MemoizationCache} from "@flect/core/MemoizationCache";
import {MakeType, ReifiableIdentified, Type, sortOrder} from "./type.js";

export {Type};

// Query: how much of Type can be replaced with Reifiable?
export type Reifiable = Type | ConditionalType;

export type Reify<T extends Reifiable> = T extends Type<infer Reflected>
	? Reflected
	: T extends ConditionalType<infer Extension, infer Base, infer Yes, infer No>
	? Extension extends Base
		? Yes
		: No
	: never;
type ReflectObject<Reflected extends Record<string | number, unknown>> = {
	[K in keyof Reflected]: Type<Reflected[K]>;
};
type ReflectTuple<Reflected extends readonly [...unknown[]]> = {
	[K in keyof Reflected]: Type<Reflected[K]>;
};
type Union<Reflected extends readonly [...unknown[]]> =
	Reflected extends readonly [infer Head, ...infer Tail]
		? Head | Union<Tail>
		: never;
type Intersection<Reflected extends readonly [...unknown[]]> =
	Reflected extends readonly []
		? unknown
		: Reflected extends readonly [infer Head, ...infer Tail]
		? Head & Intersection<Tail>
		: never;
type EnforceTupling<Tuple extends readonly [...unknown[]]> = readonly [
	...Tuple
];

const conditionalCache = new MemoizationCache<
	ConditionalType<any, any, any, any>
>();
const MakeConditional = Symbol("make-conditional");
export class ConditionalType<
	Extension = unknown,
	Base = unknown,
	Yes = unknown,
	No = unknown
> extends ReifiableIdentified {
	protected constructor(
		extension: Type<Extension>,
		base: Type<Base>,
		yes: Type<Yes>,
		no: Type<No>
	) {
		super();
		this._extension = extension;
		this._base = base;
		this._yes = yes;
		this._no = no;
	}

	public static [MakeConditional]<
		Extension = unknown,
		Base = unknown,
		Yes = unknown,
		No = unknown
	>(
		extension: Type<Extension>,
		base: Type<Base>,
		yes: Type<Yes>,
		no: Type<No>
	): ConditionalType<Extension, Base, Yes, No> {
		return conditionalCache.memoize(
			(e, b, y, n) => new ConditionalType(e, b, y, n),
			extension,
			base,
			yes,
			no
		);
	}

	public get extension() {
		return this._extension;
	}

	public get base() {
		return this._base;
	}

	public get yes() {
		return this._yes;
	}

	public get no() {
		return this._no;
	}

	private _extension: Type<Extension>;
	private _base: Type<Base>;
	private _yes: Type<Yes>;
	private _no: Type<No>;
}

function sortProps(
	[a]: readonly [string | Symbol, unknown],
	[b]: readonly [string | Symbol, unknown]
) {
	return a.toString() < b.toString() ? -1 : 1; // Properties can't be the same, so either less or greater
}

const metaCache = new MemoizationCache<MetaType<any>>();
const MakeMeta = Symbol("make-meta");
export class MetaType<Reflected> extends Type<Type<Reflected>> {
	protected constructor(type: Type<Reflected>) {
		super();
		this.type = type;
	}

	public static [MakeMeta]<Reflected>(
		type: Type<Reflected>
	): MetaType<Reflected> {
		return metaCache.memoize((t) => new MetaType(t), type);
	}

	public type: Type<Reflected>;
}

type MandatoryKeys<T> = {
	[P in keyof T]: T[P] extends Exclude<T[P], undefined> ? P : never;
}[keyof T];
type PartializeUndefineds<T> = Partial<T> & Pick<T, MandatoryKeys<T>>;
type MaybePartialize<T, Partialize> = Partialize extends true
	? PartializeUndefineds<T>
	: T;

const recordCache = new MemoizationCache<RecordType<any, boolean>>();
const MakeRecord = Symbol("make-record");
export class RecordType<
	Reflected extends Record<string | number, unknown>,
	OptionalUndefineds extends boolean = boolean
> extends Type<MaybePartialize<Reflected, OptionalUndefineds>> {
	protected constructor(
		type: ReflectObject<Reflected>,
		optionalUndefineds: OptionalUndefineds
	) {
		super();
		this.properties = Reflect.ownKeys(type).map((key) => [
			key,
			Reflect.get(type, key)
		]) as any;
		this.optionalUndefineds = optionalUndefineds;
	}

	public static [MakeRecord]<
		Reflected extends Record<string | number, unknown>,
		OptionalUndefineds extends boolean
	>(
		type: ReflectObject<Reflected>,
		optionalUndefineds: OptionalUndefineds
	): RecordType<Reflected, OptionalUndefineds> {
		const props = Reflect.ownKeys(type).map(
			(key) => [key, Reflect.get(type, key)] as const
		);
		props.sort(sortProps);
		const c = recordCache.getLayer(...props.flat(), optionalUndefineds);
		let result: RecordType<Reflected, OptionalUndefineds> | undefined =
			c.getValue();
		if (result === undefined) {
			result = new RecordType(type, optionalUndefineds);
			c.setValue(result);
		}
		return result;
	}

	public properties: {
		[K in keyof Reflected]: [
			K extends string | symbol ? K : string,
			Type<Reflected[K]>
		];
	}[keyof Reflected][]; // see https://github.com/microsoft/TypeScript/issues/13298 for why this type isn't tighter
	public optionalUndefineds: boolean;
}

const functionCache = new MemoizationCache<FunctionType<any, any>>();
const MakeFunction = Symbol("make-function");
export class FunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown
> extends Type<(...params: Params) => Returns> {
	protected constructor(params: ReflectTuple<Params>, returns: Type<Returns>) {
		super();
		this._params = params;
		this._returns = returns;
	}

	get params() {
		return this._params;
	}

	get returns() {
		return this._returns;
	}

	public static [MakeFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>
	): FunctionType<Params, Returns> {
		return functionCache.memoize(
			(ret, ...args) => new FunctionType(args, ret),
			returns,
			...params
		);
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
}

const guardCache = new MemoizationCache<GuardType<any, any>>();
const MakeGuard = Symbol("make-guard");
export class GuardType<From, To extends From> extends Type<
	(from: From) => from is To
> {
	protected constructor(from: Type<From>, to: Type<To>) {
		super();
		this._from = from;
		this._to = to;
	}

	get from() {
		return this._from;
	}

	get to() {
		return this._to;
	}

	public static [MakeGuard]<From, To extends From>(
		from: Type<From>,
		to: Type<To>
	): GuardType<From, To> {
		return guardCache.memoize((f, t) => new GuardType(f, t), from, to);
	}

	private _from: Type<From>;
	private _to: Type<To>;
}

/*
// Could be expanded to multi-argument perhaps
export function guard<To, From = unknown>(
	from: Type<From>,
	to: Type<To>
) {
	return GuardType[MakeGuard](from, to);
}
*/

const singleGenericfunctionCache = new MemoizationCache<
	SingleGenericFunctionType<any, any, any>
>();
const MakeSingleGenericFunction = Symbol("make-single-generic-function");
export class SingleGenericFunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown,
	FirstConstraint extends unknown
> extends Type<
	<GEN_TYPE_1 extends Swap<FirstConstraint, Generic_1, GEN_TYPE_1>>(
		...args: Swap<EnforceTupling<Params>, Generic_1, GEN_TYPE_1>
	) => Swap<Returns, Generic_1, GEN_TYPE_1>
> {
	protected constructor(
		params: ReflectTuple<Params>,
		returns: Type<Returns>,
		firstConstraint: Type<FirstConstraint>
	) {
		super();
		this._params = params;
		this._returns = returns;
		this._firstConstraint = firstConstraint;
	}

	get params() {
		return this._params;
	}

	get returns() {
		return this._returns;
	}

	get firstConstraint() {
		return this._firstConstraint;
	}

	public static [MakeSingleGenericFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown,
		FirstConstraint extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>,
		firstConstraint: Type<FirstConstraint>
	): SingleGenericFunctionType<Params, Returns, FirstConstraint> {
		return singleGenericfunctionCache.memoize(
			(constr1, ret, ...args) =>
				new SingleGenericFunctionType(args, ret, constr1),
			firstConstraint,
			returns,
			...params
		);
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
	private _firstConstraint: Type<FirstConstraint>;
}

const doubleGenericfunctionCache = new MemoizationCache<
	DoubleGenericFunctionType<any, any, any, any>
>();
const MakeDoubleGenericFunction = Symbol("make-double-generic-function");
export class DoubleGenericFunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown,
	FirstConstraint extends unknown,
	SecondConstraint extends unknown
> extends Type<
	<
		GEN_TYPE_1 extends Swap<
			FirstConstraint,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2
		>,
		GEN_TYPE_2 extends Swap<
			SecondConstraint,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2
		>
	>(
		...args: Swap<
			EnforceTupling<Params>,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2
		>
	) => Swap<Returns, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2>
> {
	protected constructor(
		params: ReflectTuple<Params>,
		returns: Type<Returns>,
		firstConstraint: Type<FirstConstraint>,
		secondConstraint: Type<SecondConstraint>
	) {
		super();
		this._params = params;
		this._returns = returns;
		this._firstConstraint = firstConstraint;
		this._secondConstraint = secondConstraint;
	}

	get params() {
		return this._params;
	}

	get returns() {
		return this._returns;
	}

	get firstConstraint() {
		return this._firstConstraint;
	}

	get secondConstraint() {
		return this._secondConstraint;
	}

	public static [MakeDoubleGenericFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown,
		FirstConstraint extends unknown,
		SecondConstraint extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>,
		firstConstraint: Type<FirstConstraint>,
		secondConstraint: Type<SecondConstraint>
	): DoubleGenericFunctionType<
		Params,
		Returns,
		FirstConstraint,
		SecondConstraint
	> {
		return doubleGenericfunctionCache.memoize(
			(constr1, constr2, ret, ...args) =>
				new DoubleGenericFunctionType(args, ret, constr1, constr2) as any,
			firstConstraint,
			secondConstraint,
			returns,
			...params
		);
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
	private _firstConstraint: Type<FirstConstraint>;
	private _secondConstraint: Type<SecondConstraint>;
}

const tripleGenericfunctionCache = new MemoizationCache<
	TripleGenericFunctionType<any, any, any, any, any>
>();
const MakeTripleGenericFunction = Symbol("make-triple-generic-function");
export class TripleGenericFunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown,
	FirstConstraint extends unknown,
	SecondConstraint extends unknown,
	ThirdConstraint extends unknown
> extends Type<
	<
		GEN_TYPE_1 extends Swap<
			FirstConstraint,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2,
			Generic_3,
			GEN_TYPE_3
		>,
		GEN_TYPE_2 extends Swap<
			SecondConstraint,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2,
			Generic_3,
			GEN_TYPE_3
		>,
		GEN_TYPE_3 extends Swap<
			ThirdConstraint,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2,
			Generic_3,
			GEN_TYPE_3
		>
	>(
		...args: Swap<
			EnforceTupling<Params>,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2,
			Generic_3,
			GEN_TYPE_3
		>
	) => Swap<
		Returns,
		Generic_1,
		GEN_TYPE_1,
		Generic_2,
		GEN_TYPE_2,
		Generic_3,
		GEN_TYPE_3
	>
> {
	protected constructor(
		params: ReflectTuple<Params>,
		returns: Type<Returns>,
		firstConstraint: Type<FirstConstraint>,
		secondConstraint: Type<SecondConstraint>,
		thirdConstraint: Type<ThirdConstraint>
	) {
		super();
		this._params = params;
		this._returns = returns;
		this._firstConstraint = firstConstraint;
		this._secondConstraint = secondConstraint;
		this._thirdConstraint = thirdConstraint;
	}

	get params() {
		return this._params;
	}

	get returns() {
		return this._returns;
	}

	get firstConstraint() {
		return this._firstConstraint;
	}

	get secondConstraint() {
		return this._secondConstraint;
	}

	get thirdConstraint() {
		return this._thirdConstraint;
	}

	public static [MakeTripleGenericFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown,
		FirstConstraint extends unknown,
		SecondConstraint extends unknown,
		ThirdConstraint extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>,
		firstConstraint: Type<FirstConstraint>,
		secondConstraint: Type<SecondConstraint>,
		thirdConstraint: Type<ThirdConstraint>
	): TripleGenericFunctionType<
		Params,
		Returns,
		FirstConstraint,
		SecondConstraint,
		ThirdConstraint
	> {
		return tripleGenericfunctionCache.memoize(
			(constr1, constr2, constr3, ret, ...args) =>
				new TripleGenericFunctionType(args, ret, constr1, constr2, constr3),
			firstConstraint,
			secondConstraint,
			thirdConstraint,
			returns,
			...params
		);
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
	private _firstConstraint: Type<FirstConstraint>;
	private _secondConstraint: Type<SecondConstraint>;
	private _thirdConstraint: Type<ThirdConstraint>;
}

const brandCache = new MemoizationCache<BrandType<any>>();
const brandProp = Symbol("brand-prop");
const MakeBrand = Symbol("make-brand");
export class BrandType<T extends symbol> extends Type<{
	readonly [brandProp]: T;
}> {
	protected constructor(symbol: T) {
		super();
		this._symbol = symbol;
	}

	public static [MakeBrand]<T extends symbol>(symbol: T): BrandType<T> {
		return brandCache.memoize((s) => new BrandType(s), symbol);
	}

	private _symbol: T;
}

const unionCache = new MemoizationCache<UnionType<any>>();
const MakeUnion = Symbol("make-union");
export class UnionType<Subsets extends readonly [...unknown[]]> extends Type<
	Union<Subsets>
> {
	protected constructor(subsets: ReflectTuple<Subsets>) {
		super();
		this._subsets = subsets;
	}

	public static [MakeUnion]<Subsets extends readonly [...unknown[]]>(
		subsets: ReflectTuple<Subsets>
	): UnionType<Subsets> {
		const c = unionCache.getLayer(
			...[...subsets].sort((a, b) => a[sortOrder](b))
		);
		let result: UnionType<Subsets> | undefined = c.getValue();
		if (result === undefined) {
			result = new UnionType(subsets);
			c.setValue(result);
		}
		return result;
	}

	get subsets() {
		return this._subsets;
	}

	private _subsets: ReflectTuple<Subsets>;
}

const intersectionCache = new MemoizationCache<IntersectionType<any>>();
const MakeIntersection = Symbol("make-intersection");
export class IntersectionType<
	Subsets extends readonly [...unknown[]]
> extends Type<Intersection<Subsets>> {
	protected constructor(subsets: ReflectTuple<Subsets>) {
		super();
		this._subsets = subsets;
	}

	public static [MakeIntersection]<Subsets extends readonly [...unknown[]]>(
		subsets: ReflectTuple<Subsets>
	): IntersectionType<Subsets> {
		const c = intersectionCache.getLayer(
			...[...subsets].sort((a, b) => a[sortOrder](b))
		);
		let result: IntersectionType<Subsets> | undefined = c.getValue();
		if (result === undefined) {
			result = new IntersectionType(subsets);
			c.setValue(result);
		}
		return result;
	}

	get subsets() {
		return this._subsets;
	}

	private _subsets: ReflectTuple<Subsets>;
}

// Generic types

const readonlyCache = new MemoizationCache<ReadonlyType<any>>();
const MakeReadonly = Symbol("make-readonly");
export class ReadonlyType<ReflectedType> extends Type<
	DeepReadonly<ReflectedType>
> {
	protected constructor(type: Type<ReflectedType>) {
		super();
		this._type = type;
	}

	public static [MakeReadonly]<ReflectedType>(
		type: Type<ReflectedType>
	): ReadonlyType<ReflectedType> {
		return readonlyCache.memoize(
			(t) => new ReadonlyType<ReflectedType>(t),
			type
		);
	}

	public get type() {
		return this._type;
	}

	private _type: Type<ReflectedType>;
}

const arrayCache = new MemoizationCache<ArrayType<any>>();
const MakeArray = Symbol("make-array");
export class ArrayType<ReflectedItem> extends Type<ReflectedItem[]> {
	protected constructor(type: Type<ReflectedItem>) {
		super();
		this.itemType = type;
	}

	public static [MakeArray]<ReflectedItem>(
		type: Type<ReflectedItem>
	): ArrayType<ReflectedItem> {
		return arrayCache.memoize((t) => new ArrayType(t), type);
	}

	public itemType: Type<ReflectedItem>;
}

const reifiedCache = new MemoizationCache<Reified<any>>();
const MakeReified = Symbol("make-reified");
// This conditional type extension requires a conditional factory...
class Reified<T> extends Type<T extends Type<infer U> ? U : never> {
	protected constructor(typeType: Type<T>) {
		super();
		this.typeType = typeType;
	}

	// ... so we need to branch here
	public static [MakeReified]<T>(
		typeType: Type<T>
	): Type<T extends Type<infer U> ? U : never> {
		if (typeType instanceof MetaType) {
			return typeType.type;
		}
		// We have to cast here because of how the cache works -- conditional any types return the union
		// of the output types (https://github.com/microsoft/TypeScript/issues/40049). This ends up
		// being unknown when inference is used, and Reified<unknown> is not implicitly Reified<T>.
		return reifiedCache.memoize((t) => new Reified(t), typeType) as Reified<T>;
	}

	public typeType: Type<T>;
}

const tupleCache = new MemoizationCache<TupleType<any>>();
const MakeTuple = Symbol("make-tuple");
export class TupleType<Reflected extends readonly [...unknown[]]> extends Type<
	EnforceTupling<Reflected>
> {
	protected constructor(type: ReflectTuple<Reflected>) {
		super();
		this._subsets = type;
	}

	public static [MakeTuple]<Reflected extends readonly [...unknown[]]>(
		type: ReflectTuple<Reflected>
	): TupleType<Reflected> {
		return tupleCache.memoize((...t) => new TupleType(t), ...type);
	}

	public get subsets() {
		return this._subsets;
	}

	private _subsets: ReflectTuple<Reflected>;
}

const mapCache = new MemoizationCache<MapType<any, any>>();
const MakeMap = Symbol("make-map");
export class MapType<ReflectedKey, ReflectedValue> extends Type<
	Map<ReflectedKey, ReflectedValue>
> {
	protected constructor(key: Type<ReflectedKey>, value: Type<ReflectedValue>) {
		super();
		this.keyType = key;
		this.valueType = value;
	}

	public static [MakeMap]<ReflectedKey, ReflectedValue>(
		key: Type<ReflectedKey>,
		value: Type<ReflectedValue>
	): MapType<ReflectedKey, ReflectedValue> {
		return mapCache.memoize((k, v) => new MapType(k, v), key, value);
	}

	public keyType: Type<ReflectedKey>;
	public valueType: Type<ReflectedValue>;
}

const setCache = new MemoizationCache<SetType<any>>();
const MakeSet = Symbol("make-set");
export class SetType<ReflectedItem> extends Type<Set<ReflectedItem>> {
	protected constructor(type: Type<ReflectedItem>) {
		super();
		this.itemType = type;
	}

	public static [MakeSet]<ReflectedItem>(
		type: Type<ReflectedItem>
	): SetType<ReflectedItem> {
		return setCache.memoize((t) => new SetType(t), type);
	}

	public itemType: Type<ReflectedItem>;
}

export type DeepReadonly<T> = T extends IsConjunctionMatcher<T, string>
	? DeepReadonlyPrimitiveConjunction<T, string>
	: T extends IsConjunctionMatcher<T, number>
	? DeepReadonlyPrimitiveConjunction<T, number>
	: T extends IsConjunctionMatcher<T, null>
	? DeepReadonlyPrimitiveConjunction<T, null>
	: T extends IsConjunctionMatcher<T, boolean>
	? DeepReadonlyPrimitiveConjunction<T, boolean>
	: T extends IsConjunctionMatcher<T, bigint>
	? DeepReadonlyPrimitiveConjunction<T, bigint>
	: T extends IsConjunctionMatcher<T, symbol>
	? DeepReadonlyPrimitiveConjunction<T, symbol>
	: T extends IsFunctionConjunctionMatcher<T>
	? DeepReadonlyFunctionConjunction<T>
	: T extends IsConjunctionMatcher<T, undefined>
	? DeepReadonlyPrimitiveConjunction<T, undefined>
	: T extends (infer R)[]
	? DeepReadonlyArray<R>
	: T extends readonly [...infer TUP]
	? DeepReadonlyTuple<TUP>
	: T extends (...args: readonly [...infer ARGS]) => infer RET
	? DeepReadonlyFunction<ARGS, RET>
	: T extends Map<infer K, infer V>
	? DeepReadonlyMap<K, V>
	: T extends Set<infer V>
	? DeepReadonlySet<V>
	: T extends object
	? DeepReadonlyObject<T>
	: T;
export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}
export type DeepReadonlyPrimitiveConjunction<T, Prim> = T extends Prim & infer U
	? Prim & DeepReadonly<U>
	: never;
export type DeepReadonlyFunctionConjunction<T> = T extends (
	...params: infer PARAMS
) => infer RET
	? T extends ((...params: PARAMS) => RET) & infer U
		? ((...params: PARAMS) => RET) & DeepReadonly<U>
		: never
	: never;
export type DeepReadonlyTuple<T extends readonly [...unknown[]]> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};
export type DeepReadonlyFunction<ARGS extends readonly [...unknown[]], RET> = (
	...args: {
		readonly [P in keyof ARGS]: DeepReadonly<ARGS[P]>;
	}
) => DeepReadonly<RET>;
export type DeepReadonlyObject<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};
export type DeepReadonlyMap<K, V> = ReadonlyMap<
	DeepReadonly<K>,
	DeepReadonly<V>
>;
export type DeepReadonlySet<V> = ReadonlySet<DeepReadonly<V>>;

export const stringType = Type[MakeType]<string>();
export const numberType = Type[MakeType]<number>();
export const bigintType = Type[MakeType]<bigint>();
export const boolType = Type[MakeType]<boolean>();
export const symbolType = Type[MakeType]<symbol>();
export const voidType = Type[MakeType]<void>();
export const nullType = Type[MakeType]<null>();
export const undefinedType = Type[MakeType]<undefined>();
export const neverType = Type[MakeType]<never>();
export const unknownType = Type[MakeType]<unknown>();
export const objectType = Type[MakeType]<object>();
export const anyType = Type[MakeType]<any>();

export function brand<T extends symbol>(t: T) {
	return BrandType[MakeBrand](t);
}

// TODO: LiteralType

export function literal<Reflected extends number | string | boolean>(
	type: Reflected
) {
	return Type[MakeType]<Reflected>();
}

export function record<Reflected extends Record<string | number, unknown>>(
	type: ReflectObject<Reflected>
) {
	return RecordType[MakeRecord]<Reflected, false>(type, false);
}

// Just like record, but anything that can be undefined is now optional
export function optionalRecord<
	Reflected extends Record<string | number, unknown>
>(type: ReflectObject<Reflected>) {
	return RecordType[MakeRecord]<Reflected, true>(type, true);
}

const sourceTypeSymbol = Symbol("source-type");
type SourceType = typeof sourceTypeSymbol;
export const SourceType = Type[MakeType]<SourceType>();

type MaybeCap<K extends string, Prefix extends string> = Prefix extends ""
	? K
	: `${Prefix}${Capitalize<K>}`;
type Surround<
	K,
	Prefix extends string,
	Suffix extends string
> = K extends symbol
	? never
	: K extends string
	? `${MaybeCap<K, Prefix>}${Suffix}`
	: K;

function surround<
	K extends string | symbol,
	Prefix extends string,
	Suffix extends string
>(key: K, prefix: Prefix, suffix: Suffix): Surround<K, Prefix, Suffix> {
	if (typeof key === "string") {
		return prefix !== ""
			? `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}${suffix}`
			: (`${key}${suffix}` as any);
	}
	// Numbers are stringified
	// if (typeof key === "number") {
	// 	return `${prefix}${key}${suffix}` as any;
	// }
	throw new Error("Cannot surround symbol with prefix/suffix");
}

// Type-level swap
// Seems to handle intersection types now, but definitely one of the most
// complex/fragile bits of the codebase
type Swap<
	T,
	From,
	To,
	From2 = never,
	To2 = never,
	From3 = never,
	To3 = never
> = T extends IsConjunctionMatcher<T, From>
	? SwapConjunction<T, From, To, From2, To2, From3, To3>
	: T extends IsConjunctionMatcher<T, From2>
	? SwapConjunction<T, From2, To2, From, To, From3, To3>
	: T extends IsConjunctionMatcher<T, From3>
	? SwapConjunction<T, From3, To3, From, To, From2, To2>
	: T extends From
	? To
	: T extends From2
	? To2
	: T extends From3
	? To3
	: T extends Type<infer InnerT>
	? Type<Swap<InnerT, From, To, From2, To2, From3, To3>>
	: T extends unknown[]
	? SwapArray<T, From, To, From2, To2, From3, To3>
	: T extends readonly [...unknown[]]
	? SwapTuple<T, From, To, From2, To2, From3, To3>
	: T extends (from: any) => from is any
	? SwapGuard<T, From, To, From2, To2, From3, To3>
	: T extends (...args: [...any[]]) => unknown
	? SwapFunction<T, From, To, From2, To2, From3, To3>
	: T extends Map<any, any>
	? SwapMap<T, From, To, From2, To2, From3, To3>
	: T extends Set<any>
	? SwapSet<T, From, To, From2, To2, From3, To3>
	: T extends {
			readonly [brandProp]: infer B;
	  }
	? T // Brand prop
	: T extends object
	? SwapObject<T, From, To, From2, To2, From3, To3>
	: T;
type SwapValue<Value, From, To> = Value extends From ? To : Value;
type SwapTuple<
	Tuple extends readonly [...unknown[]],
	From,
	To,
	From2 = never,
	To2 = unknown,
	From3 = never,
	To3 = unknown,
	Output extends readonly [...unknown[]] = readonly []
> = Tuple extends readonly []
	? Output
	: Tuple extends readonly [infer Head, ...infer Rest]
	? SwapTuple<
			Rest,
			From,
			To,
			From2,
			To2,
			From3,
			To3,
			readonly [...Output, Swap<Head, From, To, From2, To2, From3, To3>]
	  >
	: readonly [];
type SwapArray<
	ArrayType extends unknown[],
	From,
	To,
	From2 = never,
	To2 = unknown,
	From3 = never,
	To3 = unknown
> = ArrayType extends Array<infer T>
	? Array<Swap<T, From, To, From2, To2, From3, To3>>
	: never;
type SwapMap<
	T extends Map<any, any>,
	From,
	To,
	From2 = never,
	To2 = unknown,
	From3 = never,
	To3 = unknown
> = T extends Map<infer K, infer V>
	? Map<
			Swap<K, From, To, From2, To2, From3, To3>,
			Swap<V, From, To, From2, To2, From3, To3>
	  >
	: never;
type SwapSet<
	SetType extends Set<any>,
	From,
	To,
	From2 = never,
	To2 = unknown,
	From3 = never,
	To3 = unknown
> = SetType extends Set<infer T>
	? Set<Swap<T, From, To, From2, To2, From3, To3>>
	: never;
type SwapObject<
	ObjectType extends object,
	From,
	To,
	From2 = never,
	To2 = unknown,
	From3 = never,
	To3 = unknown
> = {
	[P in keyof ObjectType]: Swap<
		ObjectType[P],
		From,
		To,
		From2,
		To2,
		From3,
		To3
	>;
};
type SwapFunction<
	Func extends (...args: [...any[]]) => unknown,
	From,
	To,
	From2,
	To2,
	From3,
	To3
> = Func extends (...args: infer Params) => infer ReturnType
	? (
			...args: SwapTuple<Params, From, To, From2, To2, From3, To3>
	  ) => Swap<ReturnType, From, To, From2, To2, From3, To3>
	: never;
type SwapGuard<
	Func extends (from: any) => from is any,
	From,
	To,
	From2,
	To2,
	From3 = never,
	To3 = unknown
> = Func extends (from: any) => from is infer ToG
	? (
			from: Swap<Parameters<Func>[0], From, To, From2, To2, From3, To3>
	  ) => from is Swap<ToG, From, To, From2, To2, From3, To3>
	: never;

type IsFunctionConjunctionMatcher<Whole> = Whole extends (
	...params: infer PARAMS
) => infer RET
	? Whole extends ((...params: PARAMS) => RET) & infer T
		? T extends never
			? never
			: unknown extends T
			? never
			: Whole extends T
			? T extends Whole
				? never
				: Whole
			: Whole
		: never
	: never;

type IsConjunctionMatcher<Whole, Part> = Whole extends Part & infer T
	? T extends never
		? never
		: unknown extends T
		? never
		: Whole extends T
		? T extends Whole
			? never
			: Whole
		: Whole
	: never;
type SwapConjunction<Conj, From, To, From2, To2, From3, To3> =
	Conj extends From & infer T
		? To & Swap<T, From, To, From2, To2, From3, To3>
		: never;

// Instance-level swap
function swap<T, From, To>(
	type: ArrayType<T>,
	from: Type<From>,
	to: Type<To>
): ArrayType<SwapArray<T[], From, To>>;
function swap<T extends readonly [...unknown[]], From, To>(
	type: TupleType<T>,
	from: Type<From>,
	to: Type<To>
): TupleType<SwapTuple<T, From, To>>;
function swap<
	Params extends readonly [...unknown[]],
	Returns extends unknown,
	From,
	To
>(
	type: FunctionType<Params, Returns>,
	from: Type<From>,
	to: Type<To>
): FunctionType<SwapTuple<Params, From, To>, Swap<Returns, From, To>>;
function swap<T extends Record<string | number, unknown>, From, To>(
	type: RecordType<T, true>,
	from: Type<From>,
	to: Type<To>
): RecordType<SwapObject<T, From, To>, true>;
function swap<T extends Record<string | number, unknown>, From, To>(
	type: RecordType<T, false>,
	from: Type<From>,
	to: Type<To>
): RecordType<SwapObject<T, From, To>, false>;
function swap<T, From, To>(
	type: Type<T>,
	from: Type<From>,
	to: Type<To>
): Type<Swap<T, From, To>>;
function swap<T, From, To>(
	type: Type<T>,
	from: Type<From>,
	to: Type<To>
): Type<Swap<T, From, To>> {
	if (type instanceof ArrayType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapArray(type, from, to) as any; // TS just can't follow this :(
	}
	if (type instanceof TupleType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapTuple(type, from, to) as any; // TS just can't follow this :(
	}
	if (type instanceof FunctionType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapFunction(type, from, to) as any;
	}
	if (type instanceof RecordType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapRecord(type, from, to) as any; // TS just can't follow this :(
	}
	if (type instanceof UnionType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapUnion(type, from, to) as any; // TS just can't follow this :(
	}
	if (type instanceof IntersectionType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapIntersection(type, from, to) as any; // TS just can't follow this :(
	}
	if (type instanceof GuardType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapGuard(type, from, to) as any;
	}
	return ((type as any) === from ? to : type) as any; // TS just can't follow this :(
}

function swapSubsets<T extends readonly [...unknown[]], From, To>(
	subsets: ReflectTuple<T>,
	from: Type<From>,
	to: Type<To>
): ReflectTuple<SwapTuple<T, From, To>> | undefined {
	const subTypes = [] as ReflectTuple<SwapTuple<T, From, To>>;
	let different = false;
	for (let i = 0; i < subsets.length; i++) {
		let subType = subsets[i];
		const newSub = swap(subType, from, to);
		if (newSub !== subType) {
			subType = newSub as any;
			different = true;
		}
		subTypes[i] = subType as any;
	}
	if (different) {
		return subTypes;
	}
	return undefined; // Not different
}

function swapUnion<T extends readonly [...unknown[]], From, To>(
	type: UnionType<T>,
	from: Type<From>,
	to: Type<To>
): UnionType<SwapTuple<T, From, To>> {
	const subTypes = swapSubsets(type.subsets, from, to);
	if (subTypes === undefined) {
		return type as any;
	}
	return UnionType[MakeUnion](subTypes);
}

function swapIntersection<T extends readonly [...unknown[]], From, To>(
	type: IntersectionType<T>,
	from: Type<From>,
	to: Type<To>
): IntersectionType<SwapTuple<T, From, To>> {
	const subTypes = swapSubsets(type.subsets, from, to);
	if (subTypes === undefined) {
		return type as any;
	}
	return IntersectionType[MakeIntersection](subTypes);
}

function swapArray<T, From, To>(
	type: ArrayType<T>,
	from: Type<From>,
	to: Type<To>
): ArrayType<Swap<T, From, To>> {
	const itemType = swap(type.itemType, from, to);
	if (itemType === type.itemType) {
		return type as any; // TS just can't follow this :(
	}
	return ArrayType[MakeArray](itemType);
}

function swapTuple<T extends readonly [...unknown[]], From, To>(
	type: TupleType<T>,
	from: Type<From>,
	to: Type<To>
): TupleType<SwapTuple<T, From, To>> {
	const subTypes = swapSubsets(type.subsets, from, to);
	if (subTypes === undefined) {
		return type as any;
	}
	return TupleType[MakeTuple](subTypes);
}

function swapFunction<
	Params extends readonly [...unknown[]],
	Returns extends unknown,
	From,
	To
>(
	type: FunctionType<Params, Returns>,
	from: Type<From>,
	to: Type<To>
): FunctionType<SwapTuple<Params, From, To>, Swap<Returns, From, To>> {
	const paramTypes = swapSubsets(type.params, from, to);
	const newReturn = swap(type.returns, from, to);

	if (newReturn !== type.returns || paramTypes !== undefined) {
		return FunctionType[MakeFunction](
			(paramTypes ?? type.params) as any,
			newReturn
		);
	}
	return type as any;
}

function swapGuard<FromG, ToG extends FromG, From, To>(
	type: GuardType<FromG, ToG>,
	from: Type<From>,
	to: Type<To>
): any {
	const swappedFrom = swap(type.from, from, to);
	const swappedTo = swap(type.to, from, to);
	if (swappedFrom !== type.from || swappedTo !== type.to) {
		return GuardType[MakeGuard](swappedFrom, swappedTo as any) as any;
	}
	return type as any;
}

function swapRecord<T extends Record<string | number, unknown>, From, To>(
	type: RecordType<T, true>,
	from: Type<From>,
	to: Type<To>
): RecordType<SwapObject<T, From, To>, true>;
function swapRecord<T extends Record<string | number, unknown>, From, To>(
	type: RecordType<T, false>,
	from: Type<From>,
	to: Type<To>
): RecordType<SwapObject<T, From, To>, false>;
function swapRecord<T extends Record<string | number, unknown>, From, To>(
	type: RecordType<T>,
	from: Type<From>,
	to: Type<To>
): RecordType<SwapObject<T, From, To>> {
	const innerRecordType: {
		[K in keyof T]?: Type<Swap<T[K], From, To>>;
	} = {};
	let different = false;
	for (const [prop, propType] of type.properties) {
		const newSub = swap(propType, from, to);
		if (newSub === propType) {
			Reflect.set(innerRecordType, prop, propType);
		} else {
			Reflect.set(innerRecordType, prop, newSub);
			different = true;
		}
	}
	if (different) {
		return RecordType[MakeRecord](
			innerRecordType as any,
			type.optionalUndefineds
		); // TS just can't follow this :(
	}
	return type as any; // TS just can't follow this :(
}

export function mappedRecord<
	Reflected extends Record<string | number, unknown>,
	PropertyType,
	Prefix extends string,
	Suffix extends string
>(
	source: RecordType<Reflected, true>,
	propertyType: Type<PropertyType>,
	prefix: Prefix,
	suffix: Suffix
): RecordType<
	{
		[key in keyof Reflected as Surround<key, Prefix, Suffix>]: Swap<
			PropertyType,
			SourceType,
			Reflected[key]
		>;
	},
	true
>;
export function mappedRecord<
	Reflected extends Record<string | number, unknown>,
	PropertyType,
	Prefix extends string,
	Suffix extends string
>(
	source: RecordType<Reflected, false>,
	propertyType: Type<PropertyType>,
	prefix: Prefix,
	suffix: Suffix
): RecordType<
	{
		[key in keyof Reflected as Surround<key, Prefix, Suffix>]: Swap<
			PropertyType,
			SourceType,
			Reflected[key]
		>;
	},
	false
>;
export function mappedRecord<
	Reflected extends Record<string | number, unknown>,
	PropertyType,
	Prefix extends string,
	Suffix extends string
>(
	source: RecordType<Reflected, boolean>,
	propertyType: Type<PropertyType>,
	prefix: Prefix,
	suffix: Suffix
): RecordType<
	{
		[key in keyof Reflected as Surround<key, Prefix, Suffix>]: Swap<
			PropertyType,
			SourceType,
			Reflected[key]
		>;
	},
	boolean
> {
	const reflectedResult: {
		[key in keyof Reflected as Surround<key, Prefix, Suffix>]?: Type<
			Swap<PropertyType, SourceType, Reflected[key]>
		>;
	} = {};
	for (const [prop, type] of source.properties) {
		reflectedResult[surround(prop, prefix, suffix)] = swap(
			propertyType,
			SourceType,
			type
		) as any;
	}
	if (source.optionalUndefineds) {
		return optionalRecord(reflectedResult as any);
	}
	return record(reflectedResult as any); // There's no diff-checking here, we always return a new type
}

export function reify<T>(t: Type<T>) {
	return Reified[MakeReified](t);
}

// TODO: Needs class
export function keyof<Reflected>(type: Type<Reflected>) {
	return Type[MakeType]<keyof Reflected>();
}

// Pretty useless
// TODO: Needs class
export function index<Reflected, Key extends keyof Reflected>(
	type: Type<Reflected>,
	key: Key
) {
	return Type[MakeType]<Reflected[Key]>();
}

export function array<ReflectedItem>(type: Type<ReflectedItem>) {
	return ArrayType[MakeArray](type);
}

export function metaType<Reflected>(type: Type<Reflected>) {
	return MetaType[MakeMeta](type);
}

export function mapType<ReflectedKey, ReflectedValue>(
	keyType: Type<ReflectedKey>,
	valueType: Type<ReflectedValue>
) {
	return MapType[MakeMap](keyType, valueType);
}

export function setType<ReflectedItem>(type: Type<ReflectedItem>) {
	return SetType[MakeSet]<ReflectedItem>(type);
}

export function tuple<Reflected extends readonly [...unknown[]]>(
	...type: ReflectTuple<Reflected>
) {
	return TupleType[MakeTuple]<Reflected>(type);
}

// TODO needs class!
export function classType<
	Reflected extends Function & {new (...args: readonly any[]): unknown}
>(type: Reflected) {
	return Type[MakeType]<InstanceType<Reflected>>();
}

export function union<Subsets extends readonly [...unknown[]]>(
	...subsets: ReflectTuple<Subsets>
) {
	return UnionType[MakeUnion](subsets);
}

export function intersection<Subsets extends readonly [...unknown[]]>(
	...subsets: ReflectTuple<Subsets>
) {
	return IntersectionType[MakeIntersection](subsets);
}

export function functionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown
>(returnType: Type<Returns>, ...parameterTypes: ReflectTuple<Params>) {
	return FunctionType[MakeFunction](parameterTypes, returnType);
}

export function readonly<ReflectedType>(
	type: ReadonlyType<ReflectedType>
): ReadonlyType<ReflectedType>;
export function readonly<ReflectedType>(
	type: Type<ReflectedType>
): ReadonlyType<ReflectedType>;
export function readonly<ReflectedType>(
	type: Type<ReflectedType>
): ReadonlyType<ReflectedType> {
	if (type instanceof ReadonlyType) {
		return type;
	}
	return ReadonlyType[MakeReadonly](type);
}

const Generic_1 = Symbol("generic-1");
type Generic_1 = typeof Generic_1;
export const FIRST_GENERIC_TYPE = Type[MakeType]<Generic_1>();

const Generic_2 = Symbol("generic-2");
type Generic_2 = typeof Generic_2;
export const SECOND_GENERIC_TYPE = Type[MakeType]<Generic_2>();

const Generic_3 = Symbol("generic-3");
type Generic_3 = typeof Generic_3;
export const THIRD_GENERIC_TYPE = Type[MakeType]<Generic_3>();

type SingleGenericFunctionTypeSignature = (<
	FirstConstraint extends unknown = unknown
>(
	firstConstraint: Type<FirstConstraint>
) => <Returns extends unknown, Params extends readonly [...unknown[]]>(
	returnType: Type<Returns>,
	...paramTypes: ReflectTuple<Params>
) => SingleGenericFunctionType<Params, Returns, FirstConstraint>) &
	(() => <Returns extends unknown, Params extends readonly [...unknown[]]>(
		returnType: Type<Returns>,
		...paramTypes: ReflectTuple<Params>
	) => SingleGenericFunctionType<Params, Returns, unknown>);

export const constrainedSingleGenericFunctionType: SingleGenericFunctionTypeSignature =

		<FirstConstraint extends unknown = unknown>(
			firstConstraint?: Type<FirstConstraint>
		) =>
		<Returns extends unknown, Params extends readonly [...unknown[]]>(
			returnType: Type<Returns>,
			...paramTypes: ReflectTuple<Params>
		) =>
			// We use (unknownType as any) here. The idea is that
			// if you call overload #1 you must provide firstContraint and
			// it's irrelevant. If you call overload #2 there is no generic
			// type and we're returning an unknown constrained function
			// anyway. Therefore, this is safe, even if TS doesn't realize that.
			SingleGenericFunctionType[MakeSingleGenericFunction]<
				Params,
				Returns,
				FirstConstraint
			>(paramTypes, returnType, firstConstraint || (unknownType as any));
export const singleGenericFunctionType = constrainedSingleGenericFunctionType();

type DoubleGenericFunctionTypeSignature = (<
	FirstConstraint extends unknown = unknown,
	SecondConstraint extends unknown = unknown
>(
	firstConstraint: Type<FirstConstraint>,
	secondConstraint: Type<SecondConstraint>
) => <Returns extends unknown, Params extends readonly [...unknown[]]>(
	returnType: Type<Returns>,
	...paramTypes: ReflectTuple<Params>
) => DoubleGenericFunctionType<
	Params,
	Returns,
	FirstConstraint,
	SecondConstraint
>) &
	(<FirstConstraint extends unknown = unknown>(
		firstConstraint: Type<FirstConstraint>
	) => <Returns extends unknown, Params extends readonly [...unknown[]]>(
		returnType: Type<Returns>,
		...paramTypes: ReflectTuple<Params>
	) => DoubleGenericFunctionType<Params, Returns, FirstConstraint, unknown>) &
	(() => <Returns extends unknown, Params extends readonly [...unknown[]]>(
		returnType: Type<Returns>,
		...paramTypes: ReflectTuple<Params>
	) => DoubleGenericFunctionType<Params, Returns, unknown, unknown>);

export const constrainedDoubleGenericFunctionType: DoubleGenericFunctionTypeSignature =

		<
			FirstConstraint extends unknown = unknown,
			SecondConstraint extends unknown = unknown
		>(
			firstConstraint?: Type<FirstConstraint>,
			secondConstraint?: Type<SecondConstraint>
		) =>
		<Returns extends unknown, Params extends readonly [...unknown[]]>(
			returnType: Type<Returns>,
			...paramTypes: ReflectTuple<Params>
		) =>
			// We use (unknownType as any) here. The idea is that
			// if you call overload #1 you must provide firstContraint and
			// it's irrelevant. If you call overload #2 there is no generic
			// type and we're returning an unknown constrained function
			// anyway. Therefore, this is safe, even if TS doesn't realize that.
			DoubleGenericFunctionType[MakeDoubleGenericFunction]<
				Params,
				Returns,
				FirstConstraint,
				SecondConstraint
			>(
				paramTypes,
				returnType,
				firstConstraint || (unknownType as any),
				secondConstraint || (unknownType as any)
			);
export const doubleGenericFunctionType = constrainedDoubleGenericFunctionType();

type TripleGenericFunctionTypeSignature = (<
	FirstConstraint extends unknown = unknown,
	SecondConstraint extends unknown = unknown,
	ThirdConstraint extends unknown = unknown
>(
	firstConstraint: Type<FirstConstraint>,
	secondConstraint: Type<SecondConstraint>,
	ThirdConstraint: Type<ThirdConstraint>
) => <Returns extends unknown, Params extends readonly [...unknown[]]>(
	returnType: Type<Returns>,
	...paramTypes: ReflectTuple<Params>
) => TripleGenericFunctionType<
	Params,
	Returns,
	FirstConstraint,
	SecondConstraint,
	ThirdConstraint
>) &
	(<
		FirstConstraint extends unknown = unknown,
		SecondConstraint extends unknown = unknown
	>(
		firstConstraint: Type<FirstConstraint>,
		secondConstraint: Type<SecondConstraint>
	) => <Returns extends unknown, Params extends readonly [...unknown[]]>(
		returnType: Type<Returns>,
		...paramTypes: ReflectTuple<Params>
	) => TripleGenericFunctionType<
		Params,
		Returns,
		FirstConstraint,
		SecondConstraint,
		unknown
	>) &
	(<FirstConstraint extends unknown = unknown>(
		firstConstraint: Type<FirstConstraint>
	) => <Returns extends unknown, Params extends readonly [...unknown[]]>(
		returnType: Type<Returns>,
		...paramTypes: ReflectTuple<Params>
	) => TripleGenericFunctionType<
		Params,
		Returns,
		FirstConstraint,
		unknown,
		unknown
	>) &
	(() => <Returns extends unknown, Params extends readonly [...unknown[]]>(
		returnType: Type<Returns>,
		...paramTypes: ReflectTuple<Params>
	) => TripleGenericFunctionType<Params, Returns, unknown, unknown, unknown>);

export const constrainedTripleGenericFunctionType: TripleGenericFunctionTypeSignature =

		<
			FirstConstraint extends unknown = unknown,
			SecondConstraint extends unknown = unknown,
			ThirdConstraint extends unknown = unknown
		>(
			firstConstraint?: Type<FirstConstraint>,
			secondConstraint?: Type<SecondConstraint>,
			thirdConstraint?: Type<ThirdConstraint>
		) =>
		<Returns extends unknown, Params extends readonly [...unknown[]]>(
			returnType: Type<Returns>,
			...paramTypes: ReflectTuple<Params>
		) =>
			// We use (unknownType as any) here. The idea is that
			// if you call overload #1 you must provide firstContraint and
			// it's irrelevant. If you call overload #2 there is no generic
			// type and we're returning an unknown constrained function
			// anyway. Therefore, this is safe, even if TS doesn't realize that.
			TripleGenericFunctionType[MakeTripleGenericFunction]<
				Params,
				Returns,
				FirstConstraint,
				SecondConstraint,
				ThirdConstraint
			>(
				paramTypes,
				returnType,
				firstConstraint || (unknownType as any),
				secondConstraint || (unknownType as any),
				thirdConstraint || (unknownType as any)
			);
export const tripleGenericFunctionType = constrainedTripleGenericFunctionType();

export function conditional<Extension, Base, Yes, No>(
	extension: Type<Extension>,
	base: Type<Base>,
	yes: Type<Yes>,
	no: Type<No>
) {
	return ConditionalType[MakeConditional](extension, base, yes, no);
}

// Could be expanded to multi-argument perhaps
export function guard<To extends From, From = unknown>(
	from: Type<From>,
	to: Type<To>
) {
	return GuardType[MakeGuard](from, to);
}
