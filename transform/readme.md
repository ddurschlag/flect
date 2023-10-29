<p align="center">
  <img src="flect.png" width="200px" align="center" alt="flect logo" />
  <h1 align="center">Flect/transform</h1>
  <p align="center">
	Data transformers for Flect types
  </p>
</p>

## Introduction

Flect/transform is a library for building transformers between flect types.

## Usage

```ts
// Given a type with references to another type,
// create a keyed version that looks like an FK in a DB. Then transform
// from that DB version to the real thing.

// First, the type we will refer/foreign-key to
const Engine = record({
	cylinderCount: numberType,
	arrangement: union(literal("L"), literal("V"), literal("W")),
	id: stringType
});
type Engine = Reify<typeof Engine>;

// Next the two versions of the referring type: one flat like a database,
// one with a direct reference.
// A mapped conditional would be neat here, but flect currently
// can't handle that :( Instead, we create a function for producing the
// two types.
const makeCarType = <E>(engineType: Type<E>) =>
	record({
		make: stringType,
		model: stringType,
		engine: engineType
	});
// Our two car types, each with their own way of specifying an engine
const DBCar = makeCarType(stringType); // By key
const Car = makeCarType(Engine); // By reference
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
console.log(JSON.stringify(car));
/*
		Output:
			{
				"make": "Honda",
				"model": "Pilot",
				"engine": {"cylinderCount": 6, "arrangement": "V", "id": "V6"}
			}
	*/
```
