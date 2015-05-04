var Map  = require('immutable').Map;
var Base = require('adt-simple').Base;

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
	value: Array,
	children: Map
} deriving Base;
ParamTrie.prototype.inspect = ParamTrie.prototype.toString;

data LookupResult {
	value: *,
	params: Map
} deriving Base;
LookupResult.prototype.inspect = LookupResult.prototype.toString;

ParamTrie.empty = λ -> new ParamTrie([], Map());
ParamTrie.of = λ v -> new ParamTrie([v], Map());
ParamTrie.ofPath = λ (p, v) -> ParamTrie.of(v).indent(p);

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
	(ParamTrie([], *), []) => [],
	(ParamTrie{value}, []) => [LookupResult(value, Map())],
	(ParamTrie{children}, [b, ...rest]) => chain(
		nullableToArray(children.get(Branch(b), null)),
		function {
			trie @ ParamTrie => lookup(trie, rest)
		}
	).concat(
		chain(pairs(children), function {
			[Param(param), child] => lookup(child, rest).map(function {
				result @ LookupResult => mergeResult(result, Map([[param, b]]))
			}),
			[Branch, child] => []
		})
	);
}

ParamTrie.prototype.lookup = λ a -> lookup(this, a);

function merge {
	(ParamTrie(v1, c1), ParamTrie(v2, c2)) => new ParamTrie(
		v1.concat(v2),
		c1.mergeWith(merge, c2)
	)
}

ParamTrie.prototype.merge = λ o -> merge(this, o);
ParamTrie.prototype.insertPath = λ (p, v) -> merge(this, ParamTrie.ofPath(p, v));

function indent {
	(p @ ParamTrie, []) => p,
	(p @ ParamTrie, [b, ...rest]) => new ParamTrie(
		[],
		Map([[b, indent(p, rest)]])
	)
}

ParamTrie.prototype.indent = λ p -> indent(this, p);

exports.ParamTrie    = ParamTrie;
exports.ParamBranch  = ParamBranch;
exports.LookupResult = LookupResult;
