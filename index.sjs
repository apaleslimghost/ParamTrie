var Option = require('fantasy-options');
var Map    = require('immutable').Map;

Option.fromNullable = function {
	null => Option.None,
	x    => Option.Some(x)
};

Option.prototype.toString = function() {
	return this.cata({
		None: function()  { return 'None'; },
		Some: function(a) { return 'Some('+a+')'; }
	});
};

union ParamBranch {
	Branch { value: * },
	Param  { name: *}
} deriving require('adt-simple').Base;

/* @overrideapply */
data ParamTrie {
	value: Option,
	children: Map
} deriving require('adt-simple').Base;

ParamTrie.create = function {
	(x @ Array, v) if x.length === 0 => new ParamTrie(Option.of(v), Map()),
	([b, ...rest], v) => new ParamTrie(
		Option.None,
		Map([[b, ParamTrie.create(rest, v)]])
	)
};

function lookup {
	ParamTrie{value}, [] => value
	ParamTrie{children}, [b, ...rest] => match b {
		Branch{value} =>
		Option.fromNullable(children.get(b)).chain(function {
			trie => lookup(trie, rest)
		});
}

var t = trie
	ParamTrie.create(
		[
			Branch("foo"),
			Branch("bar"),
			Param("id")
		],
		function() {}
	).toString()
);

// function insert {
// 	ParamTrie{children}, [], v => ParamTrie(Option.Some(v), children),
// 	ParamTrie{value, children}, [b @ ParamBranch, ...rest], v => {
// 	}
// }