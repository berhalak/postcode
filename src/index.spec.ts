import { Compiler } from './Compiler';


async function test(code: string, should: any = undefined) {
	if (should === undefined) should = code;


	const prog = Compiler.compile(code);

	prog.timezone = "Europe/London";
	prog.clock = "2000-10-10T10:10:10.000Z";

	const val = (await prog.run(null)).valueOf();

	if (val != should && JSON.stringify(val) != JSON.stringify(should)) {
		expect(val).toStrictEqual(should);
	} else {
		expect(val).toStrictEqual(should);
	}
}
function run(code: string, should: any = undefined) {
	it(code, async () => {
		await test(code, should);
	})
}

function res(code: string, data: any, should: any = undefined) {
	it(code, async () => {
		if (should === undefined) should = code;
		const prog = Compiler.compile(code);

		prog.timezone = "Europe/London";
		prog.clock = "2000-10-10T10:10:10.000Z";

		const val = (await prog.run(data)).valueOf();
		if (val != should && JSON.stringify(val) != JSON.stringify(should)) {
			console.error(`[FAIL] ${code} should produce ${should} but ${val} found`);
			expect(val).toStrictEqual(should);
		} else {
			expect(val).toStrictEqual(should);
		}
	})
}

describe('Expressions', () => {
	run("2", 2);
	run("2 + 2", 4);
	run("2 / 2 + 7", 2 / 2 + 7);
	run("2 * 2 + 7", 2 * 2 + 7);
	run("'a' + 'b'", "ab")
	run("true", true)
	run("false", false)
	run("true or false", true);
	run("false or true", true);
	run("false or false", false);
	run("false or false or true", true);
	run("true and true", true);
	run("true and true and false", false);
	run("false and true and true", false);
	run("false or true and true", true);
	run("true and false", false);
	run("[1, 2, 3]", [1, 2, 3]);
	run("[1, 2, 3]", [1, 2, 3]);
	run("2000-01-01");
	run("2000-01-01T11:11:23Z");
});

describe('Types', () => {

	it("Number", async () => {
		await test("2", 2);
	});

	it("String", async () => {
		await test('"a"', "a");
	});

	it("Math add", async () => {
		await test("1 + 2", 3);
	});

	it("Math sub", async () => {
		await test("3 - 2", 1);
	});

	it("Math div", async () => {
		await test("4 / 2", 2);
	});

	it("Math mul", async () => {
		await test("2 * 3", 6);
	});

});


describe('Math', () => {

	it("Math add", async () => {
		await test("1 + 2", 3);
	});

	it("Math sub", async () => {
		await test("3 - 2", 1);
	});

	it("Math div", async () => {
		await test("4 / 2", 2);
	});

	it("Math mul", async () => {
		await test("2 * 3", 6);
	});



	it("Math various", async () => {
		await test("1 + -2", -1);
		await test("1 * 1", 1);
		await test("1 * 2", 2);
		await test("6 / 2", 3);
		await test("2 / 2", 1);
		await test("2 - 2", 0);
		await test("2 - 1", 1);
		await test("1 - 2", -1);
		await test("10 - 2", 8);
	});



	it("Math simple multiple operands", async () => {
		await test("1 + 1 + 1 +   1 + 1", 5);
		await test("1 * 2 * 3 * 5 * 6", 1 * 2 * 3 * 5 * 6);
		await test("10 - 5 - 2 - 2 - 1", 0);
	});


	it("Simple math", async () => {
		await test("2 + 2", 4);
		await test("2 - 2", 0);
		await test("2 * 2", 4);
		await test("2 / 2", 1);
	});


	it("Rounding", async () => {
		await test("2 * 2 / 2 / 3", 0.67);
	});

	it("Extended math", async () => {
		await test("2 + 2 + 2 + 2", 8);
		await test("2 - 2 - 2 - 2", -4);
	});

	it("Floating point", async () => {
		await test("1.5 + 1.5", 3);
		await test("2 - 1.5 - 0.5", 0);
		await test("2 * 1.2", 2 * 1.2);
	});


	it("Math with parentis", async () => {
		await test("2 + 2 + (2 + 2)", 2 + 2 + (2 + 2));
		await test("2 - (2 - 2) - 2", 2 - (2 - 2) - 2);
		await test("2 * (2 / 2) / 3", 0.67);
		await test("2 * (2 / 2 / 3) * (2 + 2)", 2.67);
	});

	it("Math with precedence", async () => {
		await test("1 - 2 - 3", 1 - 2 - 3);
		await test("1 / 3 * 3", 1);
	});
});

describe('Arrays', () => {

	it("Access", async () => {
		await test('[1,2,3][0]', 1);
		await test('[1,2,3][1]', 2);
	});

	it("Modify", async () => {
		await test(`
			var a = [1,2,3];
			a[2] = 20;
			return a[2]
		`, 20);
	});
});

describe('Strings', () => {

	it("Simple operand", async () => {
		await test('"text"', "text");
		await test('""', "");
	});

	it("Adding strings", async () => {
		await test('"a" + "b"', "ab");
	});

	it("Adding strings to numbers", async () => {
		await test('"a" + 1', "a1");
		await test('1 + "a"', "1a");
	});
});

describe('Comparison', () => {
	it("Numbers", async () => {
		await test('1 > 2', false);
		await test('1 >= 2', false);
		await test('1 == 2', false);
		await test('1 != 1', false);
		await test('2 < 1', false);
		await test('2 <= 1', false);

		await test('3 > 2', true);
		await test('2 >= 2', true);
		await test('1 == 1', true);
		await test('2 != 1', true);
		await test('2 < 3', true);
		await test('2 <= 2', true);
		await test('2 <= 3', true);
	});

	it("Numbers after calculating", async () => {
		await test('1 > 2 * 2', false);
		await test('1 >= 2 * 2', false);
		await test('1 == 2 * 1', false);
		await test('1 != 1 * 1', false);
		await test('2 * 2 < 1', false);
		await test('2 * 2 <= 1', false);


		await test('2 * 3 > 2 * 2', true);
		await test('1 * 4 >= 2 * 2', true);
		await test('6 * 7 == 7 * 3 * 2', true);
		await test('20 / 2 == 5 * 2', true);
		await test('5 * 5 > 24', true);
		await test('100 * 5 == 50 * 10', true);
	});
});


describe('Logic', () => {
	it("Or", async () => {
		await test('1 == 1 or 2 == 2', true);
	});

	it("Or false", async () => {
		await test('1 == 2 or 2 == 3', false);
	});

	it("And", async () => {
		await test('1 == 1 and 2 == 2', true);
	});

	it("And false", async () => {
		await test('1 == 1 and 2 == 3', false);
	});

	it("And false false", async () => {
		await test('1 == 4 and 2 == 3', false);
	});

	it("Multiple", async () => {
		await test('1 == 1 or 2 == 2 or 3 == 3 or 1 == 2', true);
	});

	it("Parentis", async () => {
		await test('(1 == 1 or 3 == 4) and (1 == 4 or 2 == 2)', true);
	});
});

describe('Logic literal', () => {
	it("And", async () => {
		await test('true and true', true);
		await test('true and false', false);
		await test('false and false', false);
	});

	it("Or", async () => {
		await test('false or false', false);
		await test('true or false', true);
		await test('false or true', true);
	});
});


describe('Negation', () => {
	it("Literal", async () => {
		await test('!true', false);
		await test('!false', true);
	});

	it("Expressions", async () => {
		await test('!(2 > 1)', false);
		await test('!(2 < 1)', true);
	});

	it("Logic", async () => {
		await test('!(true and true)', false);
		await test('!(true and false)', true);
	});
});

describe('Ternary', () => {
	it("Single", async () => {
		await test('when true then 1 else 0', 1);
		await test('when true then "a" else 0', "a");

		await test('when false then 1 else 0', 0);
		await test('when false then "a" else 0', 0);
	});

	it("Multiple", async () => {
		await test('when true or true then 1 else 0', 1);
		await test('when false or true then "a" else 0', "a");
		await test('when 2 > 2 - 1 then "a" else 0', "a");

		await test('when true and false then 1 else 0', 0);
		await test('when false and true then "a" else 0', 0);
		await test('when 1 > 2 then "a" else 0', 0);
	});
});

describe('Variables', () => {
	it("Variable", async () => {
		await test(`
var g = 2
return g
		`, 2);
	});

	it("Variables", async () => {
		await test(`
var a = 5
var b = 4
var c = a * b;
return c / 2
		`, 10);
	});
});


describe('If statement', () => {
	it("Multiple ifs", async () => {
		await test(`		
				if (false) {
					return 3
				} else if (false) {
					return 2
				} else {
					return 8
				}
		`, 8);
	});

	it("Multiple ifs with body", async () => {
		await test(`		
				if (false) {
					return 3
				} else if (false) {
					return 2
				} 
				return 10
		`, 10);
	});
});


describe('For  statement', () => {
	it("Summing", async () => {
		await test(`		
				var g = 0;
				for (i in [1 to 20]) {
					g = g + i
				}
				return g;
		`, 210);
	});

	it("Break", async () => {
		await test(`		
				var g = 0;
				for (i in [1 to 20]) {
					g = g + 1
					if (g == 5){
						break
					}
				}
				return g;
		`, 5);
	});
});

describe('Methods', () => {
	run("'a'.toUpper()", "A");
	run("'a'.toUpper().toLower()", "a");
});

describe('Objects', () => {
	run(`
		var t = { a : 'a' }
		return t.a
	`, 'a');
});


describe('Left side set', () => {
	run(`
		var t = { a : 'a' }
		t.a = t.a + "b"		
	`, 'ab');
});

describe('Empty', () => {
	run(`b is empty`, true);
	run(`'' is empty`, true);
	run(`'a' is empty`, false);
	run(`'a' is not empty`, true);
	run(`
		var z = 'a';
		return z is empty
	`, false);
});

describe('Standard lib', () => {
	run(`STRING(4)`, "4");
	run(`NUMBER('4')`, 4);
	run(`BOOL('true')`, true);
	run(`BOOL('a')`, true);
	run(`BOOL('false')`, false);
});


describe('Functions', () => {
	run(`
		function name(a) {
			return a.toUpper();
		}
		return name('b');
	`, "B")
});

describe('Functions scope', () => {
	run(`
		var z = "a";
		function name(a) {
			return a + z;
		}
		return name('b');
	`, "ba")
});


describe('Json interop', () => {
	res("a", { a: 'test' }, "test");
});

describe('Dates', () => {
	run(`now()`, "2000-10-10T10:10:10.000Z");
	run(`today()`, "2000-10-10");
	run(`today() - today()`, 0);
	run(`today() + 1 - today()`, 1);
	run(`today() - 1 - today()`, -1);
	run(`now() - now()`, 0);
	run(`now() - today()`, 0);
	run(`today() - now()`, 0);
	run(`today() > now()`, false);
	run(`today() < now()`, false);
	run(`today() == now()`, true);
	run(`today() == today()`, true);
	run(`today() != today()`, false);
	run(`today() > today() - 1`, true);
	run(`today() < today() + 1`, true);
	run(`today() != today() + 1`, true);
	run(`today().start() < now()`, true);
	run(`(today() + 1).start() > now()`, true);
});

describe('Aggregations', () => {
	run(`
		var a = [1,2,3,4];
		var t = SUM(a);
		return t;
	`, 1 + 2 + 3 + 4);

	run(`COUNT([1,2,3])`, 3);
	run(`CONCAT([1,2,3])`, '123');

	run(`MAX([1,2,3])`, 3);
	run(`MIN([1,2,3])`, 1);
	run(`MIN(['1','2','3'])`, '1');
	run(`FIRST(['1','2','3'])`, '1');
	run(`MAX(['1','2','3'])`, '3');
	run(`LAST(['1','2','3'])`, '3');

	run(`
		var a = ['a','b'];
		var t = SUM(a);
		return t;
	`, 'ab');
});


describe('Titles', () => {
	run(`
		var a = "test";
		return \`a\`;
	`, 'test');
});

describe('Each', () => {
	run(`
		var t = {
			Name : 'john',
			List : [
				{ Value : 10 }
			]
		}
	`, {
		Name: 'john',
		List: [
			{ Value: 10 }
		]
	});
	const model = {
		Name: 'john',
		List: [
			{ Value: 10 },
			{ Value: 20 }
		]
	};
	res(`
		var sum = 0;

		each(List){
			sum = sum + Value;
		}

		return sum;

	`, model, 30);
});