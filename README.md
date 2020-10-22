## Information

This package is based on [gulp-ast](https://github.com/andyscott/gulp-ast), and replicates its base functionality
while supporting ECMAScript 2020 syntax.

`gulp-js-ast` is a [gulp](https://gulpjs.com/) plugin that allows to parse Javascript files into Abstract Syntax Trees.

## Installation

`npm install --save-dev gulp-js-ast`

## Usage example

The following code sample searches for all instances of `console.log` calls in the code, and replaces them with `myLog.log`:

```javascript
const AST = require('gulp-ast');

const findAndReplaceLogCalls = function() {
  return AST.transform(function(ast) {
    return AST.traverse(ast, function(node) {
      const callee = node.callee;
      if (callee == null) return;
      if (node.type !== 'CallExpression') return;
      if (callee.type !== 'MemberExpression') return;
      const nested = callee.object;
      if (nested.type !== 'MemberExpression') return;
      if (nested.object.type !== 'Identifier') return;
      if (nested.object.name !== 'console') return;
      if (nested.property.type !== 'Identifier') return;
      if (nested.property.name !== 'API') return;

      if (callee.property.name === 'log') {
        callee.object = {
          type: 'Identifier',
          name: 'myLog'
        };
      }
    });
  });
};

exports.replaceLog = function() {
  gulp.src('./src/*.js')
    .pipe(AST.parse({
      ecmaVersion: 2020
    }))
    .pipe(findAndReplaceLogCalls())
    .pipe(AST.render())
    .pipe(gulp.dest('./lib/'));
}
```

It is also possible to easily rewrite the require paths. The following example replaces all the occurrences of
`require('path/to/module')` with `require('prefix/path/to/module')`

```javascript
const AST = require('gulp-js-ast');

exports.addRequirePrefix = function() {
  gulp.src('./src/**/*.js')
    .pipe(AST.parse())
    .pipe(AST.rewriteRequire(name => `prefix/${name}`))
    .pipe(AST.render())
    .pipe(gulp.dest('./lib/'));
}
```

For the documentation of the parameters accepted by the `AST.parse` function, refer to the [espree docs](https://github.com/eslint/espree).
