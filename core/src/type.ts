const reifiableIdSymbol = Symbol("reifiable-id");
export type ReifiableId = number & {
	[reifiableIdSymbol]: typeof reifiableIdSymbol;
};
let reifiableId = 0;
export function getRefiaibleId() {
	return reifiableId++ as ReifiableId;
}

export const sortOrder = Symbol("sort-order");
export class ReifiableIdentified {
	constructor() {
		this[reifiableIdSymbol] = getRefiaibleId();
	}

	public [sortOrder](other: ReifiableIdentified) {
		return this[reifiableIdSymbol] - other[reifiableIdSymbol];
	}

	private [reifiableIdSymbol]: ReifiableId;
}

export const MakeType = Symbol("make-type");
export class Type<Reflected = unknown> extends ReifiableIdentified {
	protected constructor() {
		super();
		this._refl = undefined as Reflected;
	}

	public static [MakeType]<T>() {
		return new Type<T>();
	}

	// Would be great to do this some day, but TS' alias preservation
	// specifically doesn't work on aliases reified by flect :(
	// public composeAs<T extends Reflected>(): Reflected extends T
	// 	? Type<T>
	// 	: never {
	// 	return this as unknown as any;
	// }

	protected readonly _refl!: Reflected;
}
