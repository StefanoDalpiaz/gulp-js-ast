const through2 = require('through2');
const espree = require('espree');
const escodegen = require('escodegen');

exports.parse = function(opts) {
  return through2.obj(function(file, encoding, cb) {
    try {
      file.ast = espree.parse(String(file.contents), opts);
      this.push(file);
    } catch (_error) {
      this.emit('error', new Error(_error));
    }
    cb();
  });
};

exports.render = function() {
  return through2.obj(function(file, encoding, cb) {
    if (file.ast == null) {
      this.push(file);
    } else {
      try {
        file.contents = Buffer.from(escodegen.generate(file.ast));
        delete file.ast;
        this.push(file);
      } catch (_error) {
        this.emit(_error);
      }
    }
    cb();
  });
};

function transform (fn) {
  return through2.obj(function(file, encoding, cb) {
    if (file.ast != null) {
      fn.call({ file }, file.ast);
    }
    this.push(file);
    cb();
  });
};

exports.transform = transform;

function traverse(node, cb) {
  if (Array.isArray(node)) {
    node.forEach(function(n) { traverse(n, cb); });
  } else if (node !== null && typeof node === 'object') {
    cb(node);
    Object.keys(node).forEach(function(key) { traverse(node[key], cb); });
  }
}

exports.traverse = traverse;

exports.rewriteRequire = function(renameFn) {
  return transform(function(ast) {
    traverse(ast, function(node) {
      if (
        node.type === 'CallExpression' &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length > 0 &&
        node.arguments[0].type === 'Literal'
      ) {
        mappedName = renameFn(node.arguments[0].value);
        if (mappedName != null) {
          node.arguments[0].value = mappedName;
        }
      }
    });
  });
};
