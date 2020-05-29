import { Compiler } from './Compiler';
const code = `
                var sum = 0;

                each(List){
                        sum = sum + Value;
						Value = 2000-01-01 - 1;
                }

                return sum;

`

const model = {
	Name: 'john',
	List: [
		{ Value: 10 },
		{ Value: 20 }
	]
};

async function run() {
	console.log(await Compiler.eval(code, model));
	console.log(model);
}

run().catch(console.error);