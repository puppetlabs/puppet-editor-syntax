// Adapted from https://github.com/Microsoft/vscode-textmate/blob/master/scripts/inspect.js
if (process.argv.length < 4) {
  console.log('usage: node index.js <mainGrammarPath> [<additionalGrammarPath1> ...] <filePath>');
  process.exit(0);
}

var GRAMMAR_PATHS = process.argv.slice(2, process.argv.length - 1);
var FILE_PATH = process.argv[process.argv.length - 1];

process.env['VSCODE_TEXTMATE_DEBUG'] = true;

var fs = require('fs');
var main = require('vscode-textmate'); // The original inspect.js uses '../out/main' but we use the module

var Registry = main.Registry;
var registry = new Registry();
var grammarPromise = null;
for (let path of GRAMMAR_PATHS) {
  console.log('LOADING GRAMMAR: ' + path);
  var content = fs.readFileSync(path).toString();
  var rawGrammar = main.parseRawGrammar(content, path);
  var g = registry.addGrammar(rawGrammar);
  grammarPromise = grammarPromise || g;
}
grammarPromise.then(grammar => {
  var fileContents = fs.readFileSync(FILE_PATH).toString();
  var lines = fileContents.split(/\r\n|\r|\n/);
  var ruleStack = null;
  var lastElementId = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    console.log('');
    console.log('');
    console.log('===========================================');
    console.log('TOKENIZING LINE ' + (i + 1) + ': |' + line + '|');

    var r = grammar.tokenizeLine(line, ruleStack);

    console.log('');

    var stackElement = r.ruleStack;
    var cnt = 0;
    while (stackElement) {
      cnt++;
      stackElement = stackElement.parent; // Changed as per https://github.com/Microsoft/vscode-textmate/issues/91
    }

    console.log('@@LINE END RULE STACK CONTAINS ' + cnt + ' RULES:');
    stackElement = r.ruleStack;
    var list = [];
    while (stackElement) {
      if (!stackElement._instanceId) {
        stackElement._instanceId = (++lastElementId);
      }
      var ruleDesc = grammar._ruleId2desc[stackElement.ruleId] // Changed as per https://github.com/Microsoft/vscode-textmate/issues/91
      if (!ruleDesc) {
        list.push('  * no rule description found for rule id: ' + stackElement.ruleId); // Changed as per https://github.com/Microsoft/vscode-textmate/issues/91
      } else {
        list.push('  * ' + ruleDesc.debugName + '  -- [' + ruleDesc.id + ',' + stackElement._instanceId + '] "' + stackElement.nameScopesList.scope + '"'); // Changed as per https://github.com/Microsoft/vscode-textmate/issues/91
      }
      stackElement = stackElement.parent; // Changed as per https://github.com/Microsoft/vscode-textmate/issues/91
    }
    list.reverse();
    console.log(list.join('\n'));

    ruleStack = r.ruleStack;
  }
});
