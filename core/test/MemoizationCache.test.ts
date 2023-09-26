import {MemoizationCache} from "@flect/core/MemoizationCache";

describe("MemoizationCache", () => {
	test("Overlap", () => {
		const c = new MemoizationCache();
		const a = Symbol("a");
		const b = Symbol("b");
		c.getLayer(1).setValue(a);
		c.getLayer(1, 2).setValue(b);
		expect(c.getLayer(1).getValue()).toBe(a);
		expect(c.getLayer(1, 2).getValue()).toBe(b);
	});
});
