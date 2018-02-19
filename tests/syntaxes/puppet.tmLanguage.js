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
      expect(tokens[5]).to.eql({value: '$', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.no-default.untyped.puppet', 'variable.other.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[6]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.no-default.untyped.puppet', 'variable.other.puppet']});
    });

    it("tokenizes default class parameters", function() {
      var tokens = getLineTokens(grammar, 'class "classname" ($myvar = "myval") {')
      expect(tokens[5]).to.eql({value: '$', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.default.untyped.puppet', 'variable.other.puppet', 'punctuation.definition.variable.puppet']});
      expect(tokens[6]).to.eql({value: 'myvar', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.default.untyped.puppet', 'variable.other.puppet']});
    });

    it("tokenizes non-default class parameter types", function() {
      var tokens = getLineTokens(grammar, 'class "classname" (String $myvar) {')
      expect(tokens[5]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.no-default.typed.puppet', 'storage.type.puppet']});
    });

    it("tokenizes default class parameter types", function() {
      var tokens = getLineTokens(grammar, 'class "classname" (String $myvar = "myval") {')
      expect(tokens[5]).to.eql({value: 'String', scopes: ['source.puppet', 'meta.definition.class.puppet', 'meta.function.argument.default.typed.puppet', 'storage.type.puppet']});
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
