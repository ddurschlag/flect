export class Type<Reflected = unknown> {
	protected readonly _refl!: Reflected;
    };

    export type Reify<T extends Type> = T extends Type<infer Reflected> ? Reflected : never;
    type ReflectObject<Reflected extends Record<string|number, unknown>> = {[K in keyof Reflected]: Type<Reflected[K]>};
    type ReflectTuple<Reflected extends readonly [...unknown[]]> = {[K in keyof Reflected]: Type<Reflected[K]>};
    type Union<Reflected extends readonly [...unknown[]]> =
	 Reflected extends readonly [infer Head, ...infer Tail]
	    ? Head | Union<Tail>
	    : never;
    type Intersection<Reflected extends readonly [...unknown[]]> =
	    Reflected extends readonly [] ? unknown :
	 Reflected extends readonly [infer Head, ...infer Tail]
	    ? Head & Intersection<Tail>
	    : never;
    type EnforceTupling<Tuple extends readonly [...unknown[]]> = readonly [...Tuple];
    
    export class RecordType<Reflected extends Record<string|number, unknown>> extends Type<Reflected> {
	    constructor(type: ReflectObject<Reflected>) {
		    super();
		    this.properties = Object.entries(type);
	    }
	    public properties: {[K in keyof Reflected]: [K, Type<Reflected[K]>]}[keyof Reflected][]; // see https://github.com/microsoft/TypeScript/issues/13298 for why this type isn't tighter
    }
    
    export class ArrayType<ReflectedItem> extends Type<ReflectedItem[]> {
	    constructor(type: Type<ReflectedItem>) {
		    super();
		    this.itemType = type;
	    }
	    public itemType: Type<ReflectedItem>
    }

    const brandProp = Symbol('brand-prop');
    export class BrandType<T extends symbol> extends Type<{readonly [brandProp]: T}> {
	constructor(symbol: T) {
		super();
		this._symbol = symbol;
	}
	private _symbol: T;
    }
    
    export const stringType = new Type<string>();
    export const numberType = new Type<number>();
    export const bigintType = new Type<bigint>();
    export const boolType = new Type<boolean>();
    export const symbolType = new Type<symbol>();
    export const voidType = new Type<void>();
    export const nullType = new Type<null>();
    export const neverType = new Type<never>();

    export function brand<T extends symbol>(t: T)  {
	return new BrandType(t);
    }
    
    export function literal<Reflected extends number|string|boolean>(type: Reflected) {
	return new Type<Reflected>();
    }
    
    export function record<Reflected extends Record<string|number, unknown>>(type: ReflectObject<Reflected>) {
	return new RecordType<Reflected>(type);
    }
    
    export function keyof<Reflected>(type: Type<Reflected>) {
	return new Type<keyof Reflected>();
    }
    
    // Pretty useless
    export function index<Reflected, Key extends keyof Reflected>(type: Type<Reflected>, key: Key) {
	return new Type<Reflected[Key]>;
    }
    
    export function array<ReflectedItem>(type: Type<ReflectedItem>) {
	return new ArrayType<ReflectedItem>(type);
    }
    
    export function tuple<Reflected extends readonly [...unknown[]]>(...type: ReflectTuple<Reflected>) {
	return new Type<EnforceTupling<Reflected>>();
    }
    
    export function classType<Reflected extends Function & { new(...args: readonly any[]): unknown; }>(type: Reflected) {
	return new Type<InstanceType<Reflected>>();
    }
    
    export function union<Subsets extends readonly [...unknown[]]>(...subsets: ReflectTuple<Subsets>) {
	return new Type<Union<Subsets>>();
    }
    
    export function intersection<Subsets extends readonly [...unknown[]]>(...subsets: ReflectTuple<Subsets>) {
	return new Type<Intersection<Subsets>>();
    }
    
    export function functionType<Params extends readonly [...unknown[]], Returns extends unknown>(returnType: Type<Returns>, ...parameterTypes: ReflectTuple<Params> ) {
	return new Type<(...args: Params) => Returns>();
    }
    
    type Swap<T, From, To> =
	T extends unknown[] ? SwapArray<T, From, To> :
	T extends readonly [...unknown[]] ? SwapTuple<T, From, To> :
	T extends (...args: [...any[]]) => unknown ? SwapFunction<T, From, To> :
	T extends object ? SwapObject<T, From, To> :
	SwapValue<T, From, To>;
    type SwapValue<Value, From, To> = Value extends From ? To : Value;
    type SwapTuple<Tuple extends readonly [...unknown[]], From, To> = Tuple extends readonly [infer Head, ...infer Rest]
	? readonly [Swap<Head, From, To>, ...SwapTuple<Rest, From, To>]
	: readonly [];
    type SwapArray<ArrayType extends unknown[], From, To> = ArrayType extends Array<infer T> ? Array<Swap<T, From, To>> : never;
    type SwapObject<ObjectType extends object, From, To> = {
	[P in keyof ObjectType]: Swap<ObjectType[P], From, To>;
    };
    type SwapFunction<Func extends (...args: [...any[]]) => unknown, From, To> = Func extends (...args: infer Params) => infer ReturnType
	? (...args: SwapTuple<Params, From, To>) => Swap<ReturnType, From, To>
	: never;
    
    type OrPlaceholder<Tuple extends readonly [...unknown[]], PlaceHolder> = Tuple extends readonly [infer Head, ...infer Rest]
	? [Head|PlaceHolder, ...OrPlaceholder<Rest, PlaceHolder>]
	: [];
    
    const Generic_1 = Symbol();
    type Generic_1 = typeof Generic_1;
    export const FIRST_GENERIC_TYPE = new Type<Generic_1>();
    
    const Generic_2 = Symbol();
    type Generic_2 = typeof Generic_2;
    export const SECOND_GENERIC_TYPE = new Type<Generic_2>();
    
    
    const Generic_3 = Symbol();
    type Generic_3 = typeof Generic_3;
    export const THIRD_GENERIC_TYPE = new Type<Generic_3>();
    
    type DoubleSwap<T, From_1, To_1, From_2, To_2> = Swap<Swap<T, From_1, To_1>, From_2, To_2>;
    type TripleSwap<T, From_1, To_1, From_2, To_2, From_3, To_3> = Swap<DoubleSwap<T, From_1, To_1, From_2, To_2>, From_3, To_3>;
    
    export function singleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
    >(
	returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>
    ) {
	return new Type<<GEN_TYPE_1>(...args: Swap<EnforceTupling<Params>, Generic_1, GEN_TYPE_1>) => Swap<Returns, Generic_1, GEN_TYPE_1>>();
    }
    
    export function doubleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
    >(
	returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>
    ) {
	return new Type<
	    <GEN_TYPE_1, GEN_TYPE_2>(
		...args: DoubleSwap<EnforceTupling<Params>, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2>
	    ) => DoubleSwap<Returns, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2>
	>();
    }
    
    export function tripleGenericFunctionType<
	Returns extends unknown,
	Params extends readonly [...unknown[]]
    >(
	returnType: Type<Returns>, ...paramTypes: ReflectTuple<Params>
    ) {
	return new Type<
	    <GEN_TYPE_1, GEN_TYPE_2, GEN_TYPE_3>(
		...args: TripleSwap<EnforceTupling<Params>, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2, Generic_3, GEN_TYPE_3>
	    ) => TripleSwap<Returns, Generic_1, GEN_TYPE_1, Generic_2, GEN_TYPE_2, Generic_3, GEN_TYPE_3>
	>();
    }
    
    // This is pretty useless, as it's evaluated when the function is called,
    // not when the type is reified
    export function conditional<Extension, Base, Yes, No>(
	extension: Type<Extension>,
	base: Type<Base>,
	yes: Type<Yes>,
	no: Type<No>
    ) {
	return new Type<Extension extends Base ? Yes : No>();
    }
    