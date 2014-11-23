var Option    = require('fantasy-options');
var immutable = require('immutable');

union ParamBranch {
	Branch { value: * },
	Param  { name: *}
}

data ParamTrie {
	value: Option,
	children: immutable.Map
}