<p align="center">
  <img src="flect.png" width="200px" align="center" alt="flect logo" />
  <h1 align="center">Flect/guard</h1>
  <p align="center">
	Typeguards for Flect types
  </p>
</p>

## Introduction

Flect/guard is a library for validating that arbitrary JavaScript objects conform to a Flect type.

## Usage

```ts
const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;

const v = new GuardChain();
const recV = new GenericRecordValidator(v);
v.add(defaultGuards);
v.add(recV);

const maybeAnimal: unknown = {legCount: 3, sound: "woof"};
const animalGuard = v.get(Animal)!;
if (animalGuard(maybeAnimal)) {
	console.log(maybeAnimal.sound); // Goes 'woof'
}
```
