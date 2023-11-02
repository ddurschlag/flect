import {
	Reify,
	anyType,
	array,
	bigintType,
	boolType,
	brand,
	intersection,
	mapType,
	neverType,
	nullType,
	numberType,
	readonly,
	record,
	setType,
	stringType,
	symbolType,
	undefinedType,
	union,
	unknownType,
	voidType
} from "@flect/core";
import {
	GenericValidator,
	RecordValidator,
	GuardChain,
	defaultGuards,
	brandRepository,
	AlgebraRepository,
	GuardCache,
	ReadonlyRepository
} from "@flect/guard";

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const dog: Animal = {legCount: 4, sound: "woof"};

const Person = record({
	pet: record({
		legCount: numberType,
		sound: stringType
	})
});
type Person = Reify<typeof Person>;
const steve: Person = {pet: dog};

const PersonOrPet = union(Person, Animal);
type PersonOrPet = Reify<typeof PersonOrPet>;

const PersonAndPet = intersection(Person, Animal);
type PersonAndPet = Reify<typeof PersonAndPet>;

const steveDog = {...steve, ...dog};

const Row = array(boolType);
const Grid = array(Row);
const Change = record({
	before: Grid,
	after: Grid,
	change: stringType
});
type Change = Reify<typeof Change>;

describe("@flect/Guard", () => {
	test("Various defaults", () => {
		const v = new GuardChain(defaultGuards);
		v.addLoopRepo(RecordValidator);
		const g = v.get(
			record({
				undef: undefinedType,
				unknown: unknownType,
				any: anyType
			})
		);
		expect(g!({undef: undefined, unknown: 3, any: 3})).toBe(true);
		expect(g!({undef: 3, unknown: 3, any: 3})).toBe(false);
	});
	test("Brand", () => {
		const v = brandRepository.get(brand(Symbol("test")))!;
		expect(v(null)).toBe(false);
	});
	test("Union", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(RecordValidator);
		v.addLoopRepo(AlgebraRepository);

		expect(v.get(PersonOrPet)!(steve)).toBe(true);
		expect(v.get(PersonOrPet)!(dog)).toBe(true);
		expect(v.get(PersonOrPet)!("steve")).toBe(false);
	});
	test("Intersection", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(RecordValidator);
		v.addLoopRepo(AlgebraRepository);

		expect(v.get(PersonAndPet)!(steve)).toBe(false);
		expect(v.get(PersonAndPet)!(dog)).toBe(false);
		expect(v.get(PersonAndPet)!(steveDog)).toBe(true);
	});
	test("Record", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(RecordValidator);

		expect(v.get(Animal)!({legCount: 3, sound: "woof"})).toBe(true);
		expect(v.get(Animal)!({bork: "woof"})).toBe(false);
		expect(v.get(Animal)!({legCount: 3})).toBe(false);
	});
	test("Array", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(GenericValidator);

		expect(v.get(array(numberType))!([1, 2, 3])).toBe(true);
		expect(v.get(array(numberType))!([1, "2", 3])).toBe(false);
		expect(v.get(array(numberType))!(3)).toBe(false);
	});
	test("Map", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(GenericValidator);

		const good = new Map<string, string>();
		good.set("3", "4");
		const bad1 = new Map<number, string>();
		bad1.set(3, "4");
		const bad2 = new Map<string, number>();
		bad2.set("3", 4);

		const setV = v.get(mapType(stringType, stringType))!;
		expect(setV(good)).toBe(true);
		expect(setV(bad1)).toBe(false);
		expect(setV(bad2)).toBe(false);
		expect(setV("3")).toBe(false);
	});
	test("Set", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(GenericValidator);

		const good = new Set<string>();
		good.add("3");
		const bad = new Set<number>();
		bad.add(3);

		const setV = v.get(setType(stringType))!;
		expect(setV(good)).toBe(true);
		expect(setV(bad)).toBe(false);
		expect(setV(3)).toBe(false);
	});
	test("Readonly", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(ReadonlyRepository);
		const roNumGuard = v.get(readonly(numberType))!;
		expect(roNumGuard(3)).toBe(true);
		expect(roNumGuard("3")).toBe(false);
	});
	test("Recursion", () => {
		const v = new GuardChain();
		v.add(defaultGuards);
		v.addLoopRepo(RecordValidator);

		expect(v.get(Person)!(steve)).toBe(true);
	});
	test("Mixed array/object", () => {
		const v = new GuardChain(defaultGuards);
		const recV = new RecordValidator(v);
		const arrV = new GenericValidator(v);
		v.add(recV);
		v.add(arrV);

		const r1 = [true, false];
		const r2 = [false, true, true];
		const r3: boolean[] = [];
		const notR = [3];

		expect(
			v.get(Change)!({before: [r1, r2], after: [r2, r3], change: "good change"})
		).toBe(true);
		expect(
			v.get(Change)!({
				before: [r1, r2],
				after: [notR, r3],
				change: "good change"
			})
		).toBe(false);
		expect(v.get(Change)!(3)).toBe(false);
		expect(v.get(Change)!(null)).toBe(false);
	});
	test("Unvalidatable", () => {
		const v = new GuardChain();
		expect(v.get(Change)).toBeUndefined();
	});
	test("Unsubvalidatable record", () => {
		const v = new GuardChain();
		const recV = new RecordValidator(v);
		v.add(recV);

		expect(v.get(Change)).toBeUndefined();
	});
	test("Unsubvalidatable array", () => {
		const v = new GuardChain();
		const arrV = new GenericValidator(v);
		v.add(arrV);
		expect(v.get(array(numberType))).toBeUndefined();
	});
	test("Unsubvalidatable map", () => {
		const v = new GuardChain();
		const arrV = new GenericValidator(v);
		v.add(arrV);
		expect(v.get(mapType(numberType, numberType))).toBeUndefined();
	});
	test("Unsubvalidatable Set", () => {
		const v = new GuardChain();
		const arrV = new GenericValidator(v);
		v.add(arrV);
		expect(v.get(setType(numberType))).toBeUndefined();
	});
	test("Unsubvalidatable algebra", () => {
		const v = new GuardChain();
		v.add(new AlgebraRepository(v));
		expect(v.get(union(stringType, numberType))).toBeUndefined();
		expect(v.get(intersection(stringType, numberType))).toBeUndefined();
	});
	test("Primitives", () => {
		expect(defaultGuards.get(stringType)!("string")).toBe(true);
		expect(defaultGuards.get(stringType)!(0)).toBe(false);

		expect(defaultGuards.get(numberType)!(3)).toBe(true);
		expect(defaultGuards.get(numberType)!("string")).toBe(false);

		expect(defaultGuards.get(bigintType)!(BigInt(0))).toBe(true);
		expect(defaultGuards.get(bigintType)!(0)).toBe(false);

		expect(defaultGuards.get(boolType)!(false)).toBe(true);
		expect(defaultGuards.get(boolType)!(0)).toBe(false);

		expect(defaultGuards.get(symbolType)!(Symbol("test"))).toBe(true);
		expect(defaultGuards.get(symbolType)!(0)).toBe(false);

		expect(defaultGuards.get(voidType)!(undefined)).toBe(true);
		expect(defaultGuards.get(voidType)!(0)).toBe(false);

		expect(defaultGuards.get(nullType)!(null)).toBe(true);
		expect(defaultGuards.get(nullType)!({})).toBe(false);

		expect(defaultGuards.get(neverType)!("string")).toBe(false);
	});
	test("Cache", () => {
		let callCount = 0;
		const v = new GuardChain();
		v.add({get: <T>() => ++callCount as any});
		expect(v.get(stringType)).toBe(1);
		expect(v.get(stringType)).toBe(2);
		expect(v.get(stringType)).toBe(3);
		const cache = new GuardCache(v);
		expect(cache.get(stringType)).toBe(4);
		expect(cache.get(stringType)).toBe(4);
		expect(cache.get(stringType)).toBe(4);
	});
});
