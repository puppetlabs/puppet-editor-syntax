# Puppet Editor Syntax

![Build Status](https://travis-ci.org/lingua-pupuli/puppet-editor-syntax.svg?branch=master)

Syntax highlighting files for editors (VSCode, Atom, SublimeText, TextMate, etc.) for the Puppet Language

## Information

### What is this for

There were many locations with different formats of the Textmate style syntax highlighting; Each editor has it's own format, or there were many plugins/packages/extensions which added the syntax highlighting.

This repository is hoping to house syntax highlighting files for most editors.  It uses the Textmate XML Property List file as the master template and then generates other formats based on that.

### How to use the syntax files

Copy the right file type for your editor.  Currently the XML Plist file is in the `/syntaxes` directory and JSON, YAML, CSON and atom flavoured CSON files are in the `/generated-syntaxes` directory.

### How does the syntax parser work

Unfortunately it's too complex to describe in a README, but in essence, the parser is a great big regex engine.  It goes through a list of patterns looking for match.  When it finds a match, it assigns a scope to the text, and then starts again with the next bit of text.

At the end of parsing, the entire document is split out into tokens which contains the text, and the scope assigned to that text.

Theme editors can then assign colours or formatting to scopes, for example;

After parsing a document, a token with text `$myvar` has a scope `variable.other.puppet` assigned.  The theme in the text editor says that the scope `variable.other.puppet` should have red text.  So now in your editor `$myvar` will appear in red!

**Helpful links**

[Textmate Manual - Language Grammars](https://manual.macromates.com/en/language_grammars)

[Writing a TextMate Grammar: Some Lessons Learned](https://www.apeth.com/nonblog/stories/textmatebundle.html)

### What scopes should I use

While it is up to the theme to determine what scopes each syntax should use, I found Sublime Text had good documentation on when and what scopes to use.

[https://www.sublimetext.com/docs/3/scope_naming.html](https://www.sublimetext.com/docs/3/scope_naming.html)

## Developing and Contributing

### Setup

This project is cross platform, and can be developed using Mac, Linux or Windows.

* Install NodeJS (This project tests on NodeJS v9)

* Install node modules using `npm install`

  Note on Windows you may need to install the Windows build tools using;

  `npm install --global --production windows-build-tools`

### Running tests

This project makes use of mocha and expect.js.  The tests are located in the `/tests` directory.

To run tests use;

`npm run tests`

### Converting to other formats

This project can automatically convert an XML Plist file into other formats.

To run the converter use;

`npm run convert`

### Debugging tools

This project makes use of [Visual Studio Code's textmate parser](https://github.com/Microsoft/vscode-textmate).  In order to make development easier, the parser can be put into a debug mode where it shows each and every regex match applied and how an entire file is processed.

To run the inspector use;

`npm run inspect <mainGrammarPath> [<additionalGrammarPath1> ...] <filePath>`

For example,

To see how a file called `C:\Temp\testfile.pp` is parsed;

``` text
> npm run inspect syntaxes/puppet.tmLanguage C:\Temp\testfile.pp


LOADING GRAMMAR: .\syntaxes\puppet.tmLanguage


===========================================
TOKENIZING LINE 1: |Array[String] $testvar|

@@scanNext: |Array[String] $testvar\n|
  scanning for
   - 3: ^((#).*$\n?)
   - 6: (#).*$\n?
   - 9: \b(absent|directory|false|file|present|running|stopped|true)\b(?!.*{)
   - 10: ^\s*/\*
   - 11: ^\s*(node|class)\s+((?:[-_A-Za-z0-9"\'.]+::)*[-_A-Za-z0-9"\'.]+)\s*
   - 60: ^\s*(plan)\s+((?:[a-z][a-z0-9_]+::)*[a-z][a-z0-9_]+)\s*
   - 75: ^\s*(define|function)\s+([a-zA-Z0-9_:]+)\s*(\()
   - 90: ^\s*(\w+)\s*{\s*([\'"].+[\'"]):
   - 93: ^\s*(\w+)\s*{\s*(\$[a-zA-Z_]+)\s*:
   - 96: \b(case|if|else|elsif|unless)(?!::)\b
   - 59: (?<![a-zA-Z\$])([A-Z][a-zA-Z]*)(?![a-zA-Z])
   - 32: "
   - 42: '
   - 53: (\[)
   - 97: ((\$?)"?[a-zA-Z_\x{7f}-\x{ff}][a-zA-Z0-9_\x{7f}-\x{ff}]*"?):(?=\s+|$)
   - 46: (?<!\w|\d)([-+]?)(?i:0x)(?i:[0-9a-f])+(?!\w|\d)
   - 47: (?<!\w|\.)([-+]?)(?<!\d)\d+(?i:e(\+|-){0,1}\d+){0,1}(?!\w|\d|\.)
...
```

### Creating Pull Requests

* Please add tests for any changes

* Remember to commit the generated syntaxes too.  Pull Request CI will fail if it finds that this has not been done.
