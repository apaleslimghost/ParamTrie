var ParamTrie = require('./');
var expect = require('expect.js');
var {inspect} = require('util');
var eq = require('@quarterto/eq');

const i = obj => inspect(obj, {depth: null});

expect.Assertion.prototype.eq = function(obj) {
	this.assert(
		eq(this.obj, obj),
		() => 'expected ' + i(this.obj) + ' to equal ' + i(obj),
		() =>  'expected ' + i(this.obj) + ' to not equal ' + i(obj)
	);

	return this;
};

describe('ParamTrie', () => {
	describe('empty', () => {
		it('should create a trie', () => {
			expect(ParamTrie.empty()).to.be.a(ParamTrie);
		});

		it('should have no value', () => {
			expect(ParamTrie.empty().value).to.eq([]);
		});

		it('should create empty children', () => {
			var t = ParamTrie.empty();
			expect(t.param).to.be.empty();
			expect(t.branch).to.be.empty();
		});
	});

	describe('of', () => {
		it('should create a trie', () => {
			expect(ParamTrie.of()).to.be.a(ParamTrie);
		});

		it('should have a value', () => {
			var t = ParamTrie.of('a');
			expect(t.value).to.contain('a');
		});

		it('should create empty children', () => {
			var t = ParamTrie.of();
			expect(t.param).to.be.empty();
			expect(t.branch).to.be.empty();
		});
	});

	describe('ofPath', () => {
		describe('with an empty path', () => {
			it('should be of', () => {
				expect(ParamTrie.ofPath([], 'a')).to.eq(ParamTrie.of('a'));
			});
		});

		describe('with a path', () => {
			it('should nest under children with Branch', () => {
				expect(ParamTrie.ofPath([ParamTrie.branch('foo')], 'a')).to.eq(
					new ParamTrie([], {
						branch: {
							foo: ParamTrie.of('a')
						}
					})
				);
			});

			it('should nest under children with Param', () => {
				expect(ParamTrie.ofPath([ParamTrie.param('foo')], 'a')).to.eq(
					new ParamTrie([], {
						param: {
							foo: ParamTrie.of('a')
						}
					})
				);
			});

			it('should recurse multiple branches', () => {
				expect(ParamTrie.ofPath([
					ParamTrie.branch('foo'),
					ParamTrie.branch('bar')
				], 'a')).to.eq(new ParamTrie([], {
					branch: {
						foo: ParamTrie.ofPath([ParamTrie.branch('bar')], 'a')
					}
				}));
			});

			it('should recurse multiple params', () => {
				expect(ParamTrie.ofPath([
					ParamTrie.param('foo'),
					ParamTrie.param('bar')
				], 'a')).to.eq(new ParamTrie([], {
					param: {
						foo: ParamTrie.ofPath([ParamTrie.param('bar')], 'a')
					}
				}));
			});

			it('should recurse mixed branch and param', () => {
				expect(ParamTrie.ofPath([
					ParamTrie.branch('foo'),
					ParamTrie.param('bar')
				], 'a')).to.eq(new ParamTrie([], {
					branch: {
						foo: ParamTrie.ofPath([ParamTrie.param('bar')], 'a')
					}
				}));
			});

			it('should recurse mixed param and branch', () => {
				expect(ParamTrie.ofPath([
					ParamTrie.param('foo'),
					ParamTrie.branch('bar')
				], 'a')).to.eq(new ParamTrie([], {
					param: {
						foo: ParamTrie.ofPath([ParamTrie.branch('bar')], 'a')
					}
				}));
			});
		});
	});

	describe('lookup', () => {
		describe('with empty path', () => {
			it('should return nothing', () => {
				var t = ParamTrie.empty();
				expect(t.lookup([])).to.eq([]);
			});

			it('should return value (non-empty)', () => {
				var t = ParamTrie.of('a');
				expect(t.lookup([])).to.eq([{value: 'a', params: {}}]);
			});
		});

		describe('with non-empty path', () => {
			it('should recurse when path matches branch', () => {
				var t = ParamTrie.ofPath([ParamTrie.branch('foo')], 'a');
				expect(t.lookup(['foo'])).to.eq(ParamTrie.of('a').lookup([]));
			});

			it('should recurse when path matches param and add to map', () => {
				var t = ParamTrie.ofPath([ParamTrie.param('foo')], 'a');
				var r = ParamTrie.of('a').lookup([])[0];
				expect(t.lookup(['bar'])).to.eq([{value: r.value, params: {foo: 'bar'}}]);
			});
		});

		describe('with multiple potential results', () => {
			it('should return an array of concrete and param results', () => {
				var t = new ParamTrie([], {
					branch: {
						foo: ParamTrie.of('a')
					},
					param: {
						bar: ParamTrie.of('b'),
						baz: ParamTrie.of('c')
					}
				});
				expect(t.lookup(['foo'])).to.eq([
					{value: 'a', params: {}},
					{value: 'b', params: { bar: 'foo' }},
					{value: 'c', params: { baz: 'foo' }}
				]);
			});
		});

		describe('with potential empty results', () => {
			it('should only return non-empty results', () => {
				var t = new ParamTrie([], {
					param: {
						foo: ParamTrie.empty(),
						bar: ParamTrie.of('b'),
						baz: ParamTrie.empty()
					}
				});
				expect(t.lookup(['foo'])).to.eq([{value: 'b', params: {bar: 'foo'}}]);
			});
		});

	});

	describe('merge', () => {
		describe('shallow tries', () => {
			it('should keep nothing', () => {
				var t1 = ParamTrie.empty();
				var t2 = ParamTrie.empty();
				expect(t1.merge(t2)).to.eq(ParamTrie.empty());
				expect(t2.merge(t1)).to.eq(ParamTrie.empty());
			});

			it('should prefer values', () => {
				var t1 = ParamTrie.empty();
				var t2 = ParamTrie.of('a');
				expect(t1.merge(t2)).to.eq(ParamTrie.of('a'));
				expect(t2.merge(t1)).to.eq(ParamTrie.of('a'));
			});

			it('should concat the values', () => {
				var t1 = ParamTrie.of('a');
				var t2 = ParamTrie.of('b');
				expect(t1.merge(t2)).to.eq(new ParamTrie([
					'a',
					'b'
				], new Map()));
			});
		});
	});

	describe('fromMap', () => {
		it('should convert empty map to empty trie', () => {
			expect(ParamTrie.fromMap(new Map())).to.eq(ParamTrie.empty());
		});

		describe('with single-item keys', () => {
			it('should add one branch key to trie', () => {
				expect(ParamTrie.fromMap(new Map([[
						[ParamTrie.branch('foo')],
						'bar'
					]]))).to.eq(new ParamTrie([], {
						branch: {
							foo: ParamTrie.of('bar')
						}
					}));
			});

			it('should add a few branch keys to trie', () => {
				expect(ParamTrie.fromMap(new Map([
					[
						[ParamTrie.branch('foo')],
						'a'
					],
					[
						[ParamTrie.branch('bar')],
						'b'
					],
					[
						[ParamTrie.branch('baz')],
						'c'
					]
				]))).to.eq(new ParamTrie([], {
					branch: {
						foo: ParamTrie.of('a'),
						bar: ParamTrie.of('b'),
						baz: ParamTrie.of('c')
					}
				}));
			});

			it('should merge duplicate branch keys', () => {
				expect(ParamTrie.fromMap(new Map([
					[
						[ParamTrie.branch('foo')],
						'a'
					],
					[
						[ParamTrie.branch('foo')],
						'b'
					]
				]))).to.eq(new ParamTrie([], {
					branch: {
						foo: ParamTrie.of(['a', 'b'])
					}
				}));
			});

			it('should add one param key to trie', () => {
				expect(ParamTrie.fromMap(new Map([[
					[ParamTrie.param('foo')],
					'bar'
				]]))).to.eq(new ParamTrie([], {
					param: {
						foo: ParamTrie.of(['bar'])
					}
				}));
			});

			it('should add a few param keys to trie', () => {
				expect(ParamTrie.fromMap(new Map([
					[
						[ParamTrie.param('foo')],
						'a'
					],
					[
						[ParamTrie.param('bar')],
						'b'
					],
					[
						[ParamTrie.param('baz')],
						'c'
					]
				]))).to.eq(new ParamTrie([], {
					param: {
						foo: ParamTrie.of('a'),
						bar: ParamTrie.of('b'),
						baz: ParamTrie.of('c')
					}
				}));
			});

			it('should add mixed keys to the trie', () => {
				expect(ParamTrie.fromMap(new Map([
					[
						[ParamTrie.param('foo')],
						'a'
					],
					[
						[ParamTrie.branch('bar')],
						'b'
					]
				]))).to.eq(new ParamTrie([], {
					branch: {
						bar: ParamTrie.of('b'),
					},
					param: {
						foo: ParamTrie.of('a'),
					}
				}));
			});
		});

		describe('longer keys', () => {
			it('should nest a single key of branches', () => {
				expect(ParamTrie.fromMap(new Map([[
						[
							ParamTrie.branch('foo'),
							ParamTrie.branch('bar')
						],
						'baz'
					]]))).to.eq(ParamTrie.ofPath([ParamTrie.branch('foo'), ParamTrie.branch('bar')], 'baz'));
			});

			it('should nest a single key of params', () => {
				expect(ParamTrie.fromMap(new Map([[
						[
							ParamTrie.param('foo'),
							ParamTrie.param('bar')
						],
						'baz'
					]]))).to.eq(ParamTrie.ofPath([ParamTrie.param('foo'), ParamTrie.param('bar')], 'baz'));
			});

			it('should merge multiple keys', () => {
				expect(ParamTrie.fromMap(new Map([
					[
						[
							ParamTrie.branch('foo'),
							ParamTrie.branch('bar')
						],
						'a'
					],
					[
						[
							ParamTrie.branch('foo'),
							ParamTrie.branch('baz')
						],
						'b'
					]
				]))).to.eq(new ParamTrie([], {
					branch: {
						foo: new ParamTrie([], {
							branch: {
								bar: ParamTrie.of('a'),
								baz: ParamTrie.of('b')
							}
						})
					}
				}));
			});
		});
	});

	describe('indent', () => {
		it('should indent a trie with a branch', () => {
			expect(ParamTrie.of('a').indent([ParamTrie.branch('foo')])).to.eq(ParamTrie.ofPath([ParamTrie.branch('foo')], 'a'));
		});

		it('should indent a trie with some branches', () => {
			expect(ParamTrie.of('a').indent([
				ParamTrie.branch('foo'),
				ParamTrie.branch('bar')
			])).to.eq(ParamTrie.ofPath([
				ParamTrie.branch('foo'),
				ParamTrie.branch('bar')
			], 'a'));
		});

		it('should indent a trie with a param', () => {
			expect(ParamTrie.of('a').indent([ParamTrie.param('foo')])).to.eq(ParamTrie.ofPath([ParamTrie.param('foo')], 'a'));
		});

		it('should indent a trie with some branches', () => {
			expect(ParamTrie.of('a').indent([
				ParamTrie.param('foo'),
				ParamTrie.param('bar')
			])).to.eq(ParamTrie.ofPath([
				ParamTrie.param('foo'),
				ParamTrie.param('bar')
			], 'a'));
		});

		it('should indent a trie with a mixed path', () => {
			expect(ParamTrie.of('a').indent([
				ParamTrie.param('foo'),
				ParamTrie.branch('bar')
			])).to.eq(ParamTrie.ofPath([
				ParamTrie.param('foo'),
				ParamTrie.branch('bar')
			], 'a'));
		});

		it('should indent a trie that already has a phat', () => {
			expect(ParamTrie.ofPath([ParamTrie.branch('foo')], 'a').indent([ParamTrie.branch('bar')])).to.eq(ParamTrie.ofPath([
				ParamTrie.branch('bar'),
				ParamTrie.branch('foo')
			], 'a'));
		});
	});
});

