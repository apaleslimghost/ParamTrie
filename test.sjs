var pt = require('./index.js');
var expect = require('expect.js');
var im = require('immutable');
var op = require('fantasy-options');
var i  = require('util').inspect;

expect.Assertion.prototype.immutableEq = function(obj) {
	this.assert(
		im.is(obj, this.obj),
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
			expect(pt.ParamTrie.empty()).to.have.property('value', op.None);
		}

		it "should create empty things" {
			var t = pt.ParamTrie.empty();
			expect(t.children).to.immutableEq(im.Map());
			expect(t.paramChildren).to.immutableEq(im.Map());
		}
	}

	describe "of" {
		it "should create a trie" {
			expect(pt.ParamTrie.of()).to.be.a(pt.ParamTrie);
		}

		it "should have a value" {
			var t = pt.ParamTrie.of('a')
			expect(t.value).to.be.a(op.Some);
			t.value.cata({
				None: λ -> expect().fail('Not none'),
				Some: λ x -> expect(x).to.be('a')
			});
		}

		it "should create empty things" {
			var t = pt.ParamTrie.of();
			expect(t.children).to.immutableEq(im.Map());
			expect(t.paramChildren).to.immutableEq(im.Map());
		}
	}
}