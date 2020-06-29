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
  this.timeout(20000);

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

  // Reference https://puppet.com/docs/puppet/latest/lang_data_string.html#reference-9324
  describe('heredoc', function () {
    var contexts = {
      'minimal': { 'start': '@(EOT)', 'end': 'EOT', 'scope': 'string.unquoted.heredoc.puppet' },
      'full with no spacing': { 'start': '@(EOT/tsrnL$)', 'end': '|-EOT', 'scope': 'string.unquoted.heredoc.puppet' },
      'full with much spacing': { 'start': '@(   EOT   /   tsrnL$   )', 'end': '|   -   EOT', 'scope': 'string.unquoted.heredoc.puppet' },
      // With interpolation
      'minimal interpolation': { 'start': '@("EOT")', 'end': 'EOT', 'scope': 'string.interpolated.heredoc.puppet' },
      'full interpolation with no spacing': { 'start': '@("EOT"/tsrnL$)', 'end': '|-EOT', 'scope': 'string.interpolated.heredoc.puppet' },
      'full interpolation with much spacing': { 'start': '@(   "EOT"   /   tsrnL$   )', 'end': '|   -   EOT', 'scope': 'string.interpolated.heredoc.puppet' },
    }
    for (var contextName in contexts) {
      context("with a " + contextName + " heredoc statement", function () {
        var testCase = contexts[contextName];
        var manifestTemplate = '$var = ##START##\n  value\n  ##END##\n$string = "value2"\n';
        var manifest = manifestTemplate.replace('##START##', testCase['start']).replace('##END##', testCase['end']);
        var hereDocScope = testCase['scope'];

        it("tokenizes a " + contextName + " heredoc correctly", function () {
          var tokens = getLineTokens(grammar, manifest);
          //console.log(tokens);

          // Ensure it starts
          expect(tokens[3]).to.eql({ value: testCase["start"], scopes: ['source.puppet', hereDocScope, 'punctuation.definition.string.begin.puppet'] });
          // // Ensure text within is part of the heredoc
          expect(tokens[4]).to.eql({ value: "\n  value\n", scopes: ['source.puppet', hereDocScope] });
          // Ensure it ends
          expect(tokens[5]).to.eql({ value: "  " + testCase["end"], scopes: ['source.puppet', hereDocScope, 'punctuation.definition.string.end.puppet'] });
          // Ensure text afterwards is not part of the heredoc
          expect(tokens[8]).to.eql({ value: "string", scopes: ['source.puppet', 'variable.other.readwrite.global.puppet'] });
        });
      });
    };

    // TODO: Test heredoc with unicode escaping
    // TODO: Test interpolation mode actually interpolates tokens
    // TODO: Test adding syntax checking e.g. @(END:json)
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
                expect(tokens[tokenIndex]).to.not.eql({value: testCase, scopes: ['source.puppet', 'constant.numeric.hexadecimal.puppet']});
                expect(tokens[tokenIndex]).to.not.eql({value: testCase, scopes: ['source.puppet', 'constant.numeric.integer.puppet']});
              }
            });
          });
        });
      });
    };
  });

  describe('hashes', function() {
    it("tokenizes line comments", function() {
      var tokens = getLineTokens(grammar, "$x4 = [{ key1 => 'value',\n# comment\n}]")

      token_prefix = [ 'source.puppet', 'meta.array.puppet', 'meta.hash.puppet', 'meta.comment.full-line.puppet', 'comment.line.number-sign.puppet' ]

      expect(tokens[12]).to.eql({value: '#', scopes: token_prefix.concat(['punctuation.definition.comment.puppet'])});
      expect(tokens[13]).to.eql({value: ' comment\n', scopes: token_prefix});
    });
  });

  describe('arrays', function() {
    it("tokenizes line comments", function() {
      var tokens = getLineTokens(grammar, "package{ [\n'element1', # This is a comment\n'element2']:\nensure => present\n}")

      expect(tokens[8]).to.eql({value: '#', scopes: ['source.puppet', 'entity.name.section.puppet', 'meta.array.puppet', 'comment.line.number-sign.puppet', 'punctuation.definition.comment.puppet']});
      expect(tokens[9]).to.eql({value: ' This is a comment\n', scopes: ['source.puppet', 'entity.name.section.puppet', 'meta.array.puppet', 'comment.line.number-sign.puppet']});
    });

    var contexts = {
      'single quoted string': { 'testcase': "'foo'",           'expectedText': 'foo',      'tokenIndex1': 5, 'tokenIndex2':9,  'scopesSuffix': ['string.quoted.single.puppet'] },
      'double quoted string': { 'testcase': "\"foo\"",         'expectedText': 'foo',      'tokenIndex1': 5, 'tokenIndex2':9,  'scopesSuffix': ['string.quoted.double.interpolated.puppet'] },
      'integer':              { 'testcase': "123",             'expectedText': '123',      'tokenIndex1': 4, 'tokenIndex2':6,  'scopesSuffix': ['constant.numeric.integer.puppet'] },
      'variable':             { 'testcase': "$foo::bar",       'expectedText': 'foo::bar', 'tokenIndex1': 5, 'tokenIndex2':8,  'scopesSuffix': ['variable.other.readwrite.global.puppet'] },
      'array':                { 'testcase': "['abc']",         'expectedText': 'abc',      'tokenIndex1': 6, 'tokenIndex2':12, 'scopesSuffix': ['meta.array.puppet', 'string.quoted.single.puppet'] },
      'hash':                 { 'testcase': "{'abc' => 123 }", 'expectedText': 'abc',      'tokenIndex1': 6, 'tokenIndex2':15, 'scopesSuffix': ['meta.hash.puppet', 'string.quoted.single.puppet'] },
    }
    for(var contextName in contexts) {
      context(contextName, function() {
        var testcase = contexts[contextName]['testcase'];
        var expectedText = contexts[contextName]['expectedText'];
        var scopesSuffix = contexts[contextName]['scopesSuffix'];
        var tokenIndex1 = contexts[contextName]['tokenIndex1'];
        var tokenIndex2 = contexts[contextName]['tokenIndex2'];

        it("tokenizes " + contextName + " items within the array", function() {
          // We add the item twice here to make sure it tokenises with a comma delimiting it
          var tokens = getLineTokens(grammar, "$x = [" + testcase + " , " + testcase + "]")

          expect(tokens[tokenIndex1]).to.eql({value: expectedText, scopes: ['source.puppet', 'meta.array.puppet'].concat(scopesSuffix)});
          expect(tokens[tokenIndex2]).to.eql({value: expectedText, scopes: ['source.puppet', 'meta.array.puppet'].concat(scopesSuffix)});
        });
      });
    };
  });

  describe('puppet tasks and plans', function() {
    it("tokenizes plan keyword", function() {
      var tokens = getLineTokens(grammar, "plan mymodule::my_plan() {}")
      expect(tokens[0]).to.eql({value: 'plan', scopes: ['source.puppet', 'meta.definition.plan.puppet', 'storage.type.puppet']});
    });
  });

  describe('data types', function() {
    var contexts = {
      'in class parameters':        { 'manifest': "class class_name(\n  ##TESTCASE##) {}", 'expectedTokenIndex': 4, 'scopesPrefix': ['source.puppet', 'meta.definition.class.puppet'] },
      'in class body':              { 'manifest': "class class_name() {\n  ##TESTCASE##\n}", 'expectedTokenIndex': 5, 'scopesPrefix': ['source.puppet'] },
      'in manifest root':           { 'manifest': " ##TESTCASE##", 'expectedTokenIndex': 1, 'scopesPrefix': ['source.puppet'] },
      'in plan parameters':         { 'manifest': "plan plan_name(\n  ##TESTCASE##) {}", 'expectedTokenIndex': 4, 'scopesPrefix': ['source.puppet', 'meta.definition.plan.puppet'] },
      'in function parameters':     { 'manifest': "function class_name(\n  ##TESTCASE##) {}", 'expectedTokenIndex': 5, 'scopesPrefix': ['source.puppet', 'meta.function.puppet'] },
      'in function body':           { 'manifest': "function class_name() {\n  ##TESTCASE##\n}", 'expectedTokenIndex': 6, 'scopesPrefix': ['source.puppet'] },
      'in defined type parameters': { 'manifest': "define class_name(\n  ##TESTCASE##) {}", 'expectedTokenIndex': 5, 'scopesPrefix': ['source.puppet', 'meta.function.puppet'] },
      'in defined type body':       { 'manifest': "define class_name() {\n  ##TESTCASE##\n}", 'expectedTokenIndex': 6, 'scopesPrefix': ['source.puppet'] },
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

        it("tokenizes singular resource reference", function () {
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', 'Foo_bar["something"] $testvar'))
          expect(tokens[tokenIndex+0]).to.eql({value: 'Foo_bar', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+1]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+3]).to.eql({value: 'something', scopes: scopesPrefix.concat(['meta.array.puppet', 'string.quoted.double.interpolated.puppet'])});
          expect(tokens[tokenIndex+5]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
        });

        it("tokenizes singular qualified resource reference", function () {
          console.log(manifest.replace('##TESTCASE##', '::Foo_bar::Baz["something"] $testvar'));
          var tokens = getLineTokens(grammar, manifest.replace('##TESTCASE##', '::Foo_bar::Baz["something"] $testvar'))
          expect(tokens[tokenIndex+0]).to.eql({value: 'Foo_bar', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+2]).to.eql({value: 'Baz', scopes: scopesPrefix.concat(['storage.type.puppet'])});
          expect(tokens[tokenIndex+3]).to.eql({value: '[', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.begin.puppet'])});
          expect(tokens[tokenIndex+5]).to.eql({value: 'something', scopes: scopesPrefix.concat(['meta.array.puppet', 'string.quoted.double.interpolated.puppet'])});
          expect(tokens[tokenIndex+7]).to.eql({value: ']', scopes: scopesPrefix.concat(['meta.array.puppet', 'punctuation.definition.array.end.puppet'])});
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
      var tokens = getLineTokens(grammar, 'class classname ($myvar) {')
      expect(tokens[5]).to.eql({value: '$', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[6]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes default class parameters", function() {
      var tokens = getLineTokens(grammar, 'class classname ($myvar = "myval") {')
      expect(tokens[5]).to.eql({value: '$', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[6]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes non-default class parameter types", function() {
      var tokens = getLineTokens(grammar, 'class classname (String $myvar) {')
      expect(tokens[5]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
      expect(tokens[8]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes default class parameter types", function() {
      var tokens = getLineTokens(grammar, 'class classname (String $myvar = "myval") {')
      expect(tokens[5]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
      expect(tokens[8]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.puppet', 'variable.other.puppet']});
    });

    it("tokenizes contain as an include function", function() {
      var tokens = getLineTokens(grammar, "contain foo")
      expect(tokens[0]).to.eql({value: 'contain', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
      expect(tokens[2]).to.eql({value: 'foo', scopes: ['source.puppet', 'meta.include.puppet', 'variable.parameter.include.puppet']});
    });

    it("tokenizes include as an include function", function() {
      var tokens = getLineTokens(grammar, 'include foo')
      expect(tokens[0]).to.eql({value: 'include', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
      expect(tokens[2]).to.eql({value: 'foo', scopes: ['source.puppet', 'meta.include.puppet', 'variable.parameter.include.puppet']});
    });

    it("tokenizes import as an include function", function() {
      var tokens = getLineTokens(grammar, 'import foo')
      expect(tokens[0]).to.eql({value: 'import', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
      expect(tokens[2]).to.eql({value: 'foo', scopes: ['source.puppet', 'meta.include.puppet', 'variable.parameter.include.puppet']});
    });

    it("tokenizes resource type and string title", function() {
      var tokens = getLineTokens(grammar, "package {'foo':}");

      expect(tokens[0]).to.eql({value: 'package', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
      expect(tokens[3]).to.eql({value: "foo", scopes: ['source.puppet', 'entity.name.section.puppet', 'string.quoted.single.puppet']});
    });

    it("tokenizes resource type and variable title", function() {
      var tokens = getLineTokens(grammar, "package {$foo:}");
      expect(tokens[0]).to.eql({value: 'package', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
      expect(tokens[3]).to.eql({value: 'foo', scopes: ['source.puppet', 'entity.name.section.puppet', 'variable.other.readwrite.global.puppet']});
    });

    it("tokenizes require classname as an include", function() {
      var tokens = getLineTokens(grammar, "require ::foo")
      expect(tokens[0]).to.eql({value: 'require', scopes: ['source.puppet', 'meta.include.puppet', 'keyword.control.import.include.puppet']});
      expect(tokens[2]).to.eql({value: '::foo', scopes: ['source.puppet', 'meta.include.puppet', 'variable.parameter.include.puppet']});
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

    describe('if else statements', function() {
      var contexts = {
        'spaced correctly': { 'expectedElseTokenIndex': 12, 'manifest': "if $foo {\n  $bar = '1'\n} else {\n  $bar = '2'\n}" },
        'on same line':     { 'expectedElseTokenIndex': 12, 'manifest': "if $foo { $bar = '1' } else {  $bar = '2' }" },
        'no spaces':        { 'expectedElseTokenIndex': 12, 'manifest': "if $foo {\n  $bar = '1'\n}else{\n  $bar = '2'\n}" },
      }

      for(var contextName in contexts) {
        context(contextName, function() {
          var manifest = contexts[contextName]['manifest']
          var elseTokenIndex = contexts[contextName]['expectedElseTokenIndex']

          it("tokenizes when " + contextName, function () {
            var tokens = getLineTokens(grammar, manifest);
            expect(tokens[0]).to.eql({value: 'if', scopes: ['source.puppet', 'keyword.control.puppet']});
            expect(tokens[elseTokenIndex]).to.eql({ value: 'else', scopes: ['source.puppet', 'keyword.control.puppet'] });
          });
        });
      };
    });
  });

  describe('chaining arrows', function() {
    var contexts = {
      'ordering arrow':  { 'text': '->', 'scope': 'keyword.control.orderarrow.puppet' },
      'notifying arrow': { 'text': '~>', 'scope': 'keyword.control.notifyarrow.puppet' },
    }

    for(var contextName in contexts) {
      context(contextName, function() {
        var arrowText = contexts[contextName]['text'];
        var arrowScope = contexts[contextName]['scope'];

        it("tokenizes single line chaining", function() {
          var tokens = getLineTokens(grammar, "Package['ntp'] ##ARROW## File['/etc/ntp.conf']".replace('##ARROW##', arrowText));
          expect(tokens[7]).to.eql({value: arrowText, scopes: ['source.puppet'].concat(arrowScope)});
          // Ensure that the trailing and leading resources are still tokenized correctly
          expect(tokens[0]).to.eql({value: 'Package', scopes: ['source.puppet', 'storage.type.puppet']});
          expect(tokens[9]).to.eql({value: 'File', scopes: ['source.puppet', 'storage.type.puppet']});
        });

        it("tokenizes single line chaining without whitespace", function() {
          var tokens = getLineTokens(grammar, "Package['ntp']##ARROW##File['/etc/ntp.conf']".replace('##ARROW##', arrowText));
          expect(tokens[6]).to.eql({value: arrowText, scopes: ['source.puppet'].concat(arrowScope)});
          // Ensure that the trailing and leading resources are still tokenized correctly
          expect(tokens[0]).to.eql({value: 'Package', scopes: ['source.puppet', 'storage.type.puppet']});
          expect(tokens[7]).to.eql({value: 'File', scopes: ['source.puppet', 'storage.type.puppet']});
        });

        it("tokenizes multiline class at end chaining", function() {
          var tokens = getLineTokens(grammar, "class a {\n} ##ARROW##\nclass b { }".replace('##ARROW##', arrowText));
          expect(tokens[5]).to.eql({value: arrowText, scopes: ['source.puppet'].concat(arrowScope)});
          // Ensure that the trailing class is still tokenized correctly
          expect(tokens[7]).to.eql({value: 'class', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
        });

        it("tokenizes multiline class at beginning chaining", function() {
          var tokens = getLineTokens(grammar, "class a {\n}\n ##ARROW## class b { }".replace('##ARROW##', arrowText));
          expect(tokens[5]).to.eql({value: arrowText, scopes: ['source.puppet'].concat(arrowScope)});
          // Ensure that the trailing class is still tokenized correctly
          expect(tokens[7]).to.eql({value: 'class', scopes: ['source.puppet', 'meta.definition.class.puppet', 'storage.type.puppet']});
        });

        it("tokenizes resource names after the arrow", function() {
          var tokens = getLineTokens(grammar, "class a {\n}\n ##ARROW## resource::name { 'something': }".replace('##ARROW##', arrowText));
          expect(tokens[5]).to.eql({value: arrowText, scopes: ['source.puppet'].concat(arrowScope)});
          expect(tokens[7]).to.eql({value: 'resource::name', scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
        });
      });
    };
  });

  describe('regular expressions', function() {
    var contexts = {
      'in basic variable assignment': { 'manifest': "$foo = /abc123/", 'expectedTokenIndex': 3, 'expectedRegExText': 'abc123' },
      'in basic if statement': { 'manifest': "if 'foo' =~ /walrus/ {\n  $walrus = true\n}", 'expectedTokenIndex': 6, 'expectedRegExText': 'walrus' },
      'with special characters': { 'manifest': "$foo = /ab\\c#12\\/3/\n$bar = 'wee'", 'expectedTokenIndex': 3, 'expectedRegExText': 'ab\\c#12\\/3' },
      'in the same line with other slashes': { 'manifest': "/puppet-agent-5\..*/ => 'puppet5/',", 'expectedTokenIndex': 0, 'expectedRegExText': 'puppet-agent-5\..*' },
    }

    for(var contextName in contexts) {
      context(contextName, function() {
        var tokenIndex = contexts[contextName]['expectedTokenIndex']
        var expectedRegExText = contexts[contextName]['expectedRegExText']
        var manifest = contexts[contextName]['manifest']

        it("tokenizes regular expression " + contextName, function() {
          var tokens = getLineTokens(grammar, manifest);
          expect(tokens[tokenIndex]).to.eql({value: '/' + expectedRegExText + '/', scopes: ['source.puppet', 'string.regexp.literal.puppet']});
        });
      });
    };
  });

  describe('variable names', function() {
    // Straight up variable names
    var contexts = {
      'a bare variable name'               : { 'testcase': "myvar123_456" },
      'a bare camelcase variable name'     : { 'testcase': "myVariableName" },
      'a top level variable name'          : { 'testcase': "::my23_456abc" },
      'a qualified variable name'          : { 'testcase': "myscope::myvar123_456" },
      'a top level qualified variable name': { 'testcase': "::myscope::myvar123_456" },
      'a long qualified variable name'     : { 'testcase': "ab::cd::ef::g123::myvar123_456" },
      'a hashtable reference'              : { 'testcase': "facts['123']", 'varname': 'facts' },
      'a function call suffix'             : { 'testcase': "abc123.split()", 'varname': 'abc123' },
    }
    for(var contextName in contexts) {
      context(contextName, function() {
        var testcase = contexts[contextName]['testcase']
        var varname = contexts[contextName]['varname']
        // A bit of magic, if the context doesn't define a varname, just use the testcase
        if (varname === undefined) { varname = testcase; }

        it("tokenizes " + contextName + " entirely with preceding dollar sign", function() {
          var tokens = getLineTokens(grammar, "$foo = $" + testcase);

          expect(tokens[3]).to.eql({value: '$', scopes: ['source.puppet', 'variable.other.readwrite.global.puppet', 'punctuation.definition.variable.puppet']});
          expect(tokens[4]).to.eql({value: varname, scopes: ['source.puppet', 'variable.other.readwrite.global.puppet']});
        });
      });
    };

    // Negative tests
    var contexts = {
      'starts with a number'                        : { 'testcase': "123abc" },
      'starts with an underscore in top level scope': { 'testcase': "::_abc" },
      'has an underscore inside the qualified name' : { 'testcase': "abc::_hij" },
    }
    for(var contextName in contexts) {
      context(contextName, function() {
        var testcase = contexts[contextName]['testcase']
        var varname = contexts[contextName]['varname']
        // A bit of magic, if the context doesn't define a varname, just use the testcase
        if (varname === undefined) { varname = testcase; }
        it("does not tokenizes a variable name which " + contextName, function() {
          var tokens = getLineTokens(grammar, "$foo = $" + testcase);
          expect(tokens[4]).to.not.eql({value: varname, scopes: ['source.puppet', 'variable.other.readwrite.global.puppet']});
        });
      });
    };
  });

  describe('predefined variable names', function() {
    // Straight up variable names
    var contexts = {
      'a regex match group' : { 'testcase': "1" },
    }
    for(var contextName in contexts) {
      context(contextName, function() {
        var testcase = contexts[contextName]['testcase']
        var varname = contexts[contextName]['varname']
        // A bit of magic, if the context doesn't define a varname, just use the testcase
        if (varname === undefined) { varname = testcase; }

        it("tokenizes " + contextName + " assignment entirely with preceding dollar sign", function() {
          var tokens = getLineTokens(grammar, "$foo = $" + testcase);

          expect(tokens[3]).to.eql({value: '$', scopes: ['source.puppet', 'variable.other.readwrite.global.pre-defined.puppet', 'punctuation.definition.variable.puppet']});
          expect(tokens[4]).to.eql({value: varname, scopes: ['source.puppet', 'variable.other.readwrite.global.pre-defined.puppet']});
        });

        it("tokenizes " + contextName + " as a resource name", function() {
          var tokens = getLineTokens(grammar, "user { $" + testcase + ":\n}\n");

          expect(tokens[3]).to.eql({value: varname, scopes: ['source.puppet', 'entity.name.section.puppet', 'variable.other.readwrite.global.pre-defined.puppet']});
        });

        describe('interpolated strings', function() {
          var positionContexts = {
            "whole string"             : { 'prefix': "",        'suffix': "",        'offset': 0 },
            "right hand side of string": { 'prefix': "prefix ", 'suffix': "",        'offset': 1 },
            "left hand side of string" : { 'prefix': "",        'suffix': " suffix", 'offset': 0 },
            "inside of string"         : { 'prefix': "prefix ", 'suffix': " suffix", 'offset': 1 },
          }
          for(var posContextName in positionContexts) {
            context(posContextName, function() {
              var prefixText = positionContexts[posContextName]['prefix'];
              var suffixText = positionContexts[posContextName]['suffix'];
              var tokenOffset = positionContexts[posContextName]['offset'];

              it("tokenizes " + contextName + ", interpolated within double quotes", function() {
                var tokens = getLineTokens(grammar, "$foo = \"" + prefixText + "${" + testcase + "}" + suffixText + "\"");
                expect(tokens[5 + tokenOffset]).to.eql({value: varname, scopes: ['source.puppet', 'string.quoted.double.interpolated.puppet', 'meta.embedded.line.puppet', 'source.puppet', 'variable.other.readwrite.global.pre-defined.puppet']});
              });

              it("tokenizes " + contextName + ", prefixed with dollarsign, interpolated within double quotes", function() {
                var tokens = getLineTokens(grammar, "$foo = \"" + prefixText + "${$" + testcase + "}" + suffixText + "\"");
                expect(tokens[5 + tokenOffset]).to.eql({value: '$', scopes:
                  ['source.puppet', 'string.quoted.double.interpolated.puppet', 'meta.embedded.line.puppet', 'source.puppet', 'variable.other.readwrite.global.pre-defined.puppet','punctuation.definition.variable.puppet']});
                expect(tokens[6 + tokenOffset]).to.eql({value: varname, scopes:
                  ['source.puppet', 'string.quoted.double.interpolated.puppet', 'meta.embedded.line.puppet', 'source.puppet', 'variable.other.readwrite.global.pre-defined.puppet']});
              });
            });
          };
        });
      });
    };
  });

  describe('resource names', function() {
    // Straight up variable names
    var contexts = {
      'bareword' :       { 'testcase': "user" },
      'qualified name' : { 'testcase': "foo::bar" },
      'top level' :      { 'testcase': "::bar" },
    }
    for(var contextName in contexts) {
      context(contextName, function() {
        var testcase = contexts[contextName]['testcase']
        var varname = contexts[contextName]['varname']
        // A bit of magic, if the context doesn't define a varname, just use the testcase
        if (varname === undefined) { varname = testcase; }

        it("tokenizes " + contextName + " as a resource name", function() {
          var tokens = getLineTokens(grammar, testcase + " { 'c:\\blah' :\n}\n");

          expect(tokens[0]).to.eql({value: testcase, scopes: ['source.puppet', 'meta.definition.resource.puppet', 'storage.type.puppet']});
        });
      });
    };
  });

  describe('qualified names', function() {
    var contexts = {
      'function' :     { 'manifest': 'function ##TESTCASE## () { }', 'tokenIndex': 2, 'expectedScopes': ['meta.function.puppet', 'entity.name.function.puppet'] },
      'defined type' : { 'manifest': 'define ##TESTCASE## () { }', 'tokenIndex': 2, 'expectedScopes': ['meta.function.puppet', 'entity.name.function.puppet'] },
      'class' :        { 'manifest': 'class ##TESTCASE## () { }', 'tokenIndex': 2, 'expectedScopes': ['meta.definition.class.puppet', 'entity.name.type.class.puppet'] },
      'plan' :         { 'manifest': 'plan ##TESTCASE## () { }', 'tokenIndex': 2, 'expectedScopes': ['meta.definition.plan.puppet', 'entity.name.type.plan.puppet'] },
    }
    for(var contextName in contexts) {
      context("for a " + contextName, function() {
        var contextManifest = contexts[contextName]['manifest'];
        var tokenIndex = contexts[contextName]['tokenIndex'];
        var scopesSuffix = contexts[contextName]['expectedScopes'];

        var validTestCases = ['foo', '::fo12o_bar', 'foo2::bar3::baz'];
        var invalidTestCases = ['123foo', '::_foo', 'foo::bar:baz', 'Foo::bar', 'foo::bAr', '"foo"', "'foo'"];

        validTestCases.forEach(function(testCase){
          it(testCase + " is a valid name", function() {
            var manifest = contextManifest.replace('##TESTCASE##', testCase)
            var tokens = getLineTokens(grammar, manifest);

            expect(tokens[tokenIndex]).to.eql({value: testCase, scopes: ['source.puppet'].concat(scopesSuffix)});
          });
        });

        invalidTestCases.forEach(function(testCase){
          it(testCase + " is not a valid name", function() {
            var manifest = contextManifest.replace('##TESTCASE##', testCase)
            var tokens = getLineTokens(grammar, manifest);

            if (tokens[tokenIndex] == undefined) {
              expect(tokens[tokenIndex]).to.be(undefined)
            } else {
              expect(tokens[tokenIndex]).to.not.eql({value: testCase, scopes: ['source.puppet'].concat(scopesSuffix)});
            }
          });
        });
      });
    };

    var contexts = {
      'node' : { 'manifest': 'node ##TESTCASE## { }', 'tokenIndex': 2, 'expectedScopes': ['meta.definition.class.puppet', 'entity.name.type.class.puppet'] },
    }
    for(var contextName in contexts) {
      context("for a " + contextName, function() {
        var contextManifest = contexts[contextName]['manifest'];
        var tokenIndex = contexts[contextName]['tokenIndex'];
        var scopesSuffix = contexts[contextName]['expectedScopes'];

        var validTestCases = ['"foo"', "'foo'", "'foo2._local'", '"#{foo}"', "'foo\"'", '"foo\'"'];
        var invalidTestCases = ['foo', "'foo\""];

        validTestCases.forEach(function(testCase){
          it(testCase + " is a valid name", function() {
            var manifest = contextManifest.replace('##TESTCASE##', testCase)
            var tokens = getLineTokens(grammar, manifest);

            expect(tokens[tokenIndex]).to.eql({value: testCase, scopes: ['source.puppet'].concat(scopesSuffix)});
          });
        });

        invalidTestCases.forEach(function(testCase){
          it(testCase + " is not a valid name", function() {
            var manifest = contextManifest.replace('##TESTCASE##', testCase)
            var tokens = getLineTokens(grammar, manifest);

            if (tokens[tokenIndex] == undefined) {
              expect(tokens[tokenIndex]).to.be(undefined)
            } else {
              expect(tokens[tokenIndex]).to.not.eql({value: testCase, scopes: ['source.puppet'].concat(scopesSuffix)});
            }
          });
        });
      });
    };
  });

  describe('keywords', function() {
    it("tokenizes undef", function() {
      var tokens = getLineTokens(grammar, 'if $var != undef { }');
      expect(tokens[5]).to.eql({value: 'undef', scopes: ['source.puppet', 'keyword.puppet']});
    });

  });
});
