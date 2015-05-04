var pt = require('./index.js');
var expect = require('expect.js');
var im = require('immutable');
var i  = require('util').inspect;
var Eq = require('adt-simple').Eq;

function zip(as, bs) {
	return as.map(λ (a, i) -> [a, bs[i]]);
}

function arrayEq(as, bs) {
	return as.length === bs.length && zip(as, bs).every(function {
		[a, b] => eq(a, b)
	});
}

function eq {
	(a @ im.Map, b @ im.Map) => im.is(a, b),
	(a @ {equals}, b) => a.equals(b),
	(a @ Array, b @ Array) => arrayEq(a, b),
	(a, b) => a === b
}

Eq.nativeEquals = eq;

expect.Assertion.prototype.eq = function(obj) {
	this.assert(
		eq(this.obj, obj),
		λ -> 'expected ' + i(this.obj) + ' to equal ' + i(obj),
		λ -> 'expected ' + i(this.obj) + ' to not equal ' + i(obj)
	);
	return this;
};

describe "ParamTrie" {
	describe "empty" {
		it "should create a trie" {
			expect(pt.ParamTrie.empty()).to.be.a(pt.ParamTrie);
		}

		it "should have no value" {
			expect(pt.ParamTrie.empty().value).to.eq([]);
		}

		it "should create empty things" {
			var t = pt.ParamTrie.empty();
			expect(t.children).to.eq(im.Map());
		}
	}

	describe "of" {
		it "should create a trie" {
			expect(pt.ParamTrie.of()).to.be.a(pt.ParamTrie);
		}

		it "should have a value" {
			var t = pt.ParamTrie.of('a')
			expect(t.value).to.contain('a');
		}

		it "should create empty things" {
			var t = pt.ParamTrie.of();
			expect(t.children).to.eq(im.Map());
		}
	}

	describe "ofPath" {
		describe "with an empty path" {
			it "should be of" {
				expect(pt.ParamTrie.ofPath([], 'a')).to.eq(pt.ParamTrie.of('a'));
			}
		}

		describe "with a path" {
			it "should nest under children with Branch" {
				expect(
					pt.ParamTrie.ofPath([pt.ParamBranch.Branch('foo')], 'a')
				).to.eq(
					new pt.ParamTrie(
						[],
						im.Map([[pt.ParamBranch.Branch('foo'), pt.ParamTrie.of('a')]])
					)
				);
			}

			it "should nest under paramChildren with Pranch" {
				expect(
					pt.ParamTrie.ofPath([pt.ParamBranch.Param('foo')], 'a')
				).to.eq(
					new pt.ParamTrie(
						[],
						im.Map([[pt.ParamBranch.Param('foo'), pt.ParamTrie.of('a')]])
					)
				);
			}

			it "should recurse multiple branches" {
				expect(
					pt.ParamTrie.ofPath([
						pt.ParamBranch.Branch('foo'),
						pt.ParamBranch.Branch('bar')
					], 'a')
				).to.eq(
					new pt.ParamTrie(
						[],
						im.Map([[pt.ParamBranch.Branch('foo'), pt.ParamTrie.ofPath([
							pt.ParamBranch.Branch('bar')
						], 'a')]])
					)
				);
			}

			it "should recurse multiple params" {
				expect(
					pt.ParamTrie.ofPath([
						pt.ParamBranch.Param('foo'),
						pt.ParamBranch.Param('bar')
					], 'a')
				).to.eq(
					new pt.ParamTrie(
						[],
						im.Map([[pt.ParamBranch.Param('foo'), pt.ParamTrie.ofPath([
							pt.ParamBranch.Param('bar')
						], 'a')]])
					)
				);
			}

			it "should recurse mixed branch and param" {
				expect(
					pt.ParamTrie.ofPath([
						pt.ParamBranch.Branch('foo'),
						pt.ParamBranch.Param('bar')
					], 'a')
				).to.eq(
					new pt.ParamTrie(
						[],
						im.Map([[pt.ParamBranch.Branch('foo'), pt.ParamTrie.ofPath([
							pt.ParamBranch.Param('bar')
						], 'a')]]),
						im.Map()
					)
				);
			}

			it "should recurse mixed param and branch" {
				expect(
					pt.ParamTrie.ofPath([
						pt.ParamBranch.Param('foo'),
						pt.ParamBranch.Branch('bar')
					], 'a')
				).to.eq(
					new pt.ParamTrie(
						[],
						im.Map([[pt.ParamBranch.Param('foo'), pt.ParamTrie.ofPath([
							pt.ParamBranch.Branch('bar')
						], 'a')]])
					)
				);
			}
		}
	}

	describe "lookup" {
		describe "with empty path" {
			it "should return nothing" {
				var t = pt.ParamTrie.empty();
				expect(
					t.lookup([])
				).to.eq([]);
			}

			it "should return value (non-empty)" {
				var t = pt.ParamTrie.of("a");
				expect(
					t.lookup([])
				).to.eq([
					pt.LookupResult(["a"], im.Map())
				]);
			}
		}

		describe "with non-empty path" {
			it "should recurse when path matches branch" {
				var t = pt.ParamTrie.ofPath([
					pt.ParamBranch.Branch('foo')
				], 'a');

				expect(
					t.lookup(['foo'])
				).to.eq(
					pt.ParamTrie.of("a").lookup([])
				);
			}

			it "should recurse when path matches param and add to map" {
				var t = pt.ParamTrie.ofPath([
					pt.ParamBranch.Param('foo')
				], 'a');

				var r = pt.ParamTrie.of("a").lookup([])[0];

				expect(
					t.lookup(['bar'])
				).to.eq([
					pt.LookupResult(r.value, im.Map({foo: 'bar'}))
				]);
			}
		}

		describe "with multiple potential results" {
			it "should return an array of concrete and param results" {
				var t = new pt.ParamTrie(
					[],
					im.Map([
						[pt.ParamBranch.Branch('foo'), pt.ParamTrie.of("a")],
						[pt.ParamBranch.Param('bar'), pt.ParamTrie.of("b")],
						[pt.ParamBranch.Param('baz'), pt.ParamTrie.of("c")]
					])
				);

				expect(
					t.lookup(['foo'])
				).to.eq([
					pt.LookupResult(["a"], im.Map()),
					pt.LookupResult(["b"], im.Map({bar:'foo'})),
					pt.LookupResult(["c"], im.Map({baz:'foo'}))
				]);
			}
		}

		describe "with potential empty results" {
			it "should only return non-empty results" {
				var t = new pt.ParamTrie(
					[],
					im.Map([
						[pt.ParamBranch.Param('foo'), pt.ParamTrie.empty()],
						[pt.ParamBranch.Param('bar'), pt.ParamTrie.of("b")],
						[pt.ParamBranch.Param('baz'), pt.ParamTrie.empty()]
					])
				);

				expect(
					t.lookup(['foo'])
				).to.eq([
					pt.LookupResult(["b"], im.Map({bar:'foo'}))
				]);
			}
		}
	}

	describe "merge" {
		describe "shallow tries" {
			it "should keep nothing" {
				var t1 = pt.ParamTrie.empty();
				var t2 = pt.ParamTrie.empty();

				expect(t1.merge(t2)).to.eq(
					pt.ParamTrie.empty()
				);
				expect(t2.merge(t1)).to.eq(
					pt.ParamTrie.empty()
				);
			}

			it "should prefer values" {
				var t1 = pt.ParamTrie.empty();
				var t2 = pt.ParamTrie.of('a');

				expect(t1.merge(t2)).to.eq(
					pt.ParamTrie.of('a')
				);
				expect(t2.merge(t1)).to.eq(
					pt.ParamTrie.of('a')
				);
			}

			it "should concat the values" {
				var t1 = pt.ParamTrie.of('a');
				var t2 = pt.ParamTrie.of('b');

				expect(t1.merge(t2)).to.eq(
					new pt.ParamTrie(
						['a', 'b'],
						im.Map()
					)
				);
			}
		}
	}

	describe "fromMap" {
		it "should convert empty map to empty trie" {
			expect(pt.ParamTrie.fromMap(im.Map())).to.eq(pt.ParamTrie.empty());
		}

		describe "with single-item keys" {
			it "should add one branch key to trie" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[pt.ParamBranch.Branch('foo')], 'bar']
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([[
						pt.ParamBranch.Branch('foo'),
						pt.ParamTrie.of('bar')
					]])
				));
			}

			it "should add a few branch keys to trie" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[pt.ParamBranch.Branch('foo')], 'a'],
					[[pt.ParamBranch.Branch('bar')], 'b'],
					[[pt.ParamBranch.Branch('baz')], 'c']
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([
						[pt.ParamBranch.Branch('foo'), pt.ParamTrie.of('a')],
						[pt.ParamBranch.Branch('bar'), pt.ParamTrie.of('b')],
						[pt.ParamBranch.Branch('baz'), pt.ParamTrie.of('c')]
					])
				));
			}

			it "should merge duplicate branch keys" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[pt.ParamBranch.Branch('foo')], 'a'],
					[[pt.ParamBranch.Branch('foo')], 'b']
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([[
						pt.ParamBranch.Branch('foo'),
						pt.ParamTrie(['a','b'], im.Map())
					]])
				));
			}

			it "should add one param key to trie" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[pt.ParamBranch.Param('foo')], 'bar']
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([[
						pt.ParamBranch.Param('foo'),
						pt.ParamTrie.of('bar')
					]])
				));
			}

			it "should add a few param keys to trie" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[pt.ParamBranch.Param('foo')], 'a'],
					[[pt.ParamBranch.Param('bar')], 'b'],
					[[pt.ParamBranch.Param('baz')], 'c']
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([
						[pt.ParamBranch.Param('foo'), pt.ParamTrie.of('a')],
						[pt.ParamBranch.Param('bar'), pt.ParamTrie.of('b')],
						[pt.ParamBranch.Param('baz'), pt.ParamTrie.of('c')]
					])
				));
			}

			it "should add mixed keys to the trie" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[pt.ParamBranch.Param('foo')], 'a'],
					[[pt.ParamBranch.Branch('bar')], 'b']
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([
						[pt.ParamBranch.Param('foo'), pt.ParamTrie.of('a')],
						[pt.ParamBranch.Branch('bar'), pt.ParamTrie.of('b')]
					])
				));
			}
		}

		describe "longer keys" {
			it "should nest a single key of branches" {
				expect(pt.ParamTrie.fromMap(im.Map([[
					[
						pt.ParamBranch.Branch('foo'),
						pt.ParamBranch.Branch('bar'),
					],
					'baz'
				]]))).to.eq(pt.ParamTrie(
					[],
					im.Map([[
						pt.ParamBranch.Branch('foo'),
						pt.ParamTrie(
							[],
							im.Map([[
								pt.ParamBranch.Branch('bar'),
								pt.ParamTrie.of('baz')
							]])
						)
					]])
				));
			}

			it "should nest a single key of params" {
				expect(pt.ParamTrie.fromMap(im.Map([[
					[
						pt.ParamBranch.Param('foo'),
						pt.ParamBranch.Param('bar'),
					],
					'baz'
				]]))).to.eq(pt.ParamTrie(
					[],
					im.Map([[
						pt.ParamBranch.Param('foo'),
						pt.ParamTrie(
							[],
							im.Map([[
								pt.ParamBranch.Param('bar'),
								pt.ParamTrie.of('baz')
							]])
						)
					]])
				));
			}

			it "should merge multiple keys" {
				expect(pt.ParamTrie.fromMap(im.Map([
					[[
						pt.ParamBranch.Branch('foo'),
						pt.ParamBranch.Branch('bar'),
					], 'a'],
					[[
						pt.ParamBranch.Branch('foo'),
						pt.ParamBranch.Branch('baz'),
					], 'b'],
				]))).to.eq(pt.ParamTrie(
					[],
					im.Map([[
						pt.ParamBranch.Branch('foo'),
						pt.ParamTrie(
							[],
							im.Map([
								[pt.ParamBranch.Branch('bar'), pt.ParamTrie.of('a')],
								[pt.ParamBranch.Branch('baz'), pt.ParamTrie.of('b')],
							])
						)
					]])
				));
			}
		}
	}

	describe "indent" {
		it "should indent a trie with a branch" {
			expect(
				pt.ParamTrie.of('a').indent([
					pt.ParamBranch.Branch('foo')
				])
			).to.eq(pt.ParamTrie.ofPath([pt.ParamBranch.Branch('foo')], 'a'));
		}
		it "should indent a trie with some branches" {
			expect(
				pt.ParamTrie.of('a').indent([
					pt.ParamBranch.Branch('foo'),
					pt.ParamBranch.Branch('bar')
				])
			).to.eq(pt.ParamTrie.ofPath([
					pt.ParamBranch.Branch('foo'),
					pt.ParamBranch.Branch('bar')
			], 'a'));
		}
		it "should indent a trie with a param" {
			expect(
				pt.ParamTrie.of('a').indent([
					pt.ParamBranch.Param('foo')
				])
			).to.eq(pt.ParamTrie.ofPath([pt.ParamBranch.Param('foo')], 'a'));
		}
		it "should indent a trie with some branches" {
			expect(
				pt.ParamTrie.of('a').indent([
					pt.ParamBranch.Param('foo'),
					pt.ParamBranch.Param('bar')
				])
			).to.eq(pt.ParamTrie.ofPath([
					pt.ParamBranch.Param('foo'),
					pt.ParamBranch.Param('bar')
			], 'a'));
		}
		it "should indent a trie with a mixed path" {
			expect(
				pt.ParamTrie.of('a').indent([
					pt.ParamBranch.Param('foo'),
					pt.ParamBranch.Branch('bar')
				])
			).to.eq(pt.ParamTrie.ofPath([
					pt.ParamBranch.Param('foo'),
					pt.ParamBranch.Branch('bar')
			], 'a'));
		}
		it "should indent a trie that already has a phat" {
			expect(
				pt.ParamTrie.ofPath([pt.ParamBranch.Branch('foo')], 'a').indent([
					pt.ParamBranch.Branch('bar')
				])
			).to.eq(pt.ParamTrie.ofPath([
					pt.ParamBranch.Branch('bar'),
					pt.ParamBranch.Branch('foo')
			], 'a'));
		}
	}
}
