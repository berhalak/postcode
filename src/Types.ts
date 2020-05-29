import { DateTime } from "luxon"

export interface Instruction {
	eval(context: Scope): PromiseLike<Type> | Type;
}

type Future = Promise<Type>;
type Params = Type[];

export class Type {
	async send(method: string, args: Params): Future {

		const copy = [...args];
		const self = this as any;

		if (method == PSymbol._get) {
			const name = (args.shift() as PString).valueOf();
			if (typeof self.get == 'function') {
				return await self.get(name, args);
			}
		}

		if (method == PSymbol._set) {
			const name = (args.shift() as PString).valueOf();
			if (typeof self.set == 'function') {
				return await self.set(name, args);
			}
		}

		if (typeof self[method] == 'function') {
			return await self[method](copy);
		}

		return await this.notFound(method, copy);
	}

	notFound(method: string, args: Type[]): Type {
		throw `Unknown message ${method} on type ${this.constructor.name}`;
	}
}


export class PSymbol {
	public static readonly _break = "break";

	// name of the message for iteration
	public static readonly _iterate = "_iterate";

	// exception
	public static readonly _method_not_found = "_method_not_found";


	// setter message
	public static readonly _set = "_set";
	// getter message
	public static readonly _get = "_get";
	// call message to functions
	public static readonly _call = "_call";

	// operators
	public static readonly _add = "_add";
	public static readonly _div = "_div";
	public static readonly _sub = "_sub";
	public static readonly _mul = "_mul";
	public static readonly _compare = "_compare";
	public static readonly _neg = "_neg";

	public static readonly _isEmpty = "_isEmpty";
	public static readonly _isNotEmpty = "_isNotEmpty";

}

export class Library {
	execute(context: Scope, method: PString | string, args: Type[]) {
		return (this as any)[method.valueOf()](context, args);
	}

	has(method: PString | string) {
		const name = method.valueOf();

		if (name in this) {
			return true;
		}

		return false;
	}
}

export function box(value: any): Type {
	if (value === null || value === undefined || value === '') return PEmpty.EMPTY;
	if (typeof value == 'string') return new PString(value);
	if (typeof value == 'number') return new PNumber(value);
	if (typeof value == 'boolean') return value ? PBool.TRUE : PBool.FALSE;
	if (Array.isArray(value)) return new PArray((value as any[]).map(x => box(x)));
	if (typeof value == 'object') return new BoxedJson(value);
	return PEmpty.EMPTY;
}


export function unbox(value: Type): any {
	return value.valueOf();
}

function isObject(v) {
	return v && typeof v == 'object' && v.constructor != Array;
}

export class BoxedJson extends Type {
	constructor(protected model: any) {
		super();
	}

	async find(name: string): Promise<BoxedJson[]> {
		if (name in this.model) {
			const value = this.model[name];
			if (Array.isArray(value)) {
				return value.map(x => new BoxedJson(x));
			}
			return [new BoxedJson(value)];
		} else {
			for (let key in this.model) {
				const value = this.model[key];
				if (value && Array.isArray(value)) {
					for (let row of value) {
						const boxedRow = new BoxedJson(row);
						const result = await boxedRow.find(name);
						if (result != null) {
							return result;
						}
					}
				}
			}
		}
		return null;
	}

	async _has(name: any): Promise<PBool> {
		if (!this.model) return PBool.FALSE;
		if (name.toString() in this.model) {
			return PBool.TRUE;
		}
		return PBool.FALSE;
	}

	async _get(name: any): Future {
		if (!this.model) return PEmpty.EMPTY
		const value = this.model[name];
		return box(value);
	}

	async _set(name: any, value: Type): Future {
		if (!this.model) return PEmpty.EMPTY

		this.model[name] = unbox(value);
		return value;
	}
}

export class Scope extends Type {

	// public messages to scope
	public static readonly _declare = "_declare";
	clock: string;
	timezone: string;


	constructor(model?: any) {
		super();
		if (model) {
			this.model = model instanceof BoxedJson ? model : new BoxedJson(model);
		}
	}

	private variables = new Map<string, Type>();
	private libs: Library[] = [];
	private parent: Scope;
	private model: BoxedJson = new BoxedJson(null);


	import(lib: Library) {
		this.libs.push(lib);
	}

	async each(name: string) {
		const r = await this.model.find(name);
		return r || [];
	}

	child(model?: any): Scope {
		const child = new Scope(model);
		child.parent = this;
		return child;
	}

	async send(method: string, args: Type[]): Future {

		if (method == Scope._declare) {
			const name = args[0] as PString;
			const value = args[1] as Type;

			if (this.variables.has(name.valueOf())) {
				throw `Variable ${name} is already declared`;
			}

			this.variables.set(name.valueOf(), value);

			return value;
		}

		if (method == PSymbol._set) {
			const name = args[0] as PString;
			const value = args[1] as Type;

			if (!this.variables.has(name.valueOf())) {

				// test this object
				if ((await this.model._has(name)).valueOf()) {
					return this.model._set(name, value);
				}

				if (this.parent) {
					return await this.parent.send(method, args);
				}
				throw `Variable ${name} is not declared`;
			}

			this.variables.set(name.valueOf(), value);
			return value;
		}

		if (method == PSymbol._get) {
			const name = args[0] as PString;
			if (!this.variables.has(name.valueOf())) {

				if ((await this.model._has(name)).valueOf()) {
					return await this.model._get(name);
				}

				if (this.parent) {
					return await this.parent.send(method, args);
				}
				return new PEmpty();
			}
			return this.variables.get(name.valueOf());
		}

		if (method) {
			const name = method;
			if (this.variables.has(name.valueOf())) {
				const value = this.variables.get(name.valueOf());
				return await value.send(PSymbol._call, args);
			}
			for (let lib of this.libs) {
				if (await lib.has(name)) {
					return await lib.execute(this, name, args);
				}
			}
			if (this.parent) {
				return await this.parent.send(method, args);
			}
			throw PSymbol._method_not_found;
		}

		return super.send(method, args);
	}
}

export class PEmpty extends Type {

	static readonly EMPTY = new PEmpty();

	_isEmpty() {
		return new PBool(true);
	}

	notFound() {
		return this;
	}
}

export class PNumber extends Type {
	constructor(private value: number) {
		super();
	}

	static readonly ONE = new PNumber(1);
	static readonly ZERO = new PNumber(0);
	static readonly MINUS_ONE = new PNumber(-1);

	[PSymbol._add]([b]: Type[]) {
		if (b instanceof PString) {
			return new PString(this.valueOf().toString() + b.valueOf().toString());
		} else {
			return new PNumber(this.value + (b as PNumber).value);
		}
	}

	[PSymbol._sub]([b]: PNumber[]) {
		return new PNumber(this.value - b.value);
	}

	[PSymbol._div]([b]: PNumber[]) {
		return new PNumber(this.value / b.value);
	}

	[PSymbol._mul]([b]: PNumber[]) {
		return new PNumber(this.value * b.value);
	}

	[PSymbol._compare]([second]: PNumber[]) {
		const b = second.value;
		const a = this.value;

		return a == b ? PNumber.ZERO :
			a > b ? PNumber.ONE :
				PNumber.MINUS_ONE;
	}

	[PSymbol._isEmpty]() {
		return PBool.FALSE;
	}

	valueOf() {
		return Math.round(this.value * 100) / 100;
	}
}

export class PObject extends Type {
	constructor() {
		super();
	}

	private state = new Map<string, Type>();

	[PSymbol._isEmpty]() {
		return PBool.FALSE;
	}

	set(name: string, [value]: Type[]) {
		this.state.set(name, value);
		return value;
	}

	get(name: string) {
		return this.state.get(name) ?? PEmpty.EMPTY;
	}

	valueOf() {
		const result = {};
		for (let entry of this.state) {
			result[entry[0]] = entry[1].valueOf();
		}
		return result;
	}
}

export class PString extends Type {
	constructor(private value: string) {
		super();
	}

	public static readonly EMPTY = new PString("");

	async send(method: string, args: Type[]): Future {
		if (method == PSymbol._add) {
			const b = args[0] as PString;
			return new PString(this.value + b.value);
		}
		if (method == "toUpper") {
			return new PString(this.value.toUpperCase());
		}
		if (method == "toLower") {
			return new PString(this.value.toLowerCase());
		}
		if (method == "length") {
			return new PNumber(this.value.length);
		}

		if (method == PSymbol._isEmpty) return this.value ? new PBool(false) : new PBool(true);

		return super.send(method, args);
	}

	_compare([arg]: Type[]) {
		const b = arg.toString();
		if (this.value > b) return PNumber.ONE;
		if (this.value < b) return PNumber.MINUS_ONE;
		return PNumber.ZERO;
	}

	valueOf() {
		return this.value;
	}

	toString() {
		return this.value;
	}
}

export class PArray extends Type {
	constructor(public value: Type[]) {
		super();
	}

	async send(method: string, args: Type[]): Future {

		if (method == PSymbol._iterate) {
			const arrow = args[0] as PArrow;
			let last: Type = null;
			for (let value of this.value) {
				try {
					last = await arrow.send(PSymbol._call, [value]);
				} catch (e) {
					if (e == "break") {
						break;
					}
					throw e;
				}
			}
			return last;
		}

		if (method == PSymbol._get) {
			const index = (args[0] as PNumber).valueOf();
			return this.value[index];
		}

		if (method == PSymbol._set) {
			const index = (args[0] as PNumber).valueOf();
			return this.value[index] = args[1];
		}

		return await super.send(method, args);
	}

	length() {
		return new PNumber(this.value.length);
	}

	valueOf() {
		return this.value.map(x => x.valueOf());
	}
}

export class PBool extends Type {
	constructor(private value: boolean) {
		super();
	}

	static TRUE = new PBool(true);
	static FALSE = new PBool(false);

	async send(method: string, args: Type[]): Future {
		if (method == "or") {
			const b = args[0] as PBool;
			return new PBool(this.value || b.value);
		}
		if (method == "and") {
			const b = args[0] as PBool;
			return new PBool(this.value && b.value);
		}
		if (method == PSymbol._neg) {
			return new PBool(!this.value);
		}
		return await super.send(method, args);
	}

	valueOf() {
		return this.value;
	}
}

export class PArrow extends Type {
	constructor(private argsNames: string[], private block: Instruction, private scope: Scope) {
		super();
	}


	async send(method: string, args: Type[]) {
		if (method == PSymbol._call) {
			const child = this.scope.child() as Scope;
			for (let i = 0; i < args.length; i++) {
				const name = this.argsNames[i];
				const value = args[i];
				child.send(Scope._declare, [new PString(name), value]);
			}
			return await this.block.eval(child);
		}
		return await super.send(method, args);
	}
}

export class PDate extends Type {
	static today(clock?: string, timezone?: string) {
		return new PDate(clock || DateTime.local().toISODate(), timezone);
	}

	constructor(private value: string, private timezone: string) {
		super();
		this.value = this.value.substr(0, 10);
	}

	valueOf() {
		return this.value;
	}

	_sub(args: Type[]): Type {
		let first = args.shift();
		if (first instanceof PNumber) {
			const lux = DateTime.fromISO(this.value);
			const shift = lux.plus({ day: -first.valueOf() });
			return new PDate(shift.toISODate(), this.timezone);
		}
		if (first instanceof PDateTime) {
			first = new PDate(first.valueOf(), this.timezone);
		}
		if (first instanceof PDate) {
			const lux = DateTime.fromISO(this.value);
			const days = lux.diff(DateTime.fromISO(first.value), 'days');
			return new PNumber(days.days);
		}

		return PEmpty.EMPTY;
	}

	start() {
		const lux = DateTime.fromISO(this.value);
		return new PDateTime(lux.startOf('day').toUTC().toISO(), this.timezone);
	}

	end() {
		const lux = DateTime.fromISO(this.value);
		return new PDateTime(lux.endOf('day').toUTC().toISO(), this.timezone);
	}

	_compare(args: Type[]): Type {
		let first = args.shift();

		if (first instanceof PDateTime) {
			first = new PDate(first.valueOf(), this.timezone);
		}

		return this.value > first.valueOf() ? PNumber.ONE :
			this.value < first.valueOf() ? PNumber.MINUS_ONE : PNumber.ZERO;
	}

	_add(args: Type[]): Type {
		const first = args.shift();
		if (first instanceof PNumber) {
			return new PDate(DateTime.fromISO(this.value).plus({ day: first.valueOf() }).toISODate(), this.timezone);
		}
		return PEmpty.EMPTY;
	}
}

export class PDateTime extends Type {
	static now(clock?: string, timezone?: string) {
		return new PDateTime(clock || DateTime.utc().toISO(), timezone);
	}

	constructor(private value: string, private timezone: string) {
		super();
	}

	_sub(args: Type[]): Type {
		const first = args.shift();
		if (first instanceof PNumber) {
			const lux = DateTime.fromISO(this.value);
			const shift = lux.plus({ day: -first.valueOf() });
			return new PDateTime(shift.toISO(), this.timezone);
		}
		if (first instanceof PDateTime) {
			const lux = DateTime.fromISO(this.value).startOf('day');
			const days = lux.diff(DateTime.fromISO(first.value).startOf('day'), 'days');
			return new PNumber(days.days);
		}
		if (first instanceof PDate) {
			const lux = DateTime.fromISO(this.value).startOf('day');
			const days = lux.diff(DateTime.fromISO(first.valueOf()).startOf('day'), 'days');
			return new PNumber(days.days);
		}
		return PEmpty.EMPTY;
	}

	date() {
		return new PDate(this.value, this.timezone);
	}

	_compare(args: Type[]): Type {
		let b = args.shift();
		let a = this as any;

		if (b instanceof PDate) {
			a = new PDate(this.value, this.timezone);
		}

		return a.value > b.valueOf() ? PNumber.ONE :
			a.value < b.valueOf() ? PNumber.MINUS_ONE : PNumber.ZERO;
	}


	_add(args: Type[]): Type {
		const first = args.shift();
		if (first instanceof PNumber) {
			return new PDateTime(DateTime.fromISO(this.value).plus({ day: first.valueOf() }).toISO(), this.timezone);
		}
		return PEmpty.EMPTY;
	}

	valueOf() {
		return this.value;
	}
}