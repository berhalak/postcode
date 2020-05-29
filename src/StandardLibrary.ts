import { Library, Type, PString, PSymbol, PArray, PEmpty, PNumber, PBool, Scope, PDateTime, PDate } from "./Types";

export class StandardLibrary extends Library {

	STRING(context: Scope, args: Type[]) {
		const value = args[0].valueOf().toString();
		if (!value) return new PEmpty();
		return new PString(value);
	}

	NUMBER(context: Scope, args: Type[]) {
		const value = args[0].valueOf().toString();
		if (!value) return new PEmpty();
		return new PNumber(parseFloat(value));
	}

	BOOL(context: Scope, args: Type[]) {
		const value = args[0].valueOf();
		if (value == "false") return new PBool(false);
		if (value === 0) return new PBool(false);
		return new PBool(!!value);
	}

	COUNT(context: Scope, args: Type[]) {
		if (args.length == 0) return PNumber.ZERO;
		let array = args[0] as PArray;
		if (!array) return PNumber.ZERO;;
		if (array.value.length == 0) return PNumber.ZERO;;
		return new PNumber(array.value.length);
	}

	async MIN(context: Scope, args: Type[]) {
		if (args.length == 0) return PEmpty.EMPTY;
		let array = args[0] as PArray;
		if (!array) return PEmpty.EMPTY;
		if (array.value.length == 0) return PEmpty.EMPTY;
		let init = array.value[0];
		for (let i = 1; i < array.value.length; i++) {
			const next = array.value[i];
			const result = (await init.send(PSymbol._compare, [next])) as PNumber;
			if (result.valueOf() > 0) {
				init = next;
			}
		}
		return init;
	}

	LAST(context: Scope, args: Type[]) {
		if (args.length == 0) return PEmpty.EMPTY;
		let array = args[0] as PArray;
		if (!array) return PEmpty.EMPTY;
		if (array.value.length == 0) return PEmpty.EMPTY;
		let init = array.value[array.value.length - 1];
		return init;
	}

	FIRST(context: Scope, args: Type[]) {
		if (args.length == 0) return PEmpty.EMPTY;
		let array = args[0] as PArray;
		if (!array) return PEmpty.EMPTY;
		if (array.value.length == 0) return PEmpty.EMPTY;
		let init = array.value[0];
		return init;
	}

	async MAX(context: Scope, args: Type[]) {
		if (args.length == 0) return PEmpty.EMPTY;
		let array = args[0] as PArray;
		if (!array) return PEmpty.EMPTY;
		if (array.value.length == 0) return PEmpty.EMPTY;
		let init = array.value[0];
		for (let i = 1; i < array.value.length; i++) {
			const next = array.value[i];
			const result = (await init.send(PSymbol._compare, [next])) as PNumber;
			if (result.valueOf() < 0) {
				init = next;
			}
		}
		return init;
	}

	async CONCAT(context: Scope, args: Type[]) {
		if (args.length == 0) return PString.EMPTY;

		let array = args[0] as PArray;
		if (!array) return PString.EMPTY;
		if (array.value.length == 0) return PString.EMPTY;
		let init = this.STRING(context, [array.value[0]]);
		for (let i = 1; i < array.value.length; i++) {
			init = (await init.send(PSymbol._add, [array.value[i]])) as PString;
		}
		return init;
	}

	async SUM(context: Scope, args: Type[]) {
		if (args.length == 0) return PEmpty.EMPTY;

		let array = args[0] as PArray;
		if (!array) return PEmpty.EMPTY;
		if (array.value.length == 0) return PEmpty.EMPTY;
		let init = array.value[0];
		for (let i = 1; i < array.value.length; i++) {
			init = await init.send(PSymbol._add, [array.value[i]]);
		}
		return init;
	}

	now(context: Scope, args: Type[]) {
		return PDateTime.now(context.clock, context.timezone);
	}

	today(context: Scope, args: Type[]) {
		return PDate.today(context.clock, context.timezone);
	}
}