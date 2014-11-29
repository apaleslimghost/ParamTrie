var pt = require('./index.js');
var expect = require('expect.js');
var im = require('immutable');
var Op = require('fantasy-options');
var i  = require('util').inspect;
var Eq = require('adt-simple').Eq;

function opeq(a, b) {
	return a.cata({
		None: λ -> b === Op.None,
		Some: λ x -> eq(b.x, x)
	});
}

function eq {
	(a @ im.Map, b @ im.Map) => im.is(a, b),
	(a @ {equals}, b) => a.equals(b),
	(a @ Op, b @ Op) => opeq(a, b),
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
}