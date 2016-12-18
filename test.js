var ParamTrie = require('./');
var expect = require('expect.js');
var i = require('util').inspect;
var eq = require('@quarterto/eq');

expect.Assertion.prototype.eq = function (obj) {
    this.assert(eq(this.obj, obj), function () {
        return 'expected ' + i(this.obj) + ' to equal ' + i(obj);
    }, function () {
        return 'expected ' + i(this.obj) + ' to not equal ' + i(obj);
    });
    return this;
};

describe('ParamTrie', function () {
    describe('empty', function () {
        it('should create a trie', function () {
            expect(ParamTrie.empty()).to.be.a(ParamTrie);
        });
        it('should have no value', function () {
            expect(ParamTrie.empty().value).to.eq([]);
        });
        it('should create empty things', function () {
            var t = ParamTrie.empty();
            expect(t.param).to.eq({});
            expect(t.branch).to.eq({});
        });
    });
    describe('of', function () {
        it('should create a trie', function () {
            expect(ParamTrie.of()).to.be.a(ParamTrie);
        });
        it('should have a value', function () {
            var t = ParamTrie.of('a');
            expect(t.value).to.contain('a');
        });
        it('should create empty things', function () {
            var t = ParamTrie.of();
            expect(t.children).to.eq(new Map());
        });
    });
    describe('ofPath', function () {
        describe('with an empty path', function () {
            it('should be of', function () {
                expect(ParamTrie.ofPath([], 'a')).to.eq(ParamTrie.of('a'));
            });
        });
        describe('with a path', function () {
            it('should nest under children with Branch', function () {
                expect(ParamTrie.ofPath([ParamTrie.branch('foo')], 'a')).to.eq(new ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie.of('a')
                    ]])));
            });
            it('should nest under paramChildren with Pranch', function () {
                expect(ParamTrie.ofPath([ParamTrie.param('foo')], 'a')).to.eq(new ParamTrie([], new Map([[
                        ParamTrie.param('foo'),
                        ParamTrie.of('a')
                    ]])));
            });
            it('should recurse multiple branches', function () {
                expect(ParamTrie.ofPath([
                    ParamTrie.branch('foo'),
                    ParamTrie.branch('bar')
                ], 'a')).to.eq(new ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie.ofPath([ParamTrie.branch('bar')], 'a')
                    ]])));
            });
            it('should recurse multiple params', function () {
                expect(ParamTrie.ofPath([
                    ParamTrie.param('foo'),
                    ParamTrie.param('bar')
                ], 'a')).to.eq(new ParamTrie([], new Map([[
                        ParamTrie.param('foo'),
                        ParamTrie.ofPath([ParamTrie.param('bar')], 'a')
                    ]])));
            });
            it('should recurse mixed branch and param', function () {
                expect(ParamTrie.ofPath([
                    ParamTrie.branch('foo'),
                    ParamTrie.param('bar')
                ], 'a')).to.eq(new ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie.ofPath([ParamTrie.param('bar')], 'a')
                    ]]), new Map()));
            });
            it('should recurse mixed param and branch', function () {
                expect(ParamTrie.ofPath([
                    ParamTrie.param('foo'),
                    ParamTrie.branch('bar')
                ], 'a')).to.eq(new ParamTrie([], new Map([[
                        ParamTrie.param('foo'),
                        ParamTrie.ofPath([ParamTrie.branch('bar')], 'a')
                    ]])));
            });
        });
    });
    describe('lookup', function () {
        describe('with empty path', function () {
            it('should return nothing', function () {
                var t = ParamTrie.empty();
                expect(t.lookup([])).to.eq([]);
            });
            it('should return value (non-empty)', function () {
                var t = ParamTrie.of('a');
                expect(t.lookup([])).to.eq([LookupResult(['a'], new Map())]);
            });
        });
        describe('with non-empty path', function () {
            it('should recurse when path matches branch', function () {
                var t = ParamTrie.ofPath([ParamTrie.branch('foo')], 'a');
                expect(t.lookup(['foo'])).to.eq(ParamTrie.of('a').lookup([]));
            });
            it('should recurse when path matches param and add to map', function () {
                var t = ParamTrie.ofPath([ParamTrie.param('foo')], 'a');
                var r = ParamTrie.of('a').lookup([])[0];
                expect(t.lookup(['bar'])).to.eq([LookupResult(r.value, new Map([['foo', 'bar']]))]);
            });
        });
        describe('with multiple potential results', function () {
            it('should return an array of concrete and param results', function () {
                var t = new ParamTrie([], new Map([
                    [
                        ParamTrie.branch('foo'),
                        ParamTrie.of('a')
                    ],
                    [
                        ParamTrie.param('bar'),
                        ParamTrie.of('b')
                    ],
                    [
                        ParamTrie.param('baz'),
                        ParamTrie.of('c')
                    ]
                ]));
                expect(t.lookup(['foo'])).to.eq([
                    LookupResult(['a'], new Map()),
                    LookupResult(['b'], new Map({ bar: 'foo' })),
                    LookupResult(['c'], new Map({ baz: 'foo' }))
                ]);
            });
        });
        describe('with potential empty results', function () {
            it('should only return non-empty results', function () {
                var t = new ParamTrie([], new Map([
                    [
                        ParamTrie.param('foo'),
                        ParamTrie.empty()
                    ],
                    [
                        ParamTrie.param('bar'),
                        ParamTrie.of('b')
                    ],
                    [
                        ParamTrie.param('baz'),
                        ParamTrie.empty()
                    ]
                ]));
                expect(t.lookup(['foo'])).to.eq([LookupResult(['b'], new Map({ bar: 'foo' }))]);
            });
        });
    });
    describe('merge', function () {
        describe('shallow tries', function () {
            it('should keep nothing', function () {
                var t1 = ParamTrie.empty();
                var t2 = ParamTrie.empty();
                expect(t1.merge(t2)).to.eq(ParamTrie.empty());
                expect(t2.merge(t1)).to.eq(ParamTrie.empty());
            });
            it('should prefer values', function () {
                var t1 = ParamTrie.empty();
                var t2 = ParamTrie.of('a');
                expect(t1.merge(t2)).to.eq(ParamTrie.of('a'));
                expect(t2.merge(t1)).to.eq(ParamTrie.of('a'));
            });
            it('should concat the values', function () {
                var t1 = ParamTrie.of('a');
                var t2 = ParamTrie.of('b');
                expect(t1.merge(t2)).to.eq(new ParamTrie([
                    'a',
                    'b'
                ], new Map()));
            });
        });
    });
    describe('fromMap', function () {
        it('should convert empty map to empty trie', function () {
            expect(ParamTrie.fromMap(new Map())).to.eq(ParamTrie.empty());
        });
        describe('with single-item keys', function () {
            it('should add one branch key to trie', function () {
                expect(ParamTrie.fromMap(new Map([[
                        [ParamTrie.branch('foo')],
                        'bar'
                    ]]))).to.eq(ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie.of('bar')
                    ]])));
            });
            it('should add a few branch keys to trie', function () {
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
                ]))).to.eq(ParamTrie([], new Map([
                    [
                        ParamTrie.branch('foo'),
                        ParamTrie.of('a')
                    ],
                    [
                        ParamTrie.branch('bar'),
                        ParamTrie.of('b')
                    ],
                    [
                        ParamTrie.branch('baz'),
                        ParamTrie.of('c')
                    ]
                ])));
            });
            it('should merge duplicate branch keys', function () {
                expect(ParamTrie.fromMap(new Map([
                    [
                        [ParamTrie.branch('foo')],
                        'a'
                    ],
                    [
                        [ParamTrie.branch('foo')],
                        'b'
                    ]
                ]))).to.eq(ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie([
                            'a',
                            'b'
                        ], new Map())
                    ]])));
            });
            it('should add one param key to trie', function () {
                expect(ParamTrie.fromMap(new Map([[
                        [ParamTrie.param('foo')],
                        'bar'
                    ]]))).to.eq(ParamTrie([], new Map([[
                        ParamTrie.param('foo'),
                        ParamTrie.of('bar')
                    ]])));
            });
            it('should add a few param keys to trie', function () {
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
                ]))).to.eq(ParamTrie([], new Map([
                    [
                        ParamTrie.param('foo'),
                        ParamTrie.of('a')
                    ],
                    [
                        ParamTrie.param('bar'),
                        ParamTrie.of('b')
                    ],
                    [
                        ParamTrie.param('baz'),
                        ParamTrie.of('c')
                    ]
                ])));
            });
            it('should add mixed keys to the trie', function () {
                expect(ParamTrie.fromMap(new Map([
                    [
                        [ParamTrie.param('foo')],
                        'a'
                    ],
                    [
                        [ParamTrie.branch('bar')],
                        'b'
                    ]
                ]))).to.eq(ParamTrie([], new Map([
                    [
                        ParamTrie.param('foo'),
                        ParamTrie.of('a')
                    ],
                    [
                        ParamTrie.branch('bar'),
                        ParamTrie.of('b')
                    ]
                ])));
            });
        });
        describe('longer keys', function () {
            it('should nest a single key of branches', function () {
                expect(ParamTrie.fromMap(new Map([[
                        [
                            ParamTrie.branch('foo'),
                            ParamTrie.branch('bar')
                        ],
                        'baz'
                    ]]))).to.eq(ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie([], new Map([[
                                ParamTrie.branch('bar'),
                                ParamTrie.of('baz')
                            ]]))
                    ]])));
            });
            it('should nest a single key of params', function () {
                expect(ParamTrie.fromMap(new Map([[
                        [
                            ParamTrie.param('foo'),
                            ParamTrie.param('bar')
                        ],
                        'baz'
                    ]]))).to.eq(ParamTrie([], new Map([[
                        ParamTrie.param('foo'),
                        ParamTrie([], new Map([[
                                ParamTrie.param('bar'),
                                ParamTrie.of('baz')
                            ]]))
                    ]])));
            });
            it('should merge multiple keys', function () {
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
                ]))).to.eq(ParamTrie([], new Map([[
                        ParamTrie.branch('foo'),
                        ParamTrie([], new Map([
                            [
                                ParamTrie.branch('bar'),
                                ParamTrie.of('a')
                            ],
                            [
                                ParamTrie.branch('baz'),
                                ParamTrie.of('b')
                            ]
                        ]))
                    ]])));
            });
        });
    });
    describe('indent', function () {
        it('should indent a trie with a branch', function () {
            expect(ParamTrie.of('a').indent([ParamTrie.branch('foo')])).to.eq(ParamTrie.ofPath([ParamTrie.branch('foo')], 'a'));
        });
        it('should indent a trie with some branches', function () {
            expect(ParamTrie.of('a').indent([
                ParamTrie.branch('foo'),
                ParamTrie.branch('bar')
            ])).to.eq(ParamTrie.ofPath([
                ParamTrie.branch('foo'),
                ParamTrie.branch('bar')
            ], 'a'));
        });
        it('should indent a trie with a param', function () {
            expect(ParamTrie.of('a').indent([ParamTrie.param('foo')])).to.eq(ParamTrie.ofPath([ParamTrie.param('foo')], 'a'));
        });
        it('should indent a trie with some branches', function () {
            expect(ParamTrie.of('a').indent([
                ParamTrie.param('foo'),
                ParamTrie.param('bar')
            ])).to.eq(ParamTrie.ofPath([
                ParamTrie.param('foo'),
                ParamTrie.param('bar')
            ], 'a'));
        });
        it('should indent a trie with a mixed path', function () {
            expect(ParamTrie.of('a').indent([
                ParamTrie.param('foo'),
                ParamTrie.branch('bar')
            ])).to.eq(ParamTrie.ofPath([
                ParamTrie.param('foo'),
                ParamTrie.branch('bar')
            ], 'a'));
        });
        it('should indent a trie that already has a phat', function () {
            expect(ParamTrie.ofPath([ParamTrie.branch('foo')], 'a').indent([ParamTrie.branch('bar')])).to.eq(ParamTrie.ofPath([
                ParamTrie.branch('bar'),
                ParamTrie.branch('foo')
            ], 'a'));
        });
    });
});
