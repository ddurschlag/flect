import {
	record,
	numberType,
	stringType,
	Reify,
	Type,
	array,
	setType,
	tuple,
	mapType,
	intersection,
	RecordType,
	literal,
	union
} from "@flect/core";
import {
	CachedTransformer,
	ChainTransformer,
	IdentityTransformer,
	IterableTransformer,
	RecordTransformer,
	TransformerRepository,
	TupleTransformer,
	getDefaultTransformerRepository,
	getSingletonTransformerRepository
} from "@flect/transform";

const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;
const myDog: Animal = {legCount: 4, sound: "woof"};
const Person = record({
	pet: Animal
});
type Person = Reify<typeof Person>;

describe("@flect/transform", () => {
	test("Identity", () => {
		const t = new IdentityTransformer().get(
			Person,
			record({pet: record({legCount: numberType, sound: stringType})})
		);
		expect(t).toBeDefined();
		const p: Person = {pet: myDog};
		expect(t!(p)).toBe(p);
	});
	test("Identity intersection", () => {
		const PetWithAPet = intersection(Animal, Person);
		const t = new IdentityTransformer().get(PetWithAPet, Animal);
		expect(t).toBeDefined();
		expect(new IdentityTransformer().get(PetWithAPet, Person)).toBeDefined();
		const catWithDogPet = {legCount: 4, sound: "meow", pet: myDog};
		expect(t!(catWithDogPet)).toBe(catWithDogPet);
	});
	test("Identity union", () => {
		const PetOrPerson = union(Animal, Person);
		const t = new IdentityTransformer().get(Animal, PetOrPerson);
		expect(t).toBeDefined();
		expect(new IdentityTransformer().get(Person, PetOrPerson)).toBeDefined();
		expect(t!(myDog)).toBe(myDog);
	});
	describe("Iterable", () => {
		test("Array to set", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(IterableTransformer);
			const t = c.get(array(numberType), setType(numberType));
			expect(t).toBeDefined();
			const s = t!([1, 2]);
			expect(s.size).toBe(2);
			expect(s.has(1)).toBe(true);
		});
		test("Set to array", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(IterableTransformer);
			const t = c.get(setType(numberType), array(numberType));
			expect(t).toBeDefined();
			const a = t!(new Set([1, 2]));
			expect(a.length).toBe(2);
			expect(a[0]).toBe(1);
			expect(a[1]).toBe(2);
		});
		test("Array to map", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(IterableTransformer);
			const t = c.get(
				array(tuple(stringType, numberType)),
				mapType(stringType, numberType)
			);
			expect(t).toBeDefined();
			const m = t!([
				["foo", 3],
				["bork", 4]
			]);
			expect(m.get("foo")).toBe(3);
		});
		test("Not iterable", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(IterableTransformer);
			expect(c.get(Animal, Person)).toBeUndefined();
		});
		test("Inner type mismatch", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(IterableTransformer);
			expect(c.get(array(numberType), array(stringType))).toBeUndefined();
		});
	});
	describe("Tuple", () => {
		test("Array to tuple", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			const t = c.get(array(numberType), tuple(numberType, numberType));
			expect(t).toBeDefined();
			const tup = t!([1, 2]);
			expect(tup[0]).toBe(1);
			expect(tup[1]).toBe(2);
		});
		test("Tuple to tuple", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			let t = c.get(
				tuple(stringType, numberType),
				tuple(numberType, numberType)
			);
			expect(t).toBeUndefined();
			c.add({
				get: (from, to) => {
					if (from === stringType && to === numberType) {
						return ((s: string) => s.length) as unknown as any;
					}
					return undefined;
				}
			});
			t = c.get(tuple(stringType, numberType), tuple(numberType, numberType));
			expect(t).toBeDefined();
			expect(t!(["3", 3])).toEqual([1, 3]);
		});
		test("Tuple to map", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			// This is a strange one. Each tuple element is transformed
			let t = c.get(
				tuple(stringType, numberType),
				mapType(numberType, stringType)
			);
			expect(t).toBeUndefined();
			c.add({
				get: (from, to) => {
					if (
						from === stringType &&
						(to as unknown) === tuple(numberType, stringType)
					) {
						return ((s: string) => [parseFloat(s), s] as const) as any;
					}
					if (
						from === numberType &&
						(to as unknown) === tuple(numberType, stringType)
					) {
						return ((n: number) => [n, n.toString()] as const) as any;
					}
					return undefined;
				}
			});
			t = c.get(tuple(stringType, numberType), mapType(numberType, stringType));
			expect(t).toBeDefined();
			const result = t!(["3", 4]);
			expect(result.get(3)).toBe("3");
			expect(result.get(4)).toBe("4");
			expect(result.get(0)).toBeUndefined();
		});
		test("Not enough data", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			c.add({
				get: (from, to) => {
					if (from === stringType && to === numberType) {
						return ((s: string) => s.length) as unknown as any;
					}
					return undefined;
				}
			});
			expect(
				c.get(tuple(stringType, stringType), tuple(numberType, numberType))
			).toBeDefined();
			expect(
				c.get(
					tuple(stringType, stringType, stringType),
					tuple(numberType, numberType)
				)
			).toBeDefined();
			expect(
				c.get(tuple(stringType), tuple(numberType, numberType))
			).toBeUndefined();
		});
		test("Tuple to array", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			const t = c.get(tuple(stringType, stringType), array(stringType));
			expect(t).toBeDefined();
			expect(t!(["foo", "bar"])).toEqual(["foo", "bar"]);
		});
		test("Tuple to set", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			const t = c.get(tuple(stringType, stringType), setType(stringType));
			expect(t).toBeDefined();
			expect(t!(["foo", "bar"])).toEqual(new Set(["foo", "bar"]));
		});
		test("Tuple to scalar doesn't work", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			expect(c.get(tuple(stringType, stringType), stringType)).toBeUndefined();
		});
		test("Iterable to tuple of unknown type doesn't work", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			expect(
				c.get(array(numberType), tuple(numberType, stringType))
			).toBeUndefined();
		});
		test("Iterable too short for tuple", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			c.add({
				get: (from, to) => {
					if (from === stringType && to === numberType) {
						return ((s: string) => s.length) as unknown as any;
					}
					return undefined;
				}
			});
			const t = c.get(array(stringType), tuple(stringType, numberType));
			expect(t).toBeDefined();
			expect(() => t!(["foo"])).toThrow();
		});
		test("Set to tuple", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			const t = c.get(setType(stringType), tuple(stringType, stringType));
			expect(t).toBeDefined();
			expect(t!(new Set(["foo", "bar"]))).toEqual(["foo", "bar"]);
			expect(() => t!(new Set(["foo"]))).toThrow();
		});
		test("Map to tuple", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			const t = c.get(
				mapType(stringType, numberType),
				tuple(tuple(stringType, numberType), tuple(stringType, numberType))
			);
			expect(t).toBeDefined();
			expect(
				t!(
					new Map([
						["foo", 3],
						["bar", 4]
					])
				)
			).toEqual([
				["foo", 3],
				["bar", 4]
			]);
			expect(() => t!(new Map([["foo", 3]]))).toThrow();
		});
		test("Tuple doesn't do iterable to iterable", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			expect(c.get(array(numberType), setType(numberType))).toBeUndefined();
		});
		test("Fan out from scalar", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(TupleTransformer);
			const t = c.get(stringType, tuple(stringType, stringType));
			expect(t).toBeDefined();
			expect(t!("foo")).toEqual(["foo", "foo"]);
		});
	});
	test("Caching", () => {
		const c = new CachedTransformer(new IdentityTransformer());
		expect(c.get(numberType, numberType)).toBe(c.get(numberType, numberType));
	});
	test("Nesting", () => {
		const c = new ChainTransformer();
		c.add(
			getSingletonTransformerRepository(stringType, numberType, (s) => s.length)
		);
		c.add(new IdentityTransformer());
		c.addLoopRepo(RecordTransformer);
		c.addLoopRepo(IterableTransformer);

		const t = c.get(
			record({myData: array(stringType)}),
			record({myData: array(numberType)})
		);
		expect(t).toBeDefined();
		const transformed = t!({myData: ["a", "ab"]});
		expect(transformed.myData).toEqual([1, 2]);
	});
	describe("Record", () => {
		test("Add prop", () => {
			const c = new ChainTransformer(new IdentityTransformer());
			c.addLoopRepo(RecordTransformer);
			c.add(getDefaultTransformerRepository(stringType, "moo"));

			const QuietAnimal = record({legCount: numberType});
			const t = c.get(QuietAnimal, Animal);
			expect(t).toBeDefined();
			const quietCow = {legCount: 4};
			const cow = t!(quietCow);
			expect(cow.legCount).toBe(4);
			expect(cow.sound).toBe("moo");
		});
		test("Remove prop", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(RecordTransformer);
			const t = c.get(Animal, record({}));
			expect(t).toBeDefined();
			expect(t!(myDog)).toEqual({});
		});
		test("Failure", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(RecordTransformer);

			const QuietAnimal = record({legCount: numberType});
			expect(c.get(QuietAnimal, Animal)).toBeUndefined();
		});
		test("Object summarizing", () => {
			// Create a transformer repo that, when going from
			// a record to a number, uses the number of fields in the record.
			// This lets us fill in number fields on a target record.
			const fieldCounter: TransformerRepository = {
				get: (t, u) => {
					if (t instanceof RecordType && u === numberType) {
						return (input) => t.properties.length as any;
					}
					return undefined;
				}
			};
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(RecordTransformer);
			c.add(fieldCounter);
			const FloatingAnimal = record({sound: stringType});
			const t = c.get(FloatingAnimal, Animal);
			expect(t).toBeDefined();
			const floatingHopper = {sound: "boing!"};
			const hopper = t!(floatingHopper);
			expect(hopper.sound).toBe("boing!");
			expect(hopper.legCount).toBe(1); // incoming record had just the one field
		});
		test("Property mismatch", () => {
			const c = new ChainTransformer();
			c.add(new IdentityTransformer());
			c.addLoopRepo(RecordTransformer);
			expect(
				c.get(record({field: numberType}), record({field: stringType}))
			).toBeUndefined();
		});
	});

	test("Hydration", () => {
		// A more practical test. Given a type with references to another type,
		// create a keyed version that looks like an FK in a DB. Then transform
		// from that DB version to the real thing.
		const Engine = record({
			cylinderCount: numberType,
			arrangement: union(literal("L"), literal("V"), literal("W")),
			id: stringType
		});
		type Engine = Reify<typeof Engine>;
		// A mapped conditional would be neat here, but flect currently
		// can't handle that :(
		const makeCarType = <E>(engineType: Type<E>) =>
			record({
				make: stringType,
				model: stringType,
				engine: engineType
			});
		// Our two car types: one flat (as if from a DB) and one
		// with a direct reference to its engine object
		const DBCar = makeCarType(stringType);
		const Car = makeCarType(Engine);
		type DBCar = Reify<typeof DBCar>;

		// Create a little in-memory mock of a database table (or service, etc.)
		// with engine data.
		const indexEngine = (e: Engine) => [e.id, e] as const;
		const engineDb = new Map(
			[
				{cylinderCount: 4, arrangement: "L" as const, id: "straight-4"},
				{cylinderCount: 6, arrangement: "V" as const, id: "V6"},
				{cylinderCount: 16, arrangement: "W" as const, id: "W16"}
			].map(indexEngine)
		);

		// Create a transformer that handles identity,
		// records, and engineDb looksup. We assume
		// lookups never fail, for simplicity.
		const c = new ChainTransformer();
		c.add(new IdentityTransformer());
		c.addLoopRepo(RecordTransformer);
		c.add(
			getSingletonTransformerRepository(
				stringType,
				Engine,
				(id) => engineDb.get(id)!
			)
		);
		// Get the transformer
		const t = c.get(DBCar, Car);
		expect(t).toBeDefined();

		// Create a flat car record
		const carRecord: DBCar = {
			make: "Honda",
			model: "Pilot",
			engine: "V6"
		};
		// Transform it
		const car = t!(carRecord);
		// Verify everything worked
		expect(car.make).toBe("Honda");
		expect(car.engine.arrangement).toBe("V");
		expect(car.engine.cylinderCount).toBe(6);
	});
});
