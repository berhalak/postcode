import { parse } from "./grammar"
import * as instructions from "./Instructions";
import { Scope, Instruction } from "./Types";
import { StandardLibrary } from './StandardLibrary';

export class Program {

	clock: string;
	timezone: string;

	async run(context: any) {
		const scope = new Scope(context);
		scope.clock = this.clock;
		scope.timezone = this.timezone;

		scope.import(new StandardLibrary());
		return await this.token.eval(scope);
	}

	constructor(private token: Instruction) {

	}
}


export class Compiler {
	static async eval(code: string, context: any = null) {
		const prog = Compiler.compile(code);
		const result = await prog.run(context);
		return result.valueOf();
	}

	static compile(code: string): Program {
		const nodes = parse(code);
		const tokens = Compiler.emit(nodes);
		return new Program(tokens);
	}

	static emit(nodes: any) {
		if (Array.isArray(nodes)) {
			const proper = [];
			for (let item of nodes) {
				proper.push(Compiler.emit(item));
			}
			return proper;
		} else if (nodes && typeof nodes == 'object') {
			const type = nodes.type;
			if (type) {
				const ins = Object.values(instructions).find(x => x.name == type || x.name == `${type}Instruction`);
				if (!ins) {
					throw `Can't find instruction ${type}`
				}
				const instance = new ins();

				for (let key in nodes) {
					if (key == 'type') continue;

					if (!(key in instance)) {
						throw `Instruction ${type} doesn't have property ${key}`
					}
					instance[key] = Compiler.emit(nodes[key]);
				}

				return instance;
			} else {
				for (let key in nodes) {
					nodes[key] = Compiler.emit(nodes[key]);
				}
				return nodes;
			}
		} else {
			return nodes;
		}

	}
}