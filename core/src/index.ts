export class Type<Reflected = unknown> {
	protected readonly _refl!: Reflected;
}

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
export type Union<Reflected extends readonly [...unknown[]]> =
	Reflected extends readonly [infer Head, ...infer Tail]
		? Head | Union<Tail>
		: never;
export type Intersection<Reflected extends readonly [...unknown[]]> =
	Reflected extends readonly []
		? unknown
		: Reflected extends readonly [infer Head, ...infer Tail]
		? Head & Intersection<Tail>
		: never;
type EnforceTupling<Tuple extends readonly [...unknown[]]> = readonly [
	...Tuple
];

export class ConditionalType<
	Extension = unknown,
	Base = unknown,
	Yes = unknown,
	No = unknown
> {
	constructor(
		extension: Type<Extension>,
		base: Type<Base>,
		yes: Type<Yes>,
		no: Type<No>
	) {
		this._extension = extension;
		this._base = base;
		this._yes = yes;
		this._no = no;
	}

	private _extension: Type<Extension>;

	private _base: Type<Base>;

	private _yes: Type<Yes>;

	private _no: Type<No>;
}

export class RecordType<
	Reflected extends Record<string | number, unknown>
> extends Type<Reflected> {
	constructor(type: ReflectObject<Reflected>) {
		super();
		this.properties = Reflect.ownKeys(type).map((key) => [
			key,
			Reflect.get(type, key)
		]) as any;
		const x = this.properties[0];
	}

	public properties: {
		[K in keyof Reflected]: [
			K extends string | symbol ? K : string,
			Type<Reflected[K]>
		];
	}[keyof Reflected][]; // see https://github.com/microsoft/TypeScript/issues/13298 for why this type isn't tighter
}

const brandProp = Symbol("brand-prop");
export class BrandType<T extends symbol> extends Type<{
	readonly [brandProp]: T;
}> {
	constructor(symbol: T) {
		super();
		this._symbol = symbol;
	}

	private _symbol: T;
}

export class UnionType<Subsets extends readonly [...unknown[]]> extends Type<
	Union<Subsets>
> {
	constructor(subsets: ReflectTuple<Subsets>) {
		super();
		this._subsets = subsets;
	}

	get subsets() {
		return this._subsets;
	}

	private _subsets: ReflectTuple<Subsets>;
}

export class IntersectionType<
	Subsets extends readonly [...unknown[]]
> extends Type<Intersection<Subsets>> {
	constructor(subsets: ReflectTuple<Subsets>) {
		super();
		this._subsets = subsets;
	}

	get subsets() {
		return this._subsets;
	}

	private _subsets: ReflectTuple<Subsets>;
}

// Generic types

export class ArrayType<ReflectedItem> extends Type<ReflectedItem[]> {
	constructor(type: Type<ReflectedItem>) {
		super();
		this.itemType = type;
	}

	public itemType: Type<ReflectedItem>;
}

export class TupleType<Reflected extends readonly [...unknown[]]> extends Type<
	EnforceTupling<Reflected>
> {
	constructor(type: ReflectTuple<Reflected>) {
		super();
		this._subsets = type;
	}

	public get subsets() {
		return this._subsets;
	}

	private _subsets: ReflectTuple<Reflected>;
}

export class MapType<ReflectedKey, ReflectedValue> extends Type<
	Map<ReflectedKey, ReflectedValue>
> {
	constructor(key: Type<ReflectedKey>, value: Type<ReflectedValue>) {
		super();
		this.keyType = key;
		this.valueType = value;
	}

	public keyType: Type<ReflectedKey>;

	public valueType: Type<ReflectedValue>;
}

export class SetType<ReflectedItem> extends Type<Set<ReflectedItem>> {
	constructor(type: Type<ReflectedItem>) {
		super();
		this.itemType = type;
	}

	public itemType: Type<ReflectedItem>;
}

export const stringType = new Type<string>();
export const numberType = new Type<number>();
export const bigintType = new Type<bigint>();
export const boolType = new Type<boolean>();
export const symbolType = new Type<symbol>();
export const voidType = new Type<void>();
export const nullType = new Type<null>();
export const neverType = new Type<never>();
export const unknownType = new Type<unknown>();
export const anyType = new Type<any>();

export function brand<T extends symbol>(t: T) {
	return new BrandType(t);
}

export function literal<Reflected extends number | string | boolean>(
	type: Reflected
) {
	return new Type<Reflected>();
}

export function record<Reflected extends Record<string | number, unknown>>(
	type: ReflectObject<Reflected>
) {
	return new RecordType<Reflected>(type);
}

const sourceTypeSymbol = Symbol("source-type");
type SourceType = typeof sourceTypeSymbol;
export const SourceType = new Type<SourceType>();

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
	: T extends object
	? SwapObject<T, From, To>
	: SwapValue<T, From, To>;
type SwapValue<Value, From, To> = Value extends From ? To : Value;
type SwapTuple<
	Tuple extends readonly [...unknown[]],
	From,
	To
> = Tuple extends readonly [infer Head, ...infer Rest]
	? readonly [Swap<Head, From, To>, ...SwapTuple<Rest, From, To>]
	: readonly [];
type SwapArray<ArrayType extends unknown[], From, To> = ArrayType extends Array<
	infer T
>
	? Array<Swap<T, From, To>>
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
// function swap<T extends (...args: [...any[]]) => unknown, From, To> //... TODO: FunctionType
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
		// Need FunctionType support
		// } else if (type instanceof FunctionType) {
		// 	return swapFunction(type, from, to);
	}
	if (type instanceof RecordType) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		return swapRecord(type, from, to) as any; // TS just can't follow this :(
	}
	return ((type as any) === from ? to : type) as any; // TS just can't follow this :(
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
	return new ArrayType(itemType);
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
		return new TupleType(subTypes) as any; // TS just can't follow this :(
	}
	return type as any; // TS just can't follow this :(
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
		return new RecordType(innerRecordType as any); // TS just can't follow this :(
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
	return new RecordType(reflectedResult as any); // There's no diff-checking here, we always return a new type
}

export function keyof<Reflected>(type: Type<Reflected>) {
	return new Type<keyof Reflected>();
}

// Pretty useless
export function index<Reflected, Key extends keyof Reflected>(
	type: Type<Reflected>,
	key: Key
) {
	return new Type<Reflected[Key]>();
}

export function array<ReflectedItem>(type: Type<ReflectedItem>) {
	return new ArrayType<ReflectedItem>(type);
}

export function mapType<ReflectedKey, ReflectedValue>(
	keyType: Type<ReflectedKey>,
	valueType: Type<ReflectedValue>
) {
	return new MapType(keyType, valueType);
}

export function setType<ReflectedItem>(type: Type<ReflectedItem>) {
	return new SetType<ReflectedItem>(type);
}

export function tuple<Reflected extends readonly [...unknown[]]>(
	...type: ReflectTuple<Reflected>
) {
	return new TupleType<Reflected>(type);
}

export function classType<
	Reflected extends Function & {new (...args: readonly any[]): unknown}
>(type: Reflected) {
	return new Type<InstanceType<Reflected>>();
}

export function union<Subsets extends readonly [...unknown[]]>(
	...subsets: ReflectTuple<Subsets>
) {
	return new UnionType(subsets);
}

export function intersection<Subsets extends readonly [...unknown[]]>(
	...subsets: ReflectTuple<Subsets>
) {
	return new IntersectionType(subsets);
}

export function functionType<
	Params extends readonly [...unknown[]],
	Returns extends unknown
>(returnType: Type<Returns>, ...parameterTypes: ReflectTuple<Params>) {
	return new Type<(...args: Params) => Returns>();
}

const Generic_1 = Symbol("generic-1");
type Generic_1 = typeof Generic_1;
export const FIRST_GENERIC_TYPE = new Type<Generic_1>();

const Generic_2 = Symbol("generic-2");
type Generic_2 = typeof Generic_2;
export const SECOND_GENERIC_TYPE = new Type<Generic_2>();

const Generic_3 = Symbol("generic-3");
type Generic_3 = typeof Generic_3;
export const THIRD_GENERIC_TYPE = new Type<Generic_3>();

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
	return new Type<
		<GEN_TYPE_1>(
			...args: Swap<EnforceTupling<Params>, Generic_1, GEN_TYPE_1>
		) => Swap<Returns, Generic_1, GEN_TYPE_1>
	>();
}

export function doubleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
>(returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>) {
	return new Type<
		<GEN_TYPE_1, GEN_TYPE_2>(
			...args: DoubleSwap<
				EnforceTupling<Params>,
				Generic_1,
				GEN_TYPE_1,
				Generic_2,
				GEN_TYPE_2
			>
		) => DoubleSwap<Returns, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2>
	>();
}

export function tripleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
>(returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>) {
	return new Type<
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
	>();
}

export function conditional<Extension, Base, Yes, No>(
	extension: Type<Extension>,
	base: Type<Base>,
	yes: Type<Yes>,
	no: Type<No>
) {
	return new ConditionalType(extension, base, yes, no);
}
