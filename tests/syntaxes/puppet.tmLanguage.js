var expect = require('expect.js');

function getLineTokens(grammar, content) {
  var tokens = grammar.tokenizeLine(content).tokens;

  for (var i = 0; i < tokens.length; i++) {
    tokens[i]['value'] = content.substring(tokens[i]['startIndex'], tokens[i]['endIndex']);
    // We only care about value and scopes. Delete the other keys.
    delete tokens[i]['startIndex'];
    delete tokens[i]['endIndex'];
  }

  return tokens;
}

describe('puppet.tmLanguage', function() {
  var Registry = require('vscode-textmate').Registry;
  var registry = new Registry();
  var grammar = registry.loadGrammarFromPathSync('./syntaxes/puppet.tmLanguage');

  it("default scope is source.puppet", function() {
    var tokens = getLineTokens(grammar, '');

    expect(tokens[0]).to.eql({value: '', scopes: ['source.puppet']});
  });


  describe('separators', function() {
    it("tokenizes attribute separator", function() {
      var tokens = getLineTokens(grammar, 'ensure => present');
      expect(tokens[1]).to.eql({value: '=>', scopes: ['source.puppet', 'punctuation.separator.key-value.puppet']});
    });

    it("tokenizes attribute separator with string values", function() {
      var tokens = getLineTokens(grammar, 'ensure => "present"');
      expect(tokens[1]).to.eql({value: '=>', scopes: ['source.puppet', 'punctuation.separator.key-value.puppet']});
    });
  });


  describe('numbers', function() {
    var hexTestCases = ['0xff', '0xabcdef0123456789', '0x0']
    var integerTestCases = ['10', '0', '-9', '10000']
    var octalTestCases = ['077', '01234567', '00']
    var floatingPointTestCases = ['+1.0e2', '-1.0e-2', '1.0', '1.0e0']
    var notANumberTestCases = ['abc', '0xg123', '.1', '+1.0eas']

    var contexts = {
      'variable assignment': { 'manifest': "$var = ##TESTCASE##", 'expectedTokenIndex': 3 },
      'beginning of array': { 'manifest': "$var = [##TESTCASE##, 'abc']", 'expectedTokenIndex': 3 },
      'end of array': { 'manifest': "$var = ['abc', ##TESTCASE##]", 'expectedTokenIndex': 7 },
      'middle of array': { 'manifest': "$var = ['abc', ##TESTCASE##, 1.0]", 'expectedTokenIndex': 7 },
      'hash value': { 'manifest': "$var = { 'abc' => ##TESTCASE##}", 'expectedTokenIndex': 9 }
    }
    for(var contextName in contexts) {
      context(contextName, function() {
        describe('hex', function() {
          hexTestCases.forEach(function(testCase){
            it(testCase, function() {
              var manifest = contexts[contextName]['manifest'].replace('##TESTCASE##', testCase)
              var tokenIndex = contexts[contextName]['expectedTokenIndex']
              var tokens = getLineTokens(grammar, manifest);
              expect(tokens[tokenIndex]).to.eql({value: testCase, scopes: ['source.puppet', 'constant.numeric.hexadecimal.puppet']});
            });
          });
        });

        describe('integer', function() {
          integerTestCases.forEach(function(testCase){
            it(testCase, function() {
              var manifest = contexts[contextName]['manifest'].replace('##TESTCASE##', testCase)
              var tokenIndex = contexts[contextName]['expectedTokenIndex']
              var tokens = getLineTokens(grammar, manifest);
              expect(tokens[tokenIndex]).to.eql({value: testCase, scopes: ['source.puppet', 'constant.numeric.integer.puppet']});
            });
          });
        });

        describe('octal', function() {
          octalTestCases.forEach(function(testCase){
            it(testCase, function() {
              var manifest = contexts[contextName]['manifest'].replace('##TESTCASE##', testCase)
              var tokenIndex = contexts[contextName]['expectedTokenIndex']
              var tokens = getLineTokens(grammar, manifest);
              expect(tokens[tokenIndex]).to.eql({value: testCase, scopes: ['source.puppet', 'constant.numeric.integer.puppet']});
            });
          });
        });

        describe('floating point', function() {
          floatingPointTestCases.forEach(function(testCase){
            it(testCase, function() {
              var manifest = contexts[contextName]['manifest'].replace('##TESTCASE##', testCase)
              var tokenIndex = contexts[contextName]['expectedTokenIndex']
              var tokens = getLineTokens(grammar, manifest);
              expect(tokens[tokenIndex]).to.eql({value: testCase, scopes: ['source.puppet', 'constant.numeric.integer.puppet']});
            });
          });
        });

        describe('not a number', function() {
          notANumberTestCases.forEach(function(testCase){
            it(testCase, function() {
              var manifest = contexts[contextName]['manifest'].replace('##TESTCASE##', testCase)
              var tokenIndex = contexts[contextName]['expectedTokenIndex']
              var tokens = getLineTokens(grammar, manifest);
              // Not a big fan of this, but don't know how to express "undefined OR not equal to..."
              if (tokens[tokenIndex] == undefined) {
                expect(tokens[tokenIndex]).to.be(undefined)
              } else {
                expect(tokens[tokenIndex]).to.not.be({value: testCase, scopes: ['source.puppet', 'constant.numeric.hexadecimal.puppet']});
                expect(tokens[tokenIndex]).to.not.be({value: testCase, scopes: ['source.puppet', 'constant.numeric.integer.puppet']});
              }
            });
          });
        });
      });
    };
  });

  describe('arrays', function() {
    it("tokenizes line comments", function() {
      var tokens = getLineTokens(grammar, "package{ [\n'element1', # This is a comment\n'element2']:\nensure => present\n}")

      expect(tokens[7]).to.eql({value: '#', scopes: ['source.puppet', 'meta.array.puppet', 'comment.line.number-sign.puppet', 'punctuation.definition.comment.puppet']});
      expect(tokens[8]).to.eql({value: ' This is a comment\n', scopes: ['source.puppet', 'meta.array.puppet', 'comment.line.number-sign.puppet']});
    });
  });

  describe('puppet tasks and plans', function() {
    it("tokenizes plan keyword", function() {
      var tokens = getLineTokens(grammar, "plan mymodule::my_plan() {}")
      expect(tokens[0]).to.eql({value: 'plan', scopes: ['source.puppet', 'meta.definition.plan.puppet', 'storage.type.puppet']});
    });
  });

  describe('data types', function() {
    var contexts = {
      'in class parameters': { 'manifest': "class class_name(\n  ##TESTCASE##) {}", 'expectedTokenIndex': 4, 'scopesPrefix': ['source.puppet', 'meta.definition.class.puppet'] },
      'in class body':       { 'manifest': "class class_name() {\n  ##TESTCASE##\n}", 'expectedTokenIndex': 5, 'scopesPrefix': ['source.puppet'] },
      'in manifest root':    { 'manifest': "##TESTCASE##}", 'expectedTokenIndex': 0, 'scopesPrefix': ['source.puppet'] },
      'in plan parameters':  { 'manifest': "plan plan_name(\n  ##TESTCASE##) {}", 'expectedTokenIndex': 4, 'scopesPrefix': ['source.puppet', 'meta.definition.plan.puppet'] },
    }

    for(var contextName in contexts) {
      context(contextName, function() {
        var tokenIndex = contexts[contextName]['expectedTokenIndex']
        var scopesPrefix = contexts[contextName]['scopesPrefix']
        var manifest = contexts[contextName]['manifest']

        it("tokenizes scalar parameter types", function() {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'String $testvar'))
          expect(tokens[tokenIndex]).to.eql({value: 'String', scopes: scopesPrefix.concat(['storage.type.puppet'])});
        });

        it("tokenizes scalar parameter variable assignment", function() {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'String $testvar = "abc123"'))
          expect(tokens[tokenIndex]).to.eql({value: 'String', scopes: scopesPrefix.concat(['storage.type.puppet'])});
        });

        it("tokenizes qualified scalar parameter types", function() {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'MyModule12::String $testvar = "abc123"'))
          expect(tokens[tokenIndex+0]).to.eql({value: 'MyModule12', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+1]).to.eql({value: '::', scopes: scopesPrefix.concat([])});
          expect(tokens[tokenIndex+2]).to.eql({value: 'String', scopes: scopesPrefix.concat(['storage.type.puppet'])});
        });

        it("tokenizes array parameter types", function() {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'Array[String] $testvar'))
          expect(tokens[tokenIndex+0]).to.eql({value: 'Array', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+1]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+2]).to.eql({value: 'String', scopes: scopesPrefix.concat(['meta.array.puppet', 'storage.type.puppet'])});
          expect(tokens[tokenIndex+3]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
        });

        it("tokenizes nested array parameter types", function() {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'Array[String[1]] $testvar'))
          expect(tokens[tokenIndex+0]).to.eql({value: 'Array', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+1]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+2]).to.eql({value: 'String', scopes: scopesPrefix.concat(['meta.array.puppet', 'storage.type.puppet'])});
          expect(tokens[tokenIndex+3]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+4]).to.eql({value: '1', scopes: scopesPrefix.concat(['meta.array.puppet', 'meta.array.puppet', 'constant.numeric.integer.puppet'])});
          expect(tokens[tokenIndex+5]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
          expect(tokens[tokenIndex+6]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
        });

        it("tokenizes qualified nested array parameter types", function() {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'Array[MyModule::String[1]] $testvar'))
          expect(tokens[tokenIndex+0]).to.eql({value: 'Array', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+1]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+2]).to.eql({value: 'MyModule', scopes: scopesPrefix.concat(['meta.array.puppet', 'storage.type.puppet'])});
          expect(tokens[tokenIndex+3]).to.eql({value: '::', scopes: scopesPrefix.concat(['meta.array.puppet'])});
          expect(tokens[tokenIndex+4]).to.eql({value: 'String', scopes: scopesPrefix.concat(['meta.array.puppet', 'storage.type.puppet'])});
          expect(tokens[tokenIndex+5]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+6]).to.eql({value: '1', scopes: scopesPrefix.concat(['meta.array.puppet', 'meta.array.puppet', 'constant.numeric.integer.puppet'])});
          expect(tokens[tokenIndex+7]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
          expect(tokens[tokenIndex+8]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
        });
      });
    };

    context('in class parameters with inherits', function() {
      // Currently the inherits matcher is overzealous and this test fails.
      it("tokenizes scalar parameter types", function() {
        var tokens = getLineTokens(grammar, "class class_name inherits other_class(\n  String $testvar) {}")
        expect(tokens[6]).to.eql({value: 'other_class', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.definition.class.inherits.puppet', 'support.type.puppet']});
        expect(tokens[8]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
      });
    });
  });


  describe('blocks', function() {
    it("tokenizes single quoted node", function() {
      var tokens = getLineTokens(grammar, "node 'hostname' {")
      expect(tokens[0]).to.eql({value: 'node', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
    });

    it("tokenizes double quoted node", function() {
      var tokens = getLineTokens(grammar, 'node "hostname" {')
      expect(tokens[0]).to.eql({value: 'node', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
    });

    it("tokenizes non-default class parameters", function() {
      var tokens = getLineTokens(grammar, 'class "classname" ($myvar) {')
      expect(tokens[5]).to.eql({value: '$', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[6]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes default class parameters", function() {
      var tokens = getLineTokens(grammar, 'class "classname" ($myvar = "myval") {')
      expect(tokens[5]).to.eql({value: '$', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[6]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes non-default class parameter types", function() {
      var tokens = getLineTokens(grammar, 'class "classname" (String $myvar) {')
      expect(tokens[5]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
      expect(tokens[8]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes default class parameter types", function() {
      var tokens = getLineTokens(grammar, 'class "classname" (String $myvar = "myval") {')
      expect(tokens[5]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
      expect(tokens[8]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });


    it("tokenizes include as an include function", function() {
      var tokens = getLineTokens(grammar, "contain foo")
      expect(tokens[0]).to.eql({value: 'contain', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
    });

    it("tokenizes contain as an include function", function() {
      var tokens = getLineTokens(grammar, 'include foo')
      expect(tokens[0]).to.eql({value: 'include', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
    });

    it("tokenizes resource type and string title", function() {
      var tokens = getLineTokens(grammar, "package {'foo':}")
      expect(tokens[0]).to.eql({value: 'package', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
      expect(tokens[2]).to.eql({value: "'foo'", scopes: ['source.puppet', 'meta.definition.resource.puppet', 'entity.name.section.puppet']});
    });

    it("tokenizes resource type and variable title", function() {
      var tokens = getLineTokens(grammar, "package {$foo:}")
      expect(tokens[0]).to.eql({value: 'package', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
      expect(tokens[2]).to.eql({value: '$foo', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'entity.name.section.puppet']});
    });

    it("tokenizes require classname as an include", function() {
      var tokens = getLineTokens(grammar, "require ::foo")
      expect(tokens[0]).to.eql({value: 'require', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
    });

    it("tokenizes require => variable as a parameter", function() {
      var tokens = getLineTokens(grammar, "require => Class['foo']")
      expect(tokens[0]).to.eql({value: 'require ', scopes: ['source.puppet', 'constant.other.key.puppet']});
    });

    it("tokenizes regular variables", function() {
      var tokens = getLineTokens(grammar, '$foo')
      expect(tokens[0]).to.eql({value: '$', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[1]).to.eql({value: 'foo', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet']});

      var tokens = getLineTokens(grammar, '$_foo')
      expect(tokens[0]).to.eql({value: '$', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[1]).to.eql({value: '_foo', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet']});

      var tokens = getLineTokens(grammar, '$_foo_')
      expect(tokens[0]).to.eql({value: '$', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[1]).to.eql({value: '_foo_', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet']});

      var tokens = getLineTokens(grammar, '$::foo')
      expect(tokens[0]).to.eql({value: '$', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[1]).to.eql({value: '::foo', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet']});
    });

    it("tokenizes resource types correctly", function() {
      var tokens = getLineTokens(grammar, "file {'/var/tmp':}")
      expect(tokens[0]).to.eql({value: 'file', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});

      var tokens = getLineTokens(grammar, "package {'foo':}")
      expect(tokens[0]).to.eql({value: 'package', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
    });
  });
});
