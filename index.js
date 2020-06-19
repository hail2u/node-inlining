const balanced = require("balanced-match");
const fs = require("fs");
const jsdom = require("jsdom");
const mime = require("mime");
const onecolor = require("onecolor");
const path = require("path");
const postcss = require("postcss");

const {
	JSDOM
} = jsdom;
const {
	list
} = postcss;

const toHEXColor = (value) => {
	if (/^#[0-9a-f]{3}$/i.test(value)) {
		return onecolor(value).hex();
	}

	return value;
};

const normalizeColor = (value) => list.space(value)
	.map(toHEXColor)
	.join(" ");

const toDataURL = (filepath) => {
	const mimeType = mime.getType(filepath);
	const base64 = fs.readFileSync(filepath)
		.toString("base64");
	return `data:${mimeType};base64,${base64}`;
};

const inlineImage = (dir, value) => {
	const url = balanced("url(", ")", value);

	if (!url) {
		return value;
	}

	const filepath = path.resolve(dir, url.body.replace(/^\s*("|')?\s*(.*)\s*\1\s*$/, "$2"));

	if (fs.existsSync(filepath)) {
		url.body = toDataURL(filepath);
	}

	return `${url.pre}url(${url.body})${url.post}`;
};

const buildCSSText = (dir, decl) => {
	if (decl.type !== "decl") {
		return "";
	}

	const value = list.comma(decl.value)
		.map(normalizeColor)
		.map(inlineImage.bind(null, dir))
		.join(",");

	if (!decl.important) {
		return `${decl.prop}:${value}`;
	}

	return `${decl.prop}:${value} !important`;
}

const inlineImages = (dir, decl) => {
	decl.value = inlineImage(dir, decl.value);
};

const spreadToElements = (document, cssText, selector) => {
	let elms = "";

	try {
		elms = document.querySelectorAll(selector);
	} catch {
		return;
	}

	for (const elm of elms) {
		if (elm !== document.body && !document.body.contains(elm)) {
			continue;
		}

		const style = elm.getAttribute("style");

		if (!style) {
			elm.setAttribute("style", `${cssText};`);
			continue;
		}

		elm.setAttribute("style", `${style}${cssText};`);
	}
};

const processRule = (dir, document, rule) => {
	if (rule.parent.type !== "root") {
		rule.nodes.forEach(inlineImages.bind(null, dir));
		return;
	}

	const cssText = rule.nodes.map(buildCSSText.bind(null, dir))
		.join(";");
	list.comma(rule.selector)
		.forEach(spreadToElements.bind(null, document, cssText));
	rule.remove();
};

const inlineCSS = (css, filepath, document) => {
	const root = postcss.parse(css);
	const dir = path.dirname(filepath);
	root.walkRules(processRule.bind(null, dir, document));

	if (root.nodes.length > 0) {
		const remain = document.createElement("style");
		remain.append(root.toString());
		document.head.append(remain);
	}
};

module.exports = (html, filepath, callback) => {
	const dom = new JSDOM(html);
	const {
		document
	} = dom.window;

	for (const elm of document.querySelectorAll("[style]")) {
		elm.setAttribute("_style", elm.getAttribute("style"));
		elm.setAttribute("style", "");
	}

	const dir = path.dirname(filepath);

	for (const elm of document.querySelectorAll('link[rel="stylesheet"]')) {
		const href = path.resolve(dir, elm.href);

		if (fs.existsSync(href)) {
			elm.parentNode.removeChild(elm);
			const css = fs.readFileSync(href, "utf8");
			inlineCSS(css, href, document);
		}
	}

	for (const elm of document.querySelectorAll("[_style]")) {
		elm.setAttribute(
			"style",
			`${elm.getAttribute("style")}${elm.getAttribute("_style")}`
		);
		elm.removeAttribute("_style");
	}

	for (const elm of document.images) {
		const href = path.resolve(dir, elm.src.replace(/^file:\/\//, ""));

		if (fs.existsSync(href)) {
			elm.src = toDataURL(href);
		}
	}

	callback(dom.serialize(document));
};
