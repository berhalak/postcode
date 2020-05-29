{
	function many(arr1) {
   		return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(many(val)) : acc.concat(val), []).filter(x=> x != null)
	}
    
    function str(ar){
    	return many(ar).join('');
    }
    
    function tryInt(any){
    	if (Array.isArray(any))
        	any = many(any)
    	let n = Number(any);
        if (isNaN(n)) return any;
        	return n;
    }    
}

// start
Start = _ lines:Lines? EOL? { return { type : 'Block', lines: lines || [] } }

// lines
Lines = h:Line t:(EOL v:Line { return v})* { return [h, ...t]}

// single line (but not in text)

Line = 
	Func
	/ Variable
	/ For
	/ If
	/ Each
	/ Assignment
	/ Expression
	/ 'break' { return { type : 'Break' }}
	/ Return

Variable = 'var' _ name:TOKEN _ '=' _ value:Expression {
	return {
		type : 'Variable',
		name,
		value
	}
}

Block = 
	'{' ok:Start '}' { return ok } 	/ Line

Func = 'function' _ name:TOKEN _ '(' args:TOKENS ')' _ block:Block {
	return {
		type : 'Function',
		name,
		args,
		block
	}
}

Return = 'return' _ e:Expression { return { type : 'Return', value: e}}

If = 'if' _ '(' _ test:Expression _ ')' _ ok:Block e:(_ 'else' _ v:(If / Block ) { return v})? {
	return {
		type : 'If',
		test,
		ok,
		fail: e
	}	
}

For = 'for' _ '(' _ 'var'? _ iterator:TOKEN _ 'in' _ list:Expression _ ')' _ block:Block {
	return { 
		type : 'For',
		iterator,
		list,
		block
	}
}

Each = 'each' _ '(' self:TOKEN _ ')' _ block:Block {
	return { 
		type : 'Each',
		self,
		block
	}
}

Assignment = 
	call:Demeter WS '=' WS value:Expression { 
		call.args.push(value);
		call.type = 'Set';		
		return call;
	}


Expression = Or

Or = h:And t:(WS operator:'or' WS value:And { return {operator, value }})* { 
	return t.length ? 
			{ type : 'Or', init: h, list : t} :
			h;
}
And = h:Compare t:(WS operator:'and' WS value:Compare { return {operator, value }})* {
	if (t.length){
		return { type : 'And', init: h, list : t}
	} else {
		return h;
	}
}
Compare = a:Add r:(WS c:COMP WS b:Add { return { b, c } })? {
	if (r){
		return { type : 'Compare', a, b : r.b, operator : r.c }
	} else {
		return a;
	}
}
Add = h:Mul t:(WS operator:ADD WS value:Mul { return {operator, value }})* {
	if (t.length){
		return {
			type : 'Math', init : h, list : t 
		}
	} else {
		return h;
	}
}
Mul = h:Single t:(WS operator:MUL WS value:Single { return { operator, value } })* {
	if (t.length){
		return {
			type : 'Math', init : h, list : t 
		}
	} else {
		return h;
	}
}


Tenary = 'when' WS test:Or WS 'then' WS ok:Or WS fail:(e:('else' WS v:Or { return v }) / Tenary) { 
	return {
		type : 'When',
		test,
		ok,
		fail
	}
}

Single = 
	Tenary
	/ '!' t:Token { return { type : 'Negation', value : t}}
	/ Demeter

Demeter =  t:Token call:(Call)* {
		if (call.length){
			return [t, ...call].reduce((p, c) => {
				c.args = [p, ...c.args];
				return c;
			});
		} else {
			return t
		}
	}

Call = 
	WS 'is empty' { 
		return {
			type : 'Call', 
			args : [{ type : 'String', value : '_isEmpty' }]
		} 
	}
	/ WS 'is not empty' { 
		return {
			type : 'Call', 
			args : [{ type : 'String', value : '_isNotEmpty' }]
		} 
	}
	/ '.' message:TOKEN args:Args { 
		return {
			type : 'Call', 
			args : [{ type : 'String', value : message}, ...args]
		} 
	}
	/ '.' message:TOKEN { 
		return {
			type : 'Get', 
			args : [{ type : 'String', value : message}]
		} 
	}
	/ '[' _ index:Expression _ ']' { 
		return {
			type : 'Get', 
			args : [index]			
		} 
	}

Args = '(' _ h:Arg? t:(_ ',' _ v:Arg { return v })* _ ')' {
	return many([h,t])
}

Arg = 
	Arrow 
	/ Expression


Arrow_head = TOKEN / '(' _ v:TOKEN _ ')' { return v }

Arrow = id:Arrow_head _ '=>' _ exp:(Block / Expression) { return { 
	type : 'Arrow',
	id,
	expression: exp
}}

Invoke = name:TOKEN args:Args {
	return {
		type : 'Call',		
		args : [{ type : 'Scope'}, { type : 'String', value: name}, ...args ]
	}
}

Token =
	 STRING
	/ ARRAY
	/ DATE
	/ NUMBER
	/ TRUE
	/ FALSE
	/ Invoke
	/ Obj
	/ Arrow
	/ ID	
	/ '(' _ value:Expression _ ')' { return { type : 'Nest', value } }

Obj = '{' _ members:Members* _ '}' { return { type: 'Object', members }}

Members = name:TOKEN _ ':' _ value:Expression (_ ',' _)? {
	return {
		name, value
	}
}

// identifier
ID = !RES value:ID_value { return { type : 'Get', args : [{ type : 'Scope' }, value] }}

ID_value = v:TOKEN { return  {type : 'String', value : v} } / '`' v:WORDS '`' { return { type : 'Translate', title : v } }

RES = 'is' / 'if' / 'var' / 'break' / 'return' / 'when' / 'then' / 'else' / 'for' / 'with' / 'each' / 'empty' / 'in'
	  / 'function' / 'class' / 'to'

// operators
COMP = '==' / '!=' / '>=' / '<=' / '>' / '<'
ADD = '+'/'-'
MUL = '*'/'/'

// literals 
WORDS = t:[a-zA-Z ]+ { return t.join('') }
TOKEN = c:[a-zA-Z] t:[a-zA-Z0-9_]* { return c + t.join('') }
TOKENS = h:TOKEN? t:(_ ',' _ v:TOKEN { return v})* {
	return many([h,t])
}

ARRAY = 
	'[' _ from:Arg _ 'to' _ to:Arg _ ']' {
		return {
			type : 'Generator',
			from,
			to
		}
	}
	/ '[' _ h:Arg? t:(_ ',' _ v:Arg { return v })* _ ']' {
	return { 
		type : 'Array',
		list: many([h,t])
	}
}


DATE 'date' = 
	   t:([0-9][0-9][0-9][0-9]'-'[0-9][0-9]'-'[0-9][0-9]'T' [0-9:.]+ 'Z'?) { return { value : many(t).join(''), type : 'DateTime'} }
    /  t:([0-9][0-9][0-9][0-9]'-'[0-9][0-9]'-'[0-9][0-9]) { return { value : many(t).join(''), type : 'Date' } }

STRING = value:STRING_match { return { type : 'String', value }}

TRUE = 'true' { return { type : 'True' }}
FALSE = 'false' { return { type : 'False' }}

STRING_match =
	'"' t:[^\"]* '"' { return t.join('') ; }
    / "'" t:[^\']* "'" { return t.join('') ; }
    
NUMBER = 
	m:'-'?  t:(  [0-9]+ ('.'  [0-9]+  )?) { 
    	let abs = tryInt(many(t).join(''));
        if (m)
        	abs = -abs;
		return {
			type : 'Number',
            value : abs 
        }
    }


    
_ 'space'
  = [ \t\r\n]*

WS 'space'
  = [ \t\r\n]+

EOL = [ ;\t\r\n]+