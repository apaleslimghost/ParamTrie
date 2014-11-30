var Option = require('fantasy-options');
var Map    = require('immutable').Map;
var Base   = require('adt-simple').Base;

function nullableToArray {
	null => [],
	x    => [x]
};

var pairs = λ m => m.map(λ (v, k) => [k, v]).toArray();

union ParamBranch {
	Branch { value: * },
	Param  { value: * }
} deriving Base;
ParamBranch.prototype.inspect = ParamBranch.prototype.toString;

data ParamTrie {
	value: Option,
	children: Map,
	paramChildren: Map
} deriving Base;
ParamTrie.prototype.inspect = ParamTrie.prototype.toString;

data LookupResult {
	value: *,
	params: Map
} deriving Base;
LookupResult.prototype.inspect = LookupResult.prototype.toString;

ParamTrie.empty = λ -> new ParamTrie(Option.None, Map(), Map());
ParamTrie.of = λ v -> new ParamTrie(Option.of(v), Map(), Map());
ParamTrie.ofPath = function {
	([], v) => ParamTrie.of(v),
	([b, ...rest], v) => new ParamTrie(
		Option.None,
		match b {
			Branch(b) => Map([[b, ParamTrie.ofPath(rest, v)]]),
			Param => Map()
		},
		match b {
			Branch => Map(),
			Param(p) => Map([[p, ParamTrie.ofPath(rest, v)]])
		}
	)
};

ParamTrie.fromMap = λ m -> m.reduce(
	λ (t, v, k) -> t.insertPath(k, v),
	ParamTrie.empty()
);

function chain(a, f) {
	return a.reduce(
		λ (a, x) -> a.concat(f(x)),
		[]
	);
}

function mergeResult {
	(LookupResult{value, params}, more) => LookupResult(value, params.merge(more))
}

function lookup {
	(ParamTrie{value}, []) => [LookupResult(value, Map())],
	(ParamTrie{children, paramChildren}, [b, ...rest]) => chain(
		nullableToArray(children.get(b, null)),
		function {
			trie @ ParamTrie => lookup(trie, rest)
		}
	).concat(
		chain(pairs(paramChildren), function {
			[param, child] => lookup(child, rest).map(function {
				result @ LookupResult => mergeResult(result, Map([[param, b]]))
			})
		})
	);
}

ParamTrie.prototype.lookup = λ a -> lookup(this, a);

function first {
	[]  => Option.None,
	[x, ...xs] => Option.Some(x)
}

function flipResult {
	LookupResult(value, params) => value.cata({
		None: λ -> Option.None,
		Some: λ x -> Option.Some(LookupResult(x, params))
	})
}

function lookupOne(t, a) {
	return first(
		lookup(t, a)
		.map(flipResult)
		.filter(λ[# instanceof Option.Some])
	).chain(λ[#]); // join
}

ParamTrie.prototype.lookupOne = λ a -> lookupOne(this, a);

function mergeVals(v1, v2) {
	return v1.cata({
		None: λ -> v2,
		Some: λ x -> v2.cata({
			None: λ -> Option.of(x),
			Some: Option.of
		})
	});
}

function merge {
	(ParamTrie(v1, c1, pc1), ParamTrie(v2, c2, pc2)) => new ParamTrie(
		mergeVals(v1, v2),
		c1.mergeWith(merge, c2),
		pc1.mergeWith(merge, pc2)
	)
}

ParamTrie.prototype.merge = λ o -> merge(this, o);
ParamTrie.prototype.insertPath = λ (p, v) -> merge(this, ParamTrie.ofPath(p, v));

exports.ParamTrie    = ParamTrie;
exports.ParamBranch  = ParamBranch;
exports.LookupResult = LookupResult;