#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2

*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var restler = require('restler');
var HTMLFILE_DEFAULT = 'index.html';
var CHECKSFILE_DEFAULT = 'checks.json';

// http://stackoverflow.com/questions/11386492/accessing-line-number-in-v8-javascript-chrome-node-js
Object.defineProperty(global, '__stack', {
    get: function(){
	var orig = Error.prepareStackTrace;
	Error.prepareStackTrace = function(_, stack){ return stack; };
	var err = new Error;
	Error.captureStackTrace(err, arguments.callee);
	var stack = err.stack;
	Error.prepareStackTrace = orig;
	return stack;
    }
});
Object.defineProperty(global, '__line', {
    get: function(){
	return __stack[1].getLineNumber();
    }
});
//http://stackoverflow.com/questions/13591785/does-node-js-have-anything-like-file-and-line-like-the-c-preprocessor
Object.defineProperty(global, '__file', {
    get: function(){
	return __stack[1].getFileName().split('/').slice(-1)[0];
    }
});

var assertFileExists = function (infile) {
    var instr = infile.toString();
    if (!fs.existsSync(instr)) {
	console.log("%s does not exist. Exiting.", instr);
	process.exit(1);
    }
    return instr;
};

var cheerioHtmlFile = function (htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function (checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtml = function ($, checksfile) {
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for (var i in checks) {
	var present = $(checks[i]).length > 0;
	out[checks[i]] = present;
    }
    return out;
};

var checkHtmlFile = function (htmlfile, checksfile) {
    var $ = cheerioHtmlFile(htmlfile);
    return checkHtml($, checksfile);
};

var clone = function (fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if (require.main == module) {
    program
	.option('-c, --checks <check_file>'
		, 'Path to checks.json'
		, clone(assertFileExists)
		, CHECKSFILE_DEFAULT)
	.option('-f, --file <html_file>'
		, 'Path to index.html'
		, clone(assertFileExists)
		, HTMLFILE_DEFAULT)
	.option('-u, --url <url>'
		, 'URL of HTML file')
	.parse(process.argv);

    // program.url takes precedence over program.file since it has no
    // default.
    if (program.url) {
	restler.get(program.url).on('complete', function (response) {
	    if (response instanceof Error) {
		console.error('Invalid URL');
		process.exit(1);
	    }
	    var checkJson = checkHtml(cheerio.load(response), program.checks);
	    var outJson = JSON.stringify(checkJson, null, 4);
	    console.log(outJson);
	});
    } else {
	var checkJson = checkHtmlFile(program.file, program.checks);
	var outJson = JSON.stringify(checkJson, null, 4);
	console.log(outJson);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
