#!/usr/bin/env node

const fs = require("fs/promises");
const inlining = require("../index");

const pkg = require("../package.json");

const readStream = (stream, encoding = "utf8") => {
    stream.setEncoding(encoding);
    return new Promise((resolve, reject) => {
        const data = [];
        stream.on("data", (chunk) => data.push(chunk));
        stream.on("end", () => resolve(data.join("")));
        stream.on("error", (error) => reject(error));
    });
};

const main = async () => {
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
		const html = await readStream(process.stdin, "utf8");
		const inlined = await inlining(html, "index.html");
		console.log(inlined);
		return;
	}

	const html = await fs.readFile(file, "utf8");
	const inlined = await inlining(html, file);
	console.log(inlined);
};

main().catch((e) => {
	console.trace(e);
	process.exitCode = 1;
});
