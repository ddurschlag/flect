// TODO : need to be able to have value and map at each step for variable arg count!!

class CacheLayer<T> {
	constructor() {
		this._map = new Map();
	}

	getValue() {
		return this._value;
	}

	getChild(key: unknown) {
		let result = this._map.get(key);
		if (result === undefined) {
			result = new CacheLayer<T>();
			this._map.set(key, result);
		}
		return result;
	}

	setValue(value: T) {
		this._value = value;
	}

	private _map: Map<unknown, CacheLayer<T>>;
	private _value?: T;
}

export class MemoizationCache<T> {
	constructor() {
		this._root = new CacheLayer<T>();
	}

	getLayer(...params: unknown[]) {
		let c = this._root;
		for (const p of params) {
			c = c.getChild(p);
		}
		return c;
	}

	memoize<Args extends [...unknown[]]>(
		f: (...args: Args) => T,
		...params: Args
	) {
		const l = this.getLayer(...params);
		let result = l.getValue();
		if (result === undefined) {
			result = f(...params);
			l.setValue(result);
		}
		return result;
	}

	private _root: CacheLayer<T>;
}
