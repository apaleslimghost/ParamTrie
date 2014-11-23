var Option = require('fantasy-options');
var Map    = require('immutable').Map;

Option.Some.unapply = function {
	o @ Option.Some => o.x,
	* => undefined
};

function nullableToArray {
	null => [],
	x    => [x]
};

var pairs = λ m => m.map(λ (v, k) => [k, v]).toArray();

Option.prototype.toString = function() {
	return this.cata({
		None: function()  { return 'None'; },
		Some: function(a) { return 'Some('+a+')'; }
	});
};

union ParamBranch {
	Branch { value: * },
	Param  { value: * }
} deriving require('adt-simple').Base;

data ParamChild {
	param: String,
	child: ParamTrie
} deriving require('adt-simple').Base;

/* @overrideapply */
data ParamTrie {
	value: Option,
	children: Map,
	paramChildren: Map
} deriving require('adt-simple').Base;

ParamTrie.create = function {
	(x @ Array, v) if x.length === 0 => new ParamTrie(Option.of(v), Map(), Map()),
	([b, ...rest], v) => new ParamTrie(
		Option.None,
		match b {
			Branch(b) => Map([[b, ParamTrie.create(rest, v)]]),
			Param => Map()
		},
		match b {
			Branch => Map(),
			Param(p) => Map([[p, ParamTrie.create(rest, v)]])
		}
	)
};

data LookupResult {
	value: *,
	params: Map
} deriving require('adt-simple').Base;

Array.prototype.chain = function(f) {
	return this.reduce(
		λ (a, x) -> a.concat(f(x)),
		[]
	);
}

function mergeResult {
	(LookupResult{value, params}, more) => LookupResult(value, params.merge(more))
}

function lookup {
	(ParamTrie{value}, x @ Array) if x.length === 0 => [LookupResult(value, Map())],
	(ParamTrie{children, paramChildren}, [b, ...rest]) => {
		return nullableToArray(children.get(b, null))
		.chain(function {
			trie @ ParamTrie => lookup(trie, rest)
		}).concat(
			pairs(paramChildren).chain(function {
				[param, child] => lookup(child, rest).map(function {
					result @ LookupResult => mergeResult(result, Map([[param, b]]))
				})
			})
		);
	}
}

function mergeVals(v1, v2) {
	return v1.cata({
		None: function() {
			return v2;
		},
		Some: function(x) {
			return v2.cata({
				None: function()  { return Option.of(x) },
				Some: function(y) { return Option.of(y) }
			})
		}
	});
}

function merge {
	(ParamTrie(v1, c1, pc1), ParamTrie(v2, c2, pc2)) => new ParamTrie(
		mergeVals(v1, v2),
		c1.mergeWith(concat, c2),
		pc1.mergeWith(concat, pc2)
	)
}

var t = ParamTrie.create(
	[
		Branch("foo"),
		Branch("bar"),
		Param("id")
	],
	"a"
);

var s = ParamTrie.create(
	[Branch("foo")],
	"b"
);

console.log(merge(t, s).toString());

