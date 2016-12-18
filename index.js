const record = type => data => ({type, data});

class ParamTrie {
	constructor(value = [], {param = {}, branch = {}} = {}) {
		this.value = [].concat(value);
		this.param = param;
		this.branch = branch;
	}

	static get param() {
		return record('param');
	}

	static get branch() {
		return record('branch');
	}

	static empty() {
		return new ParamTrie();
	}

	static of(value) {
		return new ParamTrie(value);
	}

	static ofPath(path, value) {
		if(path.length === 0) {
			if(value instanceof ParamTrie) {
				return value;
			}

			return ParamTrie.of(value);
		}

		const [{type, data}] = path;
		return new ParamTrie([], {
			[type]: {
				[data]: ParamTrie.ofPath(path.slice(1), value)
			}
		});
	}

	static fromMap(map) {
		return Array.from(map.entries()).reduce(
			(trie, [path, value]) => trie.merge(ParamTrie.ofPath(path, value)),
			ParamTrie.empty()
		);
	}

	mergeRecord(type, other) {
		for(const data in other[type]) {
			if(this[type][data]) {
				this[type][data] = this[type][data].merge(other[type][data]);
			} else {
				this[type][data] = other[type][data];
			}
		}
	}

	merge(other) {
		const out = new ParamTrie(
			this.value.concat(other.value),
			{
				param: Object.assign({}, this.param),
				branch: Object.assign({}, this.branch)
			}
		);

		out.mergeRecord('param', other);
		out.mergeRecord('branch', other);

		return out;
	}

	lookup(path, params = {}) {
		if(path.length === 0) {
			if(this.value.length === 0) {
				return [];
			}

			return this.value.map(value => ({value, params}));
		}

		const [first, ...rest] = path;
		const results = this.branch[first] ? this.branch[first].lookup(rest) : [];

		return Object.keys(this.param).reduce((results, param) => results.concat(
			this.param[param].lookup(
				rest,
				Object.assign(
					{}, params, {
						[param]: first
					}
				)
			)
		), results);
	}

	indent(path) {
		return ParamTrie.ofPath(path, this);
	}

	insertPath(path, value) {
		return this.merge(ParamTrie.ofPath(path, value));
	}
}

module.exports = ParamTrie;