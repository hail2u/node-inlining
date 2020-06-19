#!/usr/bin/env node

const fs = require("fs");
const inlining = require("../index");

const pkg = require("../package.json");

const toSTDOUT = (res) => {
	console.log(res);
};

const main = () => {
	const [binname] = Object.keys(pkg.bin);
	const file = process.argv.slice(2).shift();

	if (file === "--version" || file === "-v") {
		console.log(`${binname} v${pkg.version}`);
		return;
	}

	if (file === "--help" || file === "-h") {
		console.log(`Usage: ${binname} INPUT

Description:
	${pkg.description}

Options:
	-h, --help     Show this message.
	-v, --version  Print version information.

Use a single dash for INPUT to read CSS from standard input.
`);
		return;
	}

	if (file === "-") {
		inlining(
			fs.readFileSync(process.stdin.fd, "utf8"),
			"index.html",
			toSTDOUT
		);
		return;
	}

	inlining(
		fs.readFileSync(file, "utf8"),
		file,
		toSTDOUT
	);
};

main();
