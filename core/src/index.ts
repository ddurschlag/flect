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

const recordCache = new MemoizationCache<RecordType<any>>();
const MakeRecord = Symbol("make-record");
export class RecordType<
	Reflected extends Record<string | number, unknown>
> extends Type<Reflected> {
	protected constructor(type: ReflectObject<Reflected>) {
		super();
		this.properties = Reflect.ownKeys(type).map((key) => [
			key,
			Reflect.get(type, key)
		]) as any;
		const x = this.properties[0];
	}

	public static [MakeRecord]<
		Reflected extends Record<string | number, unknown>
	>(type: ReflectObject<Reflected>): RecordType<Reflected> {
		const props = Reflect.ownKeys(type).map(
			(key) => [key, Reflect.get(type, key)] as const
		);
		props.sort(sortProps);
		const c = recordCache.getLayer(...props.flat());
		let result: RecordType<Reflected> | undefined = c.getValue();
		if (result === undefined) {
			result = new RecordType(type);
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

const singleGenericfunctionCache = new MemoizationCache<
	SingleGenericFunctionType<any, any>
>();
const MakeSingleGenericFunction = Symbol("make-single-generic-function");
export class SingleGenericFunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown
> extends Type<
	<GEN_TYPE_1>(
		...args: Swap<EnforceTupling<Params>, Generic_1, GEN_TYPE_1>
	) => Swap<Returns, Generic_1, GEN_TYPE_1>
> {
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

	public static [MakeSingleGenericFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>
	): SingleGenericFunctionType<Params, Returns> {
		return singleGenericfunctionCache.memoize(
			(ret, ...args) => new SingleGenericFunctionType(args, ret),
			returns,
			...params
		);
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
}

const doubleGenericfunctionCache = new MemoizationCache<
	DoubleGenericFunctionType<any, any>
>();
const MakeDoubleGenericFunction = Symbol("make-double-generic-function");
export class DoubleGenericFunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown
> extends Type<
	<GEN_TYPE_1, GEN_TYPE_2>(
		...args: DoubleSwap<
			EnforceTupling<Params>,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2
		>
	) => DoubleSwap<Returns, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2>
> {
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

	public static [MakeDoubleGenericFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>
	): DoubleGenericFunctionType<Params, Returns> {
		return doubleGenericfunctionCache.memoize(
			(ret, ...args) => new DoubleGenericFunctionType(args, ret) as any,
			returns,
			...params
		) as any; // Excessive stack depth comparing types 'DoubleGenericFunctionType<?, Returns>' and 'DoubleGenericFunctionType<?, Returns>'.ts(2321)
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
}

const tripleGenericfunctionCache = new MemoizationCache<
	TripleGenericFunctionType<any, any>
>();
const MakeTripleGenericFunction = Symbol("make-triple-generic-function");
export class TripleGenericFunctionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown
> extends Type<
	<GEN_TYPE_1, GEN_TYPE_2, GEN_TYPE_3>(
		...args: TripleSwap<
			EnforceTupling<Params>,
			Generic_1,
			GEN_TYPE_1,
			Generic_2,
			GEN_TYPE_2,
			Generic_3,
			GEN_TYPE_3
		>
	) => TripleSwap<
		Returns,
		Generic_1,
		GEN_TYPE_1,
		Generic_2,
		GEN_TYPE_2,
		Generic_3,
		GEN_TYPE_3
	>
> {
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

	public static [MakeTripleGenericFunction]<
		Params extends readonly [...unknown[]],
		Returns extends unknown
	>(
		params: ReflectTuple<Params>,
		returns: Type<Returns>
	): TripleGenericFunctionType<Params, Returns> {
		return tripleGenericfunctionCache.memoize(
			(ret, ...args) => new TripleGenericFunctionType(args, ret) as any,
			returns,
			...params
		) as any; // Excessive stack depth comparing types 'TripleGenericFunctionType<?, Returns>' and 'TripleGenericFunctionType<?, Returns>'.ts(2321)
	}

	private _params: ReflectTuple<Params>;
	private _returns: Type<Returns>;
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
		return readonlyCache.memoize((t) => new ReadonlyType(t), type);
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

export type DeepReadonly<T> = T extends (infer R)[]
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
export const neverType = Type[MakeType]<never>();
export const unknownType = Type[MakeType]<unknown>();
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
	return RecordType[MakeRecord]<Reflected>(type);
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

type Swap<T, From, To> = T extends unknown[]
	? SwapArray<T, From, To>
	: T extends readonly [...unknown[]]
	? SwapTuple<T, From, To>
	: T extends (...args: [...any[]]) => unknown
	? SwapFunction<T, From, To>
	: T extends Map<any, any>
	? SwapMap<T, From, To>
	: T extends Set<any>
	? SwapSet<T, From, To>
	: T extends {
			readonly [brandProp]: T;
	  }
	? T // Brand prop
	: T extends object
	? SwapObject<T, From, To>
	: SwapValue<T, From, To>;
type SwapValue<Value, From, To> = Value extends From ? To : Value;
type SwapTuple<
	Tuple extends readonly [...unknown[]],
	From,
	To,
	Output extends readonly [...unknown[]] = readonly []
> = Tuple extends readonly []
	? Output
	: Tuple extends readonly [infer Head, ...infer Rest]
	? SwapTuple<Rest, From, To, readonly [...Output, Swap<Head, From, To>]>
	: readonly [];
type SwapArray<ArrayType extends unknown[], From, To> = ArrayType extends Array<
	infer T
>
	? Array<Swap<T, From, To>>
	: never;
type SwapMap<T extends Map<any, any>, From, To> = T extends Map<
	infer K,
	infer V
>
	? Map<Swap<K, From, To>, Swap<V, From, To>>
	: never;
type SwapSet<SetType extends Set<any>, From, To> = SetType extends Set<infer T>
	? Set<Swap<T, From, To>>
	: never;
type SwapObject<ObjectType extends object, From, To> = {
	[P in keyof ObjectType]: Swap<ObjectType[P], From, To>;
};
type SwapFunction<
	Func extends (...args: [...any[]]) => unknown,
	From,
	To
> = Func extends (...args: infer Params) => infer ReturnType
	? (...args: SwapTuple<Params, From, To>) => Swap<ReturnType, From, To>
	: never;

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
	type: RecordType<T>,
	from: Type<From>,
	to: Type<To>
): RecordType<SwapObject<T, From, To>>;
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
	return ((type as any) === from ? to : type) as any; // TS just can't follow this :(
}

function swapUnion<T extends readonly [...unknown[]], From, To>(
	type: UnionType<T>,
	from: Type<From>,
	to: Type<To>
): SwapValue<T, From, To> {
	const subTypes = [];
	let different = false;
	for (const subType of type.subsets) {
		const newSub = swap(subType, from, to);
		if (newSub === subType) {
			subTypes.push(subType);
		} else {
			subTypes.push(newSub);
			different = true;
		}
	}
	if (different) {
		return UnionType[MakeUnion](subTypes) as any; // TS just can't follow this :(
	}
	return type as any; // TS just can't follow this :(
}

function swapIntersection<T extends readonly [...unknown[]], From, To>(
	type: IntersectionType<T>,
	from: Type<From>,
	to: Type<To>
): SwapValue<T, From, To> {
	const subTypes = [];
	let different = false;
	for (const subType of type.subsets) {
		const newSub = swap(subType, from, to);
		if (newSub === subType) {
			subTypes.push(subType);
		} else {
			subTypes.push(newSub);
			different = true;
		}
	}
	if (different) {
		return IntersectionType[MakeIntersection](subTypes) as any; // TS just can't follow this :(
	}
	return type as any; // TS just can't follow this :(
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
): TupleType<Swap<T, From, To>> {
	const subTypes = [];
	let different = false;
	for (const subType of type.subsets) {
		const newSub = swap(subType, from, to);
		if (newSub === subType) {
			subTypes.push(subType);
		} else {
			subTypes.push(newSub);
			different = true;
		}
	}
	if (different) {
		return TupleType[MakeTuple](subTypes) as any; // TS just can't follow this :(
	}
	return type as any; // TS just can't follow this :(
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
	const paramTypes = [];
	let different = false;
	for (const subType of type.params) {
		const newSub = swap(subType, from, to);
		if (newSub === subType) {
			paramTypes.push(subType);
		} else {
			paramTypes.push(newSub);
			different = true;
		}
	}
	const newReturn = swap(type.returns, from, to);

	if (newReturn !== type.returns) {
		different = true;
	}
	if (different) {
		return FunctionType[MakeFunction](paramTypes, newReturn) as any;
	}
	return type as any;
}

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
		return RecordType[MakeRecord](innerRecordType as any); // TS just can't follow this :(
	}
	return type as any; // TS just can't follow this :(
}

export function mappedRecord<
	Reflected extends Record<string | number, unknown>,
	PropertyType,
	Prefix extends string,
	Suffix extends string
>(
	source: RecordType<Reflected>,
	propertyType: Type<PropertyType>,
	prefix: Prefix,
	suffix: Suffix
): RecordType<{
	[key in keyof Reflected as Surround<key, Prefix, Suffix>]: Swap<
		PropertyType,
		SourceType,
		Reflected[key]
	>;
}> {
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
	return RecordType[MakeRecord](reflectedResult as any); // There's no diff-checking here, we always return a new type
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

export function readonly<ReflectedType>(type: Type<ReflectedType>) {
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

type DoubleSwap<T, From_1, To_1, From_2, To_2> = Swap<
	Swap<T, From_1, To_1>,
	From_2,
	To_2
>;
type TripleSwap<T, From_1, To_1, From_2, To_2, From_3, To_3> = Swap<
	DoubleSwap<T, From_1, To_1, From_2, To_2>,
	From_3,
	To_3
>;

export function singleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
>(returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>) {
	return SingleGenericFunctionType[MakeSingleGenericFunction](
		paramTypes,
		returnType
	);
}

export function doubleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
>(returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>) {
	return DoubleGenericFunctionType[MakeDoubleGenericFunction](
		paramTypes,
		returnType
	);
}

export function tripleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
>(returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>) {
	return TripleGenericFunctionType[MakeTripleGenericFunction](
		paramTypes,
		returnType
	);
}

export function conditional<Extension, Base, Yes, No>(
	extension: Type<Extension>,
	base: Type<Base>,
	yes: Type<Yes>,
	no: Type<No>
) {
	return ConditionalType[MakeConditional](extension, base, yes, no);
}
