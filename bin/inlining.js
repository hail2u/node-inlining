#!/usr/bin/env node

const fs = require("fs");
const inlining = require("..");

const pkg = require("../package.json");
const [binname] = Object.keys(pkg.bin);
const [,, html] = process.argv;

switch (html) {
	case "--version":
	case "-v":
		console.log(`${binname} v${pkg.version}`);
		break;

	case "--help":
	case "-h":
		console.log(`Usage: ${binname} INPUT

Description:
  ${pkg.description}

Options:
  -h, --help     Show this message.
  -v, --version  Print version information.

Use a single dash for INPUT to read CSS from standard input.
`);
		break;

	case "-":
		inlining(
			fs.readFileSync(process.stdin.fd, "utf8"),
			"index.html",
			(res) => {
				console.log(res);
			}
		);
		break;

	default:
		inlining(
			fs.readFileSync(html, "utf8"),
			html,
			(res) => {
				console.log(res);
			}
		);
}
