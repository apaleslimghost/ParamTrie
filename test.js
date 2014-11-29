var pt = require('./index.js');
var expect = require('expect.js');
var im = require('immutable');
var op = require('fantasy-options');
var i = require('util').inspect;
expect.Assertion.prototype.immutableEq = function (obj) {
    this.assert(im.is(obj, this.obj), function () {
        return 'expected ' + i(this.obj) + ' to equal ' + i(obj);
    }, function () {
        return 'expected ' + i(this.obj) + ' to not equal ' + i(obj);
    });
    return this;
};
describe('ParamTrie', function () {
    describe('empty', function () {
        it('should create a trie', function () {
            expect(pt.ParamTrie.empty()).to.be.a(pt.ParamTrie);
        });
        it('should have no value', function () {
            expect(pt.ParamTrie.empty()).to.have.property('value', op.None);
        });
        it('should create empty things', function () {
            var t = pt.ParamTrie.empty();
            expect(t.children).to.immutableEq(im.Map());
            expect(t.paramChildren).to.immutableEq(im.Map());
        });
    });
    describe('of', function () {
        it('should create a trie', function () {
            expect(pt.ParamTrie.of()).to.be.a(pt.ParamTrie);
        });
        it('should have a value', function () {
            var t = pt.ParamTrie.of('a');
            expect(t.value).to.be.a(op.Some);
            t.value.cata({
                None: function () {
                    return expect().fail('Not none');
                },
                Some: function (x) {
                    return expect(x).to.be('a');
                }
            });
        });
        it('should create empty things', function () {
            var t = pt.ParamTrie.of();
            expect(t.children).to.immutableEq(im.Map());
            expect(t.paramChildren).to.immutableEq(im.Map());
        });
    });
});