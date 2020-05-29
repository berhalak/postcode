import { Type, PNumber, PString, PBool, PArray, PSymbol, Scope, Instruction, PArrow, PObject, PEmpty, PDate, PDateTime } from "./Types";

export class BlockInstruction implements Instruction {
	async eval(context: Scope) {
		let last = null;
		for (let i of this.lines) {
			last = await i.eval(context);
		}
		return last;
	}
	lines: Instruction[] = [];
}


export class NumberInstruction implements Instruction {
	eval(context: Scope): Type {
		return new PNumber(this.value);
	}
	value: number = null;
}

export class StringInstruction implements Instruction {
	eval(context: Scope): Type {
		return new PString(this.value);
	}
	value: string = null;
}

export class DateInstruction implements Instruction {
	eval(context: Scope): Type {
		return new PDate(this.value, context.timezone);
	}
	value: string = null;
}

export class DateTimeInstruction implements Instruction {
	eval(context: Scope): Type {
		return new PDateTime(this.value, context.timezone);
	}
	value: string = null;
}

export class NestInstruction implements Instruction {
	eval(context: Scope) {
		return this.value.eval(context);
	}
	value: Instruction = null;
}

export class TrueInstruction implements Instruction {
	eval(context: Scope): Type {
		return new PBool(true);
	}
}

export class FalseInstruction implements Instruction {
	eval(context: Scope): Type {
		return new PBool(false);
	}
}

export class NegationInstruction implements Instruction {
	async eval(context: Scope) {
		return await (await this.value.eval(context)).send(PSymbol._neg, []);
	}
	value: Instruction = null;
}

export class WhenInstruction implements Instruction {
	async eval(context: Scope) {
		const value: Type = await this.test.eval(context);
		if (value.valueOf()) {
			return await this.ok.eval(context);
		}
		return await this.fail.eval(context);
	}
	test: Instruction = null;
	ok: Instruction = null;
	fail: Instruction = null;
}

export class IfInstruction implements Instruction {
	async eval(context: Scope) {
		const value: Type = await this.test.eval(context);
		if (value.valueOf()) {
			return await this.ok.eval(context);
		}
		return await this.fail?.eval(context);
	}
	test: Instruction = null;
	ok: Instruction = null;
	fail: Instruction = null;
}

export class ArrayInstruction implements Instruction {
	async eval(context: Scope) {
		return new PArray(await Promise.all(this.list.map(x => x.eval(context))));
	}
	list: Instruction[] = []
}

type Operator = { operator: string, value: Instruction };

export class MathInstruction implements Instruction {
	async eval(context: Scope) {
		let first = await this.init.eval(context);

		for (let next of this.list) {
			const message = next.operator;
			const self = first;
			const arg = await next.value.eval(context);

			let symbol = "";
			switch (message) {
				case "+": symbol = PSymbol._add; break;
				case "-": symbol = PSymbol._sub; break;
				case "/": symbol = PSymbol._div; break;
				case "*": symbol = PSymbol._mul; break;
			}

			first = await self.send(symbol, [arg]);
		}

		return first;
	}


	private init: Instruction = null;
	private list: Operator[] = null;
}

export class AndInstruction implements Instruction {
	async eval(context: Scope) {
		let first = await this.init.eval(context);

		for (let next of this.list) {
			const message = next.operator;
			const self = first;
			const arg = await next.value.eval(context);
			first = await self.send(message, [arg]);

			if (!first.valueOf()) {
				break;
			}
		}

		return first;
	}


	private init: Instruction = null;
	private list: Operator[] = null;
}

export class OrInstruction implements Instruction {
	async eval(context: Scope) {
		let first: Type = await this.init.eval(context);

		for (let next of this.list) {
			const message = next.operator;
			const self = first;
			const arg: Type = await next.value.eval(context);
			first = await self.send(message, [arg]);

			if (first.valueOf()) {
				break;
			}
		}

		return first;
	}


	private init: Instruction = null;
	private list: Operator[] = null;
}


export class CompareInstruction implements Instruction {
	async eval(context: Scope) {
		const first: Type = await this.a.eval(context);
		const second: Type = await this.b.eval(context);
		const result = ((await first.send(PSymbol._compare, [second])) as PNumber).valueOf();

		switch (this.operator) {
			case "==": return new PBool(result == 0);
			case ">": return new PBool(result == 1);
			case "<": return new PBool(result == -1);
			case "<=": return new PBool(result <= 0);
			case ">=": return new PBool(result >= 0);
			case "!=": return new PBool(result != 0);
			default: throw `Unknown operator ${this.operator}`;
		}
	}
	a: Instruction = null;
	b: Instruction = null;
	operator = '==';
}

export class VariableInstruction implements Instruction {
	async eval(context: Scope) {
		const value = await this.value.eval(context);
		await context.send(Scope._declare, [new PString(this.name), value]);
		return value;
	}

	name = '';
	value: Instruction = null;
}

export class ReturnInstruction implements Instruction {
	async eval(context: Scope) {
		return await this.value?.eval(context);
	}
	value: Instruction = null;
}

type IdType = { id?: string, title?: string };

export class AssignmentInstruction implements Instruction {
	async eval(context: Scope) {
		return await context.send(PSymbol._set, [new PString(this.id), await this.value.eval(context)]);
	}

	value: Instruction = null;
	id: string = "";
}

export class BreakInstruction implements Instruction {
	eval(context: Scope): Type {
		throw PSymbol._break;
	}
}

type Member = { name: string, value: Instruction }

export class ObjectInstruction implements Instruction {
	async eval(context: Scope) {
		const obj = new PObject();
		await Promise.all(this.members.map(async m => {
			const value = await m.value.eval(context);
			await obj.send(PSymbol._set, [new PString(m.name), value]);
		}));
		return obj;
	}
	members: Member[] = [];
}

export class ScopeInstruction implements Instruction {
	eval(context: Scope): Type {
		return context;
	}
}

export class GetInstruction implements Instruction {
	async eval(context: Scope) {
		const args = await Promise.all(this.args.map(x => x.eval(context)));
		const target = args.shift();
		return await target.send(PSymbol._get, args);
	}
	args: Instruction[] = [];

}

export class SetInstruction implements Instruction {
	async eval(context: Scope) {
		const args = this.args.map(x => x.eval(context));
		const target = await args.shift();
		return await target.send(PSymbol._set, await Promise.all(args));
	}

	args: Instruction[] = [];
}

export class CallInstruction implements Instruction {
	async eval(context: Scope) {
		const args = this.args.map(x => x.eval(context));
		const target = await args.shift();
		const message = ((await args.shift()) as PString).valueOf();

		// is empty hack

		if (message == PSymbol._isNotEmpty) {
			const result = await target.send(PSymbol._isEmpty, await Promise.all(args)) as PBool;
			return await result.send(PSymbol._neg, []);
		}

		return await target.send(message.valueOf(), await Promise.all(args));
	}
	args: Instruction[] = [];
}


export class ForInstruction implements Instruction {
	async eval(context: Scope) {
		const list = await this.list.eval(context);
		const fun = new PArrow([this.iterator], this.block, context);
		return await list.send(PSymbol._iterate, [fun]);
	}
	iterator = '';
	list: Instruction = null;
	block: Instruction = null;
}

export class GeneratorInstruction implements Instruction {
	async eval(context: Scope) {
		const from = (await this.from.eval(context)) as PNumber;
		const to = (await this.to.eval(context)) as PNumber;
		const numbers: PNumber[] = [];
		for (var i = from.valueOf(); i <= to.valueOf(); i++) {
			numbers.push(new PNumber(i));
		}
		return new PArray(numbers);
	}
	from: Instruction = null;
	to: Instruction = null;
}


export class FunctionInstruction implements Instruction {
	eval(context: Scope) {
		return context.send(Scope._declare, [
			new PString(this.name),
			new PArrow(this.args, this.block, context)
		])
	}
	block: Instruction = null;
	name = '';
	args: string[] = [];
}

export class EachInstruction implements Instruction {

	async eval(context: Scope) {
		const objects: Type[] = await context.each(this.self);
		let last: Type = PEmpty.EMPTY;
		for (let obj of objects) {
			const sub = context.child(obj);
			last = await this.block.eval(sub);
		}
		return last;
	}

	self = '';
	block: Instruction = null;
}

export class TranslateInstruction implements Instruction {
	async eval(context: Scope) {
		return new PString(this.title);
	}

	title = '';
}