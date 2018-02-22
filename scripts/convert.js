// Creates the JSON, YAML and CSON representations of the tmLanguage file (XML Plist)
var parse = require('fast-plist').parse;
var yaml = require('js-yaml');
var cson = require('cson')
var path = require('path')
var md5 = require('md5');

const INDENTS = "  "

var fs = require('fs');
var langFilename = 'puppet.tmLanguage';
var xml_plist = fs.readFileSync('./syntaxes/' + langFilename, 'utf8');

// Parse command line args
var errorOnChange = false;
var args = process.argv.slice(2);
args.forEach(function (val, index, array) {
  if (val.match(/^error-on-change$/i)) { errorOnChange = true}
});

// Parse the XML Plist file into native objects...
var plist = parse(xml_plist);

// Create output dir if it doesn't already exist
var outputDir = path.resolve('./generated-syntaxes');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

var changedFiles = 0;

// Convert to JSON ...
var jsonFile = path.resolve(outputDir + '/' + langFilename + '.json');
console.log("Converting to JSON file " + jsonFile + " ...");
result = doConversion(jsonFile, function(filename) {
  fs.writeFileSync(filename, JSON.stringify(plist, null, 2) + "\n");
});
if (result) { console.log("  File has changed"); changedFiles++; }

// Convert to YAML ...
var yamlFile = path.resolve(outputDir + '/' + langFilename + '.yaml');
console.log("Converting to YAML file " + yamlFile + " ...");
result = doConversion(yamlFile, function(filename) {
  fs.writeFileSync(yamlFile, yaml.safeDump(plist, {'indent': 2, 'lineWidth': 1024}) + "\n");
});
if (result) { console.log("  File has changed"); changedFiles++; }

// Convert to CSON ...
var csonFile = path.resolve(outputDir + '/' + langFilename + '.cson');
console.log("Converting to CSON file " + csonFile + " ...");
result = doConversion(csonFile, function(filename) {
  fs.writeFileSync(csonFile, cson.stringify(plist, null, 2) + "\n");
});
if (result) { console.log("  File has changed"); changedFiles++; }

// Convert to Atom flavoured CSON ...
var csonFile = path.resolve(outputDir + '/' + langFilename + '.atom.cson');
console.log("Converting to Atom flavoured CSON file " + csonFile + " ...");
result = doConversion(csonFile, function(filename) {
  fs.writeFileSync(csonFile,plist_file_to_cson(plist) + "\n");
});
if (result) { console.log("  File has changed"); changedFiles++; }

// Set exit code appropriately
if (errorOnChange) {
  console.log("There were " + changedFiles + " changed file/s")
  process.exit(changedFiles)
} else {
  process.exit(0)
}

function get_file_md5(filePath) {
  var md5value = '??'
  buf = fs.readFileSync(jsonFile)
  md5value = md5(buf);
  return md5value;
}

function doConversion(filename, converter) {
  var beforeMD5 = '??';
  var afterMD5 = '??';
  if (fs.existsSync(filename)) {
    beforeMD5 = get_file_md5(filename);
    fs.unlinkSync(filename);
  }
  converter(filename)
  afterMD5 = get_file_md5(filename);
  return (beforeMD5 != afterMD5)
}

// Convert a plist file to CSON file with a
// flavour ATOM understands
function plist_file_to_cson(plist) {
  var result = '';

  for (var key in plist) {
    if (plist.hasOwnProperty(key)) {
      result += "'" + key + "': " + plist_to_cson(plist[key], 1) + "\n"
    }
  }

  return chomp(result)
}

function plist_to_cson(value, indent, inside_array = false) {
  if (value.constructor.name == 'Array') {
    return plist_array_to_cson(value, indent);
  }
  if (value.constructor.name == 'String') {
    return plist_string_to_cson(value, indent);
  }
  if (value.constructor.name == 'Object') {
    return plist_hash_to_cson(value, indent, inside_array);
  }

  console.log("Unknown type " + value.constructor.name)
  return ''
}

function plist_hash_to_cson(value, indent, inside_array) {
  var result = (inside_array ? "{\n" : "\n")
  for (var key in value) {
    if (value.hasOwnProperty(key)) {
      result += INDENTS.repeat(indent) + "'" + key + "':"
      item = plist_to_cson(value[key], indent + 1) + "\n"
      if (item.charAt(0) != "\n") { item = ' ' + item }
      result += item
    }
  }

  return (inside_array ? result + (INDENTS.repeat(indent-1)) + "}" : chomp(result));
}

function plist_array_to_cson(arrValue, indent) {
  var result = "[\n"

  for (var index in arrValue) {
    result += INDENTS.repeat(indent) + plist_to_cson(arrValue[index], indent + 1, true) + "\n"
  }

  return result + INDENTS.repeat(indent - 1) + "]"
}

function plist_string_to_cson(value, indent) {
  //Parse out backslash except for \' which is expected
  value = value.replace(/\\(?!')/g,"\\\\")
  //Parse out bare single quotes
  value = value.replace(/(?<!\\)'/g,"\\'")

  return "'" + value + "'"
}

function chomp(value) {
  return value.replace(/\n$/g, "")
}
