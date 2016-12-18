<h1 align="center">
param-trie<br>
<a href="https://travis-ci.org/quarterto/ParamTrie" id="status-image-popup">
  <img src="https://travis-ci.org/quarterto/ParamTrie.svg" alt="Build status">
</a>
</h1>

## What's a param trie?
It's like a trie but with holes that get filled in when you look up a result. So, given the map

<img src="images/paths.png" width="387">

we get the trie

<img src="images/trie.png" width="221">

and those red parameters get filled in when we look up:

<img src="images/lookup.png" width="223">

## Usage

```javascript
const ParamTrie = require('param-trie');
const {param, branch} = ParamTrie;

var t = ParamTrie.ofPath([
	branch('a'),
	branch('b'),
	param('c')
], 'foo');

t.lookup(['a', 'b', 'x']); //⇒ [{value: 'foo', params: {c: 'x'}}]

var t2 = t.insertPath([
	branch('a'),
	param('d'),
	branch('e')
], 'bar');

t2.lookup(['a', 'x', 'e']); //⇒ [{value: 'bar', params: {d: 'x'}}]
```

## Api
### Creating a `ParamTrie`
#### The hard way: `ParamTrie` constructor
##### `new ParamTrie(values, {param, branch})`

Takes single value or an array of values and an object listing the trie's children. The object should have keys `param` and `branch`, each being an object listing children of that type, with keys as names of params or text of branches and values as the `ParamTrie` child.

#### For little tries: `empty` and `of`
##### `ParamTrie.empty()`
Returns a trie with no values and no children.

##### `ParamTrie.of(value)`
Returns a trie with a single value or array of values and no children.

#### For narrow tries: `ofPath`
##### `ParamTrie.ofPath(path, value)`

Creates a nested trie with the heirarchy as given by `path`. `ParamTrie.ofPath([], x)` is equivalent to `ParamTrie.of(x)`.

#### The easy way: `fromMap`
##### `ParamTrie.fromMap(map)`

Given a `Map` of paths to values, build an entire trie with the correct heirarchy.

### Methods
#### `trie.merge(other)`

Combines two tries immutably; returns a new trie and leaves the originals unmodified. When paths collide, they're merged recursively. Values at the same path are concatenated.

#### `trie.insertPath(path, value)`

Special case of merge for a single path. Equivalent to `trie.merge(ParamTrie.ofPath(path, value))`.

#### `trie.lookup(path)`

Returns all of the matches of a particular path. Since multiple parameterised paths can match a given lookup path and a trie can have multiple values, `lookup` returns an array of results.

The values of the returned array are objects with keys `value` and `params`. `value` is the value at the resolved point in the tree. `params` is an object containing concrete values of params found in the heirarchy, filled in from the lookup path. If the lookup resolves to a trie with multiple values, returns one result for each value.

#### `trie.indent(path)`

Returns the trie nested under the path. `ParamTrie.ofPath(p, v)` is equivalent to `ParamTrie.of(v).indent(p)`.

## Licence
MIT.
