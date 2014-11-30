var pt = require('./index.js');
var expect = require('expect.js');
var im = require('immutable');
var Op = require('fantasy-options');
var i  = require('util').inspect;
var Eq = require('adt-simple').Eq;

Op.None.inspect = λ -> 'None';
Op.Some.prototype.inspect = λ -> 'Some(' + i(this.x) + ')';

function opeq(a, b) {
	return a.cata({
		None: λ -> b === Op.None,
		Some: λ x -> eq(b.x, x)
	});
}

function zip(as, bs) {
	return as.map(λ (a, i) -> [a, bs[i]]);
}

function arrayEq(as, bs) {
	return zip(as, bs).every(function {
		[a, b] => eq(a, b)
	})
}

function eq {
	(a @ im.Map, b @ im.Map) => im.is(a, b),
	(a @ {equals}, b) => a.equals(b),
	(a @ Op, b @ Op) => opeq(a, b),
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
			expect(pt.ParamTrie.empty()).to.have.property('value', Op.None);
		}

		it "should create empty things" {
			var t = pt.ParamTrie.empty();
			expect(t.children).to.eq(im.Map());
			expect(t.paramChildren).to.eq(im.Map());
		}
	}

	describe "of" {
		it "should create a trie" {
			expect(pt.ParamTrie.of()).to.be.a(pt.ParamTrie);
		}

		it "should have a value" {
			var t = pt.ParamTrie.of('a')
			expect(t.value).to.be.a(Op.Some);
			t.value.cata({
				None: λ -> expect().fail('Not none'),
				Some: λ x -> expect(x).to.be('a')
			});
		}

		it "should create empty things" {
			var t = pt.ParamTrie.of();
			expect(t.children).to.eq(im.Map());
			expect(t.paramChildren).to.eq(im.Map());
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
						Op.None,
						im.Map({'foo': pt.ParamTrie.of('a')}),
						im.Map()
					)
				);
			}

			it "should nest under paramChildren with Pranch" {
				expect(
					pt.ParamTrie.ofPath([pt.ParamBranch.Param('foo')], 'a')
				).to.eq(
					new pt.ParamTrie(
						Op.None,
						im.Map(),
						im.Map({'foo': pt.ParamTrie.of('a')})
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
						Op.None,
						im.Map({'foo': pt.ParamTrie.ofPath([
							pt.ParamBranch.Branch('bar')
						], 'a')}),
						im.Map()
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
						Op.None,
						im.Map(),
						im.Map({'foo': pt.ParamTrie.ofPath([
							pt.ParamBranch.Param('bar')
						], 'a')})
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
						Op.None,
						im.Map({'foo': pt.ParamTrie.ofPath([
							pt.ParamBranch.Param('bar')
						], 'a')}),
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
						Op.None,
						im.Map(),
						im.Map({'foo': pt.ParamTrie.ofPath([
							pt.ParamBranch.Branch('bar')
						], 'a')})
					)
				);
			}
		}
	}

	describe "lookup" {
		describe "with empty path" {
			it "should return value (none)" {
				var t = pt.ParamTrie.empty();
				expect(
					t.lookup([])
				).to.eq([
					pt.LookupResult(Op.None, im.Map())
				]);
			}

			it "should return value (some)" {
				var t = pt.ParamTrie.of("a");
				expect(
					t.lookup([])
				).to.eq([
					pt.LookupResult(Op.Some("a"), im.Map())
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
					Op.None,
					im.Map([[
						pt.ParamBranch.Branch('foo'),
						pt.ParamTrie.of("a")
					]]),
					im.Map([
						[pt.ParamBranch.Param('bar'), pt.ParamTrie.of("b")]
						[pt.ParamBranch.Param('baz'), pt.ParamTrie.of("c")]
					])
				);

				expect(
					t.lookup(['foo'])
				).to.eq([
					pt.LookupResult(Op.Some("a"), im.Map()),
					pt.LookupResult(Op.Some("b"), im.Map({bar:'foo'})),
					pt.LookupResult(Op.Some("c"), im.Map({baz:'foo'}))
				]);
			}
		}
	}

	describe "lookupOne" {
		describe "with empty path" {
			it "should return value (none)" {
				var t = pt.ParamTrie.empty();
				expect(
					t.lookupOne([])
				).to.eq(Op.None);
			}

			it "should return value (some)" {
				var t = pt.ParamTrie.of("a");
				expect(
					t.lookupOne([])
				).to.eq(Op.Some(
					pt.LookupResult("a", im.Map())
				));
			}
		}

		describe "with non-empty path" {
			it "should recurse when path matches branch" {
				var t = pt.ParamTrie.ofPath([
					pt.ParamBranch.Branch('foo')
				], 'a');

				expect(
					t.lookupOne(['foo'])
				).to.eq(
					pt.ParamTrie.of("a").lookupOne([])
				);
			}

			it "should recurse when path matches param and add to map" {
				var t = pt.ParamTrie.ofPath([
					pt.ParamBranch.Param('foo')
				], 'a');

				var r = pt.ParamTrie.of("a").lookupOne([]).map(λ x -> {
					return pt.LookupResult(x.value, im.Map({foo: 'bar'}))
				});

				expect(
					t.lookupOne(['bar'])
				).to.eq(r);
			}
		}

		describe "with multiple potential results" {
			it "should return the first result" {// TODO: most specific
				var t = new pt.ParamTrie(
					Op.None,
					im.Map({foo: pt.ParamTrie.of("a")}),
					im.Map({
						bar: pt.ParamTrie.of("b"),
						baz: pt.ParamTrie.of("c")
					})
				);

				expect(
					t.lookupOne(['foo'])
				).to.eq(Op.Some(
					pt.LookupResult("a", im.Map())
				));
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

			it "should use second value if both" {
				var t1 = pt.ParamTrie.of('a');
				var t2 = pt.ParamTrie.of('b');

				expect(t1.merge(t2)).to.eq(
					pt.ParamTrie.of('b')
				);
				expect(t2.merge(t1)).to.eq(
					pt.ParamTrie.of('a')
				);
			}
		}
	}
}