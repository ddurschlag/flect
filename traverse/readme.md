<p align="center">
  <img src="../flect.png" width="200px" align="center" alt="flect logo" />
  <h1 align="center">Flect/traverse</h1>
  <p align="center">
    Data traversal for Flect types
  </p>
</p>

## Introduction

Flect/traverse is a library for building traversals for Flect types.

## Usage

```ts
const Animal = record({
	legCount: numberType,
	sound: stringType
});
type Animal = Reify<typeof Animal>;

const getSound = traverseRecord(Animal, 'sound');
const myDog = { 'legCount': 4, sound: 'woof' };
console.log(getSound(myDog)); // Goes 'woof'
```