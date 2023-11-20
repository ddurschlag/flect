import {
	numberType,
	record,
	stringType,
	undefinedType,
	Reify,
	array,
	literal,
	keyof,
	index,
	union,
	tuple,
	classType,
	functionType,
	FIRST_GENERIC_TYPE,
	constrainedSingleGenericFunctionType,
	constrainedDoubleGenericFunctionType,
	SECOND_GENERIC_TYPE,
	THIRD_GENERIC_TYPE,
	constrainedTripleGenericFunctionType,
	conditional,
	neverType,
	intersection,
	brand,
	UnionType,
	mapType,
	setType,
	mappedRecord,
	SourceType,
	ArrayType,
	unknownType,
	voidType,
	nullType,
	TupleType,
	RecordType,
	guard,
	FunctionType,
	anyType,
	boolType,
	IntersectionType,
	readonly,
	MapType,
	SetType,
	tripleGenericFunctionType,
	doubleGenericFunctionType,
	singleGenericFunctionType,
	objectType,
	metaType,
	reify,
	GuardType,
	optionalRecord,
	DeepReadonlyObject
} from "@flect/core";

type InstanceOf<T> = T extends {prototype: infer R} ? R : never;
function assertKeyIsType<
	Reflected extends Record<string | number, unknown>,
	TypeCtor extends Function
>(
	rec: RecordType<Reflected>,
	k: keyof Reflected extends string | symbol
		? (string | symbol) & keyof Reflected
		: string,
	expectedType: TypeCtor
) {
	const propMap = new Map(rec.properties.map(([key, val]) => [key, val]));
	const propertyValue = propMap.get(k);
	expect(propertyValue).toBeInstanceOf(expectedType);
	if (propertyValue instanceof expectedType) {
		return propertyValue as InstanceOf<TypeCtor>;
	}
	throw new Error("Wat");
}

function assertKeyIsNot<Reflected extends Record<string | number, unknown>>(
	rec: RecordType<Reflected>,
	k: string
) {
	const allKeys = rec.properties
		.map(([key]) => key)
		.filter((key) => typeof key === "string") as string[];
	expect(new Set(allKeys).has(k)).toBe(false);
}

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;

const dog: Animal = {legCount: 4, sound: "woof"};

const BinarySequence = array(union(literal(true), literal(false)));
type BinarySequence = Reify<typeof BinarySequence>;

const Bx1 = Symbol("bx1");
const Bx2 = Symbol("bx2");
const B1 = brand(Bx1);
type B1 = Reify<typeof B1>;
const B2 = brand(Bx2);
type B2 = Reify<typeof B2>;

const B1Animal = intersection(B1, Animal);
type B1Animal = Reify<typeof B1Animal>;
const B2Animal = intersection(B2, Animal);
type B2Animal = Reify<typeof B2Animal>;

describe("@flect/core", () => {
	describe("Types", () => {
		describe("Brand type", () => {
			test("Not interchangeable", () => {
				const b1: B1 = {} as B1;
				const b1b: B1 = b1;
				// @ts-expect-error
				const b2: B2 = b1;
			});
			test("Intersection guarantees uniqueness", () => {
				const animal1: B1Animal = {} as B1Animal;
				const animal1b: B1Animal = animal1;
				// @ts-expect-error
				const animal2: B2Animal = animal1;
			});
		});
		test("Undefined type", () => {
			const Boring = record({undef: undefinedType});
			type Boring = Reify<typeof Boring>;
			const b: Boring = {undef: undefined};
			// @ts-expect-error
			const interesting: Boring = {undef: 3};
		});
		test("Literal type", () => {
			const AlwaysBob = literal("bob");
			type AlwaysBob = Reify<typeof AlwaysBob>;
			const bob: AlwaysBob = "bob";
			expect(bob).toBeTruthy();
			// @ts-expect-error
			const moreBob: AlwaysBob = "ted";
		});
		test("Record type", () => {
			expect(dog).toBeTruthy();
			// @ts-expect-error
			const chair: Animal = {legCount: 4, seat: true};
		});
		test("Optional record type", () => {
			const MaybePetless = optionalRecord({
				name: stringType,
				pet: union(Animal, undefinedType)
			});
			type MaybePetless = Reify<typeof MaybePetless>;
			const withPet: MaybePetless = {name: "alice", pet: dog};
			const withoutPet: MaybePetless = {name: "bob"};
			// @ts-expect-error
			const onlyPet: MaybePetless = {pet: dog};
		});
		test("Array type", () => {
			const StringArray = array(stringType);
			type StringArray = Reify<typeof StringArray>;
			const good1: StringArray = ["3", "4"];
			const good2: StringArray = ["3"];
			const good3: StringArray = [];
			// @ts-expect-error
			const bad1: StringArray = [3];
			// @ts-expect-error
			const bad2: StringArray = [3, 4];
		});
		test("Meta type", () => {
			const MetaNumber = metaType(numberType);
			type MetaNumber = Reify<typeof MetaNumber>;
			expect(MetaNumber.type).toBe(numberType);
			const n: MetaNumber = numberType;
			const N = reify(MetaNumber);
			type N = Reify<typeof N>;
			const k: N = 3;
			expect(N).toBe(numberType);
		});
		test("Bad reify", () => {
			const Wat = reify(numberType);
			type Wat = Reify<typeof Wat>;
			const f: () => never = () => {
				const wat: Wat = 0 as never;
				return wat;
			};
			// Just prove it typechecks, showing we get a never when reifying a non-meta type.
			expect(f).toBeTruthy();
		});
		test("Map type", () => {
			const S2sMap = mapType(stringType, stringType);
			type S2sMap = Reify<typeof S2sMap>;
			const good: S2sMap = new Map();
			good.set("3", "4");
			const bad: S2sMap = new Map();
			// @ts-expect-error
			bad.set(3, "4");
			// @ts-expect-error
			bad.set("3", 4);
			// @ts-expect-error
			bad.set(3, 4);
		});
		test("Set type", () => {
			const StringSet = setType(stringType);
			type StringSet = Reify<typeof StringSet>;
			const good: StringSet = new Set();
			good.add("3");
			const bad: StringSet = new Set();
			// @ts-expect-error
			bad.add(3);
		});
		test("Keyof type", () => {
			const AnimalKeys = keyof(Animal);
			type AnimalKeys = Reify<typeof AnimalKeys>;
			const aKey: AnimalKeys = "legCount";
			expect(aKey).toBeTruthy();
			// @ts-expect-error
			const notKey: AnimalKeys = "seat";
		});
		test("Index type", () => {
			const Person = record({
				pet: record({
					legCount: numberType,
					sound: stringType
				})
			});
			type Person = Reify<typeof Person>;
			const steve: Person = {pet: dog};
			const NumberToString = index(
				index(index(Person, "pet"), "legCount"),
				"toString"
			);
			type NumberToString = Reify<typeof NumberToString>;
			const threeToString: NumberToString = (3).toString;
			expect(threeToString).toBeTruthy();
			// @ts-expect-error
			const someOtherFunc: NumberToString = [].at;
		});
		test("Union type", () => {
			const binSeq: BinarySequence = [true, false, true];
			expect(binSeq).toBeTruthy();
			const u = BinarySequence.itemType as UnionType<[true, false]>;
			expect(u.subsets.length).toBe(2);
			// @ts-expect-error
			const numSeq: BinarySequence = [1, 2, 3];
		});
		test("Intersection type", () => {
			const threeOrFour = union(literal(3), literal(4));
			const fourOrFive = union(literal(5), literal(4));
			const Four = intersection(threeOrFour, fourOrFive);
			type Four = Reify<typeof Four>;
			const myFour: Four = 4;
			expect(Four.subsets.length).toBe(2);
			// @ts-expect-error
			const notFour: Four = 5;
		});
		test("Tuple type", () => {
			const StringNumString = tuple(stringType, numberType, stringType);
			type StringNumString = Reify<typeof StringNumString>;
			const sos: StringNumString = ["s", 0, "s"];
			expect(sos).toBeTruthy();
			expect(StringNumString.subsets.length).toBe(3);
			// @ts-expect-error
			const oso: StringNumString = [0, "s", 0];
		});
		test("Instance type", () => {
			class MyClass {
				constructor(
					public a: string,
					public b: number
				) {}
			}
			const MyClassType = classType(MyClass);
			type MyClassType = Reify<typeof MyClassType>;
			const mc: MyClassType = new MyClass("a", 3);
			expect(mc).toBeTruthy();
			// @ts-expect-error
			const notmc: MyClassType = {};
		});
		test("object type", () => {
			const TwoNonPrims = tuple(objectType, objectType);
			type TwoNonPrims = Reify<typeof TwoNonPrims>;
			const tnp1: TwoNonPrims = [{}, new Map()] as const;
			const tnp2: TwoNonPrims = [[], new Set()] as const;
			// @ts-expect-error
			const sneakPrim: TwoNonPrims = [{}, 3];
		});
		test("Function type", () => {
			const StoI = functionType(numberType, stringType);
			expect(StoI.params.length).toBe(1);
			expect(StoI.returns).toBe(numberType);
			type StoI = Reify<typeof StoI>;
			const len: StoI = (s) => s.length;
			expect(len).toBeTruthy();
			// @ts-expect-error
			const notLen: StoI = [].at;
		});
		test("Single generic function", () => {
			const CountOfThingToThings = singleGenericFunctionType(
				array(FIRST_GENERIC_TYPE),
				numberType,
				FIRST_GENERIC_TYPE
			);
			type CountOfThingToThings = Reify<typeof CountOfThingToThings>;
			expect(CountOfThingToThings.params.length).toBe(2);
			expect(CountOfThingToThings.returns).toBeInstanceOf(ArrayType);
			expect(
				(CountOfThingToThings.returns as ArrayType<unknown>).itemType
			).toBe(FIRST_GENERIC_TYPE);
			const repeat: CountOfThingToThings = <T>(repCount: number, item: T) => {
				const result: T[] = [];
				for (let i = 0; i < repCount; i++) {
					result[i] = item;
				}
				return result;
			};
			expect(repeat).toBeTruthy();
			// @ts-expect-error
			const notGeneric: CountOfThingToThings = (
				repCount: number,
				item: string
			) => {
				const result: string[] = [];
				for (let i = 0; i < repCount; i++) {
					result[i] = item;
				}
				return result;
			};
			// @ts-expect-error
			const badArgOrder: CountOfThingToThings = <T>(
				item: T,
				repCount: number
			) => {
				const result: T[] = [];
				for (let i = 0; i < repCount; i++) {
					result[i] = item;
				}
				return result;
			};
		});
		test("Constrainted single generic", () => {
			const HasLengthSignature = constrainedSingleGenericFunctionType(
				array(unknownType)
			)(boolType, FIRST_GENERIC_TYPE, numberType);
			type HasLengthSignature = Reify<typeof HasLengthSignature>;
			const hasLength: HasLengthSignature = <T extends unknown[]>(
				t: T,
				x: number
			) => t.length >= x;
			expect(hasLength([1, 2, 3], 2)).toBe(true);
			expect(hasLength([1], 2)).toBe(false);
			expect(HasLengthSignature.firstConstraint).toBeInstanceOf(ArrayType);
			// @ts-expect-error
			const overconstrained: HasLengthSignature = <T extends [string]>(
				t: T,
				x: number
			) => true;
		});
		test("Meta-typed single generic", () => {
			const ConstructType = singleGenericFunctionType(
				FIRST_GENERIC_TYPE,
				metaType(FIRST_GENERIC_TYPE)
			);
			type ConstructType = Reify<typeof ConstructType>;
			// Create a fake construction method.
			// Construction might be a good future flect package.
			const construct: ConstructType = () => 0 as any;
			expect(construct(numberType)).toBe(0);
			// @ts-expect-error
			const insufficientlyFlexible: ConstructType = (t) => 0;
		});
		test("Generic union", () => {
			const OrNumber = constrainedSingleGenericFunctionType()(
				union(FIRST_GENERIC_TYPE, numberType)
			);
			type OrNumber = Reify<typeof OrNumber>;
			const butReallyAlwaysThree: OrNumber = () => 3;
			expect(butReallyAlwaysThree).toBeTruthy();
			// @ts-expect-error
			const reallyAlwaysString: OrNumber = () => "3";
		});
		test("Generic intersection", () => {
			const FancyId = constrainedSingleGenericFunctionType()(
				intersection(FIRST_GENERIC_TYPE, unknownType),
				FIRST_GENERIC_TYPE
			);
			type FancyId = Reify<typeof FancyId>;
			const fancyId: FancyId = <T>(t: T) => t;
			expect(fancyId).toBeTruthy();
			// @ts-expect-error
			const reallyAlwaysString: FancyId = <T>(t: T) => "3";
		});
		test("Generic brand intersection", () => {
			const symbol = Symbol("observe");
			const MyBrand = brand(symbol);
			type MyBrand = Reify<typeof MyBrand>;
			const MyFactory = constrainedSingleGenericFunctionType()(
				intersection(FIRST_GENERIC_TYPE, MyBrand),
				FIRST_GENERIC_TYPE
			);
			type MyFactory = Reify<typeof MyFactory>;
			const q1: MyFactory = () => ({}) as any;
			const q2 = q1(3);
			const q3: number & MyBrand = q2;
		});
		test("Generic brand union", () => {
			const symbol = Symbol("observe");
			const MyBrand = brand(symbol);
			type MyBrand = Reify<typeof MyBrand>;
			const MyFactory = constrainedSingleGenericFunctionType()(
				union(FIRST_GENERIC_TYPE, MyBrand),
				FIRST_GENERIC_TYPE
			);
			type MyFactory = Reify<typeof MyFactory>;
			const q1: MyFactory = () => ({}) as any;
			const q2 = q1(3);
			const q3: number | MyBrand = q2;
		});
		test("Generic first-class function", () => {
			const UpdateType = singleGenericFunctionType(
				array(FIRST_GENERIC_TYPE),
				functionType(FIRST_GENERIC_TYPE, FIRST_GENERIC_TYPE),
				array(FIRST_GENERIC_TYPE)
			);
			type UpdateType = Reify<typeof UpdateType>;
			const update: UpdateType = (f, a) => a.map(f);
			expect(update((x) => x + 3, [1, 2, 3])).toEqual([4, 5, 6]);
		});
		test("Not-so-generic first-class function", () => {
			const UpdateType = singleGenericFunctionType(
				array(stringType),
				functionType(stringType, numberType),
				array(numberType)
			);
			type UpdateType = Reify<typeof UpdateType>;
			const update: UpdateType = (f, a) => a.map(f);
			expect(update((x) => x.toString(), [1, 2, 3])).toEqual(["1", "2", "3"]);
		});
		test("Generic param only", () => {
			const ChuckIt = singleGenericFunctionType(
				voidType,
				functionType(voidType, FIRST_GENERIC_TYPE),
				FIRST_GENERIC_TYPE
			);
			type ChuckIt = Reify<typeof ChuckIt>;
			const chuckIt: ChuckIt = (f, t) => f(t);
			expect(chuckIt(() => {}, 3)).toBeUndefined();
		});
		test("Generic return only", () => {
			const MakeIt = singleGenericFunctionType(
				voidType,
				functionType(FIRST_GENERIC_TYPE, nullType)
			);
			type MakeIt = Reify<typeof MakeIt>;
			const makeIt: MakeIt = (f) => f(null);
			expect(makeIt(() => 3)).toBe(3);
		});
		test("Double generic function", () => {
			const Pairing = constrainedDoubleGenericFunctionType()(
				tuple(FIRST_GENERIC_TYPE, SECOND_GENERIC_TYPE),
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE
			);
			type Pairing = Reify<typeof Pairing>;
			expect(Pairing.params.length).toBe(2);
			expect(Pairing.params[0]).toBe(FIRST_GENERIC_TYPE);
			expect(Pairing.returns).toBeInstanceOf(TupleType);
			expect(Pairing.firstConstraint).toBe(Pairing.secondConstraint);
			const pair: Pairing = <T, U>(t: T, u: U) => [t, u] as const;
			expect(pair).toBeTruthy();
			// @ts-expect-error
			const moreArgs: Pairing = <T, U>(t: T, u: U, x: number) =>
				[t, u, x] as const;
		});
		test("Triple generic function", () => {
			const LabelThreeThings = constrainedTripleGenericFunctionType()(
				record({
					first: FIRST_GENERIC_TYPE,
					second: SECOND_GENERIC_TYPE,
					third: THIRD_GENERIC_TYPE
				}),
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE,
				THIRD_GENERIC_TYPE
			);
			type LabelThreeThings = Reify<typeof LabelThreeThings>;
			expect(LabelThreeThings.params.length).toBe(3);
			expect(LabelThreeThings.returns).toBeInstanceOf(RecordType);
			expect(LabelThreeThings.firstConstraint).toBe(unknownType);
			expect(LabelThreeThings.secondConstraint).toBe(unknownType);
			expect(LabelThreeThings.thirdConstraint).toBe(unknownType);
			const label: LabelThreeThings = <T, U, V>(
				first: T,
				second: U,
				third: V
			) => ({first, second, third});
			expect(label).toBeTruthy();
			// @ts-expect-error
			const onlyTwo: LabelThreeThings = <T, U>(first: T, second: U) => ({
				first,
				second,
				third: 0
			});
		});
		test("Generic constraint interactions", () => {
			const ArrayOf = constrainedDoubleGenericFunctionType(
				unknownType,
				array(FIRST_GENERIC_TYPE)
			)(SECOND_GENERIC_TYPE, FIRST_GENERIC_TYPE, numberType);
			type ArrayOf = Reify<typeof ArrayOf>;
			const arrayOf: ArrayOf = <T, U extends T[]>(t: T, m: number) => {
				const result: U = [] as unknown as U;
				for (let i = 0; i < m; i++) {
					result.push(t);
				}
				return result;
			};
			expect(arrayOf("3", 3)).toEqual(["3", "3", "3"]);
			// @ts-expect-error
			const badArrayOf: ArrayOf = <T, U extends number[]>(t: T, m: number) => {
				const result: U = [] as unknown as U;
				for (let i = 0; i < m; i++) {
					result.push(3);
				}
				return result;
			};
		});
		test("Generic functione equality", () => {
			const g2 = doubleGenericFunctionType(
				FIRST_GENERIC_TYPE,
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE
			);
			const g3 = tripleGenericFunctionType(
				unknownType,
				unknownType,
				FIRST_GENERIC_TYPE,
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE
			);
			const g2b = constrainedDoubleGenericFunctionType()(
				FIRST_GENERIC_TYPE,
				FIRST_GENERIC_TYPE,
				SECOND_GENERIC_TYPE
			);

			expect(g2).toBe(g2b);
			expect(g2).not.toBe(g3);
		});
		test("Conditional type", () => {
			const ThreeNumMeansString = conditional(
				literal(3),
				numberType,
				stringType,
				neverType
			);
			type ThreeNumMeansString = Reify<typeof ThreeNumMeansString>;
			expect(ThreeNumMeansString.extension).toBeTruthy();
			expect(ThreeNumMeansString.base).toBe(numberType);
			expect(ThreeNumMeansString.yes).toBe(stringType);
			expect(ThreeNumMeansString.no).toBe(neverType);
			const myString: ThreeNumMeansString = "foo!";
			expect(myString).toBeTruthy();
			// @ts-expect-error
			const myNum: ThreeNumMeansString = 3;
		});
		describe("Readonly type", () => {
			test("No effect on primitives", () => {
				// No such thing as an immutable primitive in JS
				const Useless = readonly(numberType);
				type Useless = Reify<typeof Useless>;
				let itsThree: Useless = 3;
				itsThree++;
				expect(Useless.type).toBe(numberType);
				// @ts-expect-error
				const otherThree: Useless = "3";
			});
			test("Arrays become fixed", () => {
				const RoA = readonly(array(numberType));
				type RoA = Reify<typeof RoA>;
				const threeThreeForever: RoA = [3, 3];
				expect(threeThreeForever[0]).toBe(3);
				expect(RoA.type).toBeInstanceOf(ArrayType);
				// @ts-expect-error
				threeThreeForever[0] = 5;
			});
			test("Double readonly of object of array doesn't explode", () => {
				const DRoOoA = readonly(readonly(record({foo: array(stringType)})));
				type DRoOoA = Reify<typeof DRoOoA>;

				// Second RO does nothing
				expect(DRoOoA).toBe(readonly(record({foo: array(stringType)})));

				const x: DRoOoA = {foo: ["bar"]};
				expect(x.foo.length).toBe(1);
			});
			test("Tuples become fixed", () => {
				const RoT = readonly(tuple(stringType, numberType));
				type RoT = Reify<typeof RoT>;
				const threeThreeVariety: RoT = ["3", 3];
				expect(RoT.type).toBeInstanceOf(TupleType);
				// @ts-expect-error
				const wrongOrder: RoT = [3, "3"];
				// @ts-expect-error
				const shortCount: RoT = [3];
				// @ts-expect-error
				const longCount: RoT = ["3", 3, "3"];
			});
			test("Functions are unchanged", () => {
				const UselessF = readonly(functionType(voidType));
				type UselessF = Reify<typeof UselessF>;
				const nothing: UselessF = () => {};
				expect(nothing).not.toThrow();
				expect(UselessF.type).toBeInstanceOf(FunctionType);
				// @ts-expect-error
				const something: UselessF = (a: string) => a;
			});
			test("Maps become fixed", () => {
				const RoM = readonly(mapType(numberType, stringType));
				type RoM = Reify<typeof RoM>;
				const writableMap: Map<number, string> = new Map();
				writableMap.set(1, "1");
				writableMap.set(2, "2");
				const rom: RoM = writableMap;
				expect(rom.get(1)).toBe("1");
				expect(RoM.type).toBeInstanceOf(MapType);
				// @ts-expect-error
				rom.set(3, "3");
			});
			test("Sets become fixed", () => {
				const RoS = readonly(setType(numberType));
				type RoS = Reify<typeof RoS>;
				const writableSet = new Set<number>();
				writableSet.add(3);
				const ros: RoS = writableSet;
				expect(ros.has(3)).toBe(true);
				expect(RoS.type).toBeInstanceOf(SetType);
				// @ts-expect-error
				ros.add(4);
			});
			test("Records become fixed", () => {
				const RoO = readonly(record({a: array(array(numberType))}));
				type RoO = Reify<typeof RoO>;
				const roo: RoO = {a: [[1, 2], [3]]};
				expect(roo.a[1][0]).toBe(3);
				expect(RoO.type).toBeInstanceOf(RecordType);
				// @ts-expect-error
				roo.a = [[]];
				// @ts-expect-error
				roo.a[0] = [];
				// @ts-expect-error
				roo.a[0][0]++;
			});
			test("Intersections are distributed", () => {
				const numRecord = record({myNum: numberType});
				const strRecord = record({myStr: stringType});
				const RoI = readonly(intersection(numRecord, strRecord));
				type RoI = Reify<typeof RoI>;
				const roi: RoI = {myNum: 7, myStr: "5"};
			});
			test("Branded primitives work", () => {
				const s = Symbol("readonly");
				const BP = intersection(stringType, brand(s));
				type BP = Reify<typeof BP>;
				const RoBP = readonly(BP);
				type RoBP = Reify<typeof RoBP>;
				const bp: BP = "foo" as BP;
				const robp: RoBP = bp;
			});
			test("Branded functions work", () => {
				const fType = functionType(numberType, stringType);
				const s = Symbol("readonly");
				const BF = intersection(fType, brand(s));
				type BF = Reify<typeof BF>;
				const RoBF = readonly(BF);
				type RoBF = Reify<typeof RoBF>;
				const bf = ((str: string) => str.length) as BF;
				const robf: RoBF = bf;
				expect(robf("three")).toBe(5);
			});
		});
		describe("Mapped types", () => {
			test("Smoke test", () => {
				const Herd = mappedRecord(Animal, array(SourceType), "allMy", "");
				type Herd = Reify<typeof Herd>;
				const good: Herd = {
					allMyLegCount: [1, 2, 3],
					allMySound: ["moo", "bah", "la la la"]
				};
				expect(Herd.properties.length).toBe(2);
				assertKeyIsNot(Herd, "legCount");
				const x = ArrayType;
				const legs = assertKeyIsType(Herd, "allMyLegCount", ArrayType);
				expect(legs.itemType).toBe(numberType);
			});
			test("Reified metatype", () => {
				// TODO: With no way to either force all property types to extend
				// Type or to check if they do during mapping, this can't work.
				// If everything moved from depending on Type to depending
				// on Reifiable we might be able to use conditional(), possibly
				// in combination with some lazy form or reify(), to make it go.
			});
			test("Guard type", () => {
				const HasNumber = record({thing: numberType});
				const HasGuard = mappedRecord(
					HasNumber,
					guard(unknownType, SourceType),
					"",
					""
				);
				const AltHasGuard = mappedRecord(
					HasNumber,
					guard(unknownType, numberType),
					"",
					""
				);
				expect(HasGuard).toBe(AltHasGuard);
				type HasGuard = Reify<typeof HasGuard>;
				const guardHaver: HasGuard = {
					thing: (n): n is number => typeof n === "number"
				};
				expect(guardHaver.thing(3)).toBe(true);
				expect(guardHaver.thing("3")).toBe(false);
				const g = assertKeyIsType(HasGuard, "thing", GuardType);
				expect(g.to).toBe(numberType);
			});
			test("Tuple type", () => {
				const pair = record({tuple: tuple(numberType, numberType)});
				const pairOfPairs = mappedRecord(
					pair,
					tuple(SourceType, SourceType),
					"",
					""
				);
				const tup = assertKeyIsType(pairOfPairs, "tuple", TupleType);
				expect(tup.subsets.length).toBe(2);
			});
			test("Constant tuple type", () => {
				const pair = record({tuple: tuple(numberType, numberType)});
				const otherPairs = mappedRecord(
					pair,
					tuple(stringType, stringType),
					"",
					""
				);
				const tup = assertKeyIsType(otherPairs, "tuple", TupleType);
				expect(tup.subsets.length).toBe(2);
			});
			test("Record type", () => {
				const hierarchy = record({rec: record({key: numberType})});
				const MegaHierarchy = mappedRecord(
					hierarchy,
					record({old: SourceType}),
					"",
					""
				);

				const recOfOld = assertKeyIsType(MegaHierarchy, "rec", RecordType);
				assertKeyIsType(recOfOld, "old", RecordType);
			});
			test("Optional record type", () => {
				const DefinitelyPet = optionalRecord({
					pet: Animal
				});
				type DefinitelyPet = Reify<typeof DefinitelyPet>;
				const MaybePetless = mappedRecord(
					DefinitelyPet,
					union(SourceType, undefinedType),
					"",
					""
				);
				type MaybePetless = Reify<typeof MaybePetless>;
				const petless: MaybePetless = {};
				const petfull: MaybePetless = {pet: dog};
				// @ts-expect-error
				const other: MaybePetless = {foo: dog};
			});
			test("Constant record type", () => {
				const hierarchy = record({rec: record({key: numberType})});
				const OtherHierarchy = mappedRecord(
					hierarchy,
					record({myString: stringType}),
					"",
					""
				);

				const recofStrings = assertKeyIsType(OtherHierarchy, "rec", RecordType);
				expect(recofStrings.properties.length).toBe(1);
				expect(recofStrings.properties[0][1]).toBe(stringType);
			});
			test("Array type", () => {
				const recOfArr = record({arr: array(stringType)});
				const arrArr = mappedRecord(recOfArr, array(SourceType), "", "");

				const innerArr = assertKeyIsType(arrArr, "arr", ArrayType);
				expect(innerArr.itemType).toBeInstanceOf(ArrayType);
			});
			describe("Function types", () => {
				test("Both swap", () => {
					const recF = record({
						f: functionType(stringType, numberType, voidType)
					});
					const mapRecF = mappedRecord(
						recF,
						functionType(SourceType, SourceType),
						"",
						"ButNew"
					);
					const f = assertKeyIsType(mapRecF, "fButNew", FunctionType);
					expect(f.params.length).toBe(1);
					expect(f.params[0]).toBeInstanceOf(FunctionType);
					expect(f.returns).toBeInstanceOf(FunctionType);
				});
				test("Neither swap", () => {
					const recF = record({
						f: functionType(stringType, numberType, voidType)
					});
					const mapRecF = mappedRecord(
						recF,
						functionType(numberType, voidType, stringType),
						"",
						"ButNew"
					);
					const f = assertKeyIsType(mapRecF, "fButNew", FunctionType);
					expect(f.params.length).toBe(2);
					expect(f.params[0]).toBe(voidType);
					expect(f.returns).toBe(numberType);
				});
				test("Only return swaps", () => {
					const recF = record({
						f: functionType(stringType, numberType, voidType)
					});
					const mapRecF = mappedRecord(
						recF,
						functionType(SourceType),
						"",
						"ButNew"
					);
					const f = assertKeyIsType(mapRecF, "fButNew", FunctionType);
					expect(f.params.length).toBe(0);
					expect(f.returns).toBeInstanceOf(FunctionType);
				});
			});
			test("Constant array type", () => {
				const recOfArr = record({arr: array(stringType)});
				const arrArr = mappedRecord(recOfArr, array(stringType), "", "");

				const innerArr = assertKeyIsType(arrArr, "arr", ArrayType);
				expect(innerArr.itemType).toBe(stringType);
			});
			test("Type with numeric key", () => {
				const doors = record({1: unknownType, 2: numberType, 3: unknownType});
				const moreDoors = mappedRecord(
					doors,
					stringType,
					"behind_door_number_",
					""
				);
				expect(moreDoors.properties.length).toBe(3);
			});
			test("Type with symbol key", () => {
				const s = Symbol("my-symbol");
				const weird = record({[s]: voidType});
				expect(() => mappedRecord(weird, nullType, "foo", "bar")).toThrow();
			});
			test("Type with union", () => {
				const ClearData = record({age: numberType});
				type ClearData = Reify<typeof ClearData>;
				const MaybeSerialized = mappedRecord(
					ClearData,
					union(SourceType, stringType),
					"",
					""
				);
				const JustAUnion = mappedRecord(
					ClearData,
					union(numberType, stringType),
					"",
					""
				);
				expect(MaybeSerialized.properties.length).toBe(1);
				expect(MaybeSerialized.properties[0][1]).toBeInstanceOf(UnionType);
			});
			test("Type with intersection", () => {
				const ClearData = record({age: numberType});
				type ClearData = Reify<typeof ClearData>;
				const AlsoSerialized = mappedRecord(
					ClearData,
					intersection(SourceType, stringType),
					"",
					""
				);
				const JustAnIntersection = mappedRecord(
					ClearData,
					intersection(numberType, stringType),
					"",
					""
				);
				expect(AlsoSerialized.properties.length).toBe(1);
				expect(AlsoSerialized.properties[0][1]).toBeInstanceOf(
					IntersectionType
				);
			});
		});
	});
	describe("Type caching", () => {
		test("Conditional type", () => {
			const c1 = conditional(numberType, anyType, numberType, stringType);
			const c2 = conditional(numberType, anyType, numberType, stringType);
			const c3 = conditional(numberType, anyType, numberType, boolType);
			expect(c1).toBe(c2);
			expect(c1).not.toBe(c3);
		});
		test("Record type", () => {
			const r1 = record({a: stringType, b: numberType});
			const r2 = record({b: numberType, a: stringType});
			const r3 = record({a: stringType, b: numberType, c: voidType});
			const r4 = record({a: numberType, b: numberType});

			expect(r1).toBe(r2);
			expect(r1).not.toBe(r3);
			expect(r1).not.toBe(r4);
			expect(r2).not.toBe(r3);
			expect(r2).not.toBe(r4);
			expect(r3).not.toBe(r4);
		});
		test("Union type", () => {
			const u1 = union(numberType, stringType, voidType);
			const u2 = union(stringType, numberType, voidType);
			const u3 = union(numberType, voidType, voidType);
			const u4 = union(numberType, stringType, voidType, voidType);

			expect(u1).toBe(u2);
			expect(u1).not.toBe(u3);
			expect(u1).not.toBe(u4);
		});
		test("Intersection type", () => {
			const i1 = intersection(numberType, stringType, voidType);
			const i2 = intersection(stringType, numberType, voidType);
			const i3 = intersection(numberType, voidType, voidType);
			const i4 = intersection(numberType, stringType, voidType, voidType);

			expect(i1).toBe(i2);
			expect(i1).not.toBe(i3);
			expect(i1).not.toBe(i4);
		});
		test("Map type", () => {
			const m1 = mapType(stringType, numberType);
			const m2 = mapType(stringType, numberType);
			const m3 = mapType(numberType, stringType);

			expect(m1).toBe(m2);
			expect(m1).not.toBe(m3);
		});
		test("Set type", () => {
			const s1 = setType(stringType);
			const s2 = setType(stringType);
			const s3 = setType(numberType);

			expect(s1).toBe(s2);
			expect(s1).not.toBe(s3);
		});
		test("Tuple type", () => {
			const t1 = tuple(numberType, stringType, voidType);
			const t2 = tuple(numberType, stringType, voidType);
			const t3 = tuple(numberType, voidType, voidType);
			const t4 = tuple(numberType, stringType, voidType, voidType);

			expect(t1).toBe(t2);
			expect(t1).not.toBe(t3);
			expect(t1).not.toBe(t4);
		});
		test("Array type", () => {
			const a1 = setType(stringType);
			const a2 = setType(stringType);
			const a3 = setType(numberType);

			expect(a1).toBe(a2);
			expect(a1).not.toBe(a3);
		});
	});
	test("Guard types", () => {
		const StringGuard = guard(unknownType, stringType);
		type StringGuard = Reify<typeof StringGuard>;
		const sg: StringGuard = (s): s is string => typeof s === "string";
		expect(sg("foo")).toBe(true);
		expect(sg(3)).toBe(false);
		expect(StringGuard.from).toBe(unknownType);
		expect(StringGuard.to).toBe(stringType);

		// Can't infer from boolean -- gotta specify it's a guard!
		// @ts-expect-error
		const notGuard: StringGuard = (s) => typeof s === "string";
	});
});
