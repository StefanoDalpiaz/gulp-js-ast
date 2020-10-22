const { expect } = require('chai');
const streamUtil = require('stream');
const gutil = require('gulp-util');
const AST = require('./index');

function makeFile(obj) {
  if (typeof obj === 'string') {
    obj = { contents: Buffer.from(obj) };
  } else if (typeof obj.contents === 'string') {
    obj.contents = Buffer.from(obj.contents);
  }
  const f = new gutil.File(obj);
  Object.keys(obj).forEach((k) => {
    if (!f[k]) {
      f[k] = obj[k];
    }
  });
  return f;
};

describe('AST.parse', function () {
  it('should add .ast to valid file buffers', function (cb) {
    const stream = AST.parse();
    const res = { files: [] };
    stream.on('error', err => res.err = err);
    stream.on('data', file => res.files.push(file));
    stream.on('end', function () {
      expect(res.files).to.have.length(1);
      expect(res.files[0].ast).to.deep.equal({
        body: [{
          end: 5,
          expression: {
            end: 5,
            left: {
              end: 1,
              raw: '1',
              start: 0,
              type: 'Literal',
              value: 1
            },
            operator: '+',
            right: {
              end: 5,
              raw: '2',
              start: 4,
              type: 'Literal',
              value: 2
            },
            start: 0,
            type: 'BinaryExpression'
          },
          start: 0,
          type: 'ExpressionStatement'
        }],
        end: 5,
        sourceType: 'script',
        start: 0,
        type: 'Program'
      });
      cb();
    });
    stream.write(makeFile('1 + 2'));
    stream.end();
  });

  it('should emit an error for invalid js', function (cb) {
    const stream = AST.parse();
    const res = { files: [] };
    stream.on('error', err => res.err = err);
    stream.on('data', file => res.files.push(file));
    stream.on('end', function () {
      expect(res.files).to.have.length(0);
      expect(res.err).to.be.ok;
      cb();
    });
    stream.write(makeFile('\/ invalid??'));
    stream.end();
  });
});

describe('AST.render', function () {
  it('should render valid .ast on vinyl files', function (cb) {
    const stream = AST.render();
    const res = { files: [] };
    stream.on('error', err => res.err = err);
    stream.on('data', file => res.files.push(file));
    stream.on('end', function () {
      expect(res.files).to.have.length(1);
      expect(res.files[0].contents.toString()).to.eql('1 + 2;');
      cb();
    });
    stream.write(makeFile({
      ast: {
        type: 'Program',
        body: [{
          type: 'ExpressionStatement',
          expression: {
            type: 'BinaryExpression',
            operator: '+',
            left: {
              type: 'Literal',
              value: 1
            },
            right: {
              type: 'Literal',
              value: 2
            }
          }
        }]
      }
    }));
    stream.end();
  });
});

describe('AST.parse -> AST.rewriteRequire -> AST.render', function () {
  it('should rewrite the require statement', function (done) {
    const stream = AST.parse();
    streamUtil.pipeline(stream, AST.rewriteRequire(name => `prefix.${name}`), AST.render());
    const res = { files: [] };
    stream.on('error', err => res.err = err);
    stream.on('data', file => res.files.push(file));
    stream.on('end', function () {
      expect(res.files).to.have.length(2);
      expect(res.files[0].contents.toString()).to.equal('require(\'prefix.file1\');');
      expect(res.files[1].contents.toString()).to.equal('require(\'prefix.file2\');');
      done();
    });
    stream.write(makeFile('require(\'file1\');'));
    stream.write(makeFile('require(\'file2\');'));
    stream.end();
  });
});