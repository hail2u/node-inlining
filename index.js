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

function toDataURL(filepath) {
	return `data:${mime.getType(filepath)};base64,${fs.readFileSync(filepath).toString("base64")}`;
}

function inlineImage(value, root) {
	const url = balanced("url(", ")", value);

	if (!url) {
		return value;
	}

	const filepath = path.resolve(root, url.body.replace(/^\s*("|')?\s*(.*)\s*\1\s*$/, "$2"));

	if (fs.existsSync(filepath)) {
		url.body = toDataURL(filepath);
	}

	return `${url.pre}url(${url.body})${url.post}`;
}

function toHEXColor(value) {
	if (/^#[0-9a-f]{3}$/i.test(value)) {
		return onecolor(value).hex();
	}

	return value;
}

function normalizeColor(value) {
	return list.space(value).map(toHEXColor).join(" ");
}

function buildCSSText(decls, root) {
	let cssText = "";
	decls.forEach((decl) => {
		if (decl.type !== "decl") {
			return;
		}

		cssText += `${decl.prop}:${list.comma(decl.value).map((v) => inlineImage(normalizeColor(v), root)).join(",")}`;

		if (decl.important) {
			cssText += " !important";
		}

		cssText += ";";
	});
	return cssText;
}

function inlineCSS(css, pathCSS, document) {
	const dir = path.dirname(pathCSS);
	const {body} = document;
	const remain = document.createElement("style");
	const root = postcss.parse(css);
	root.walkRules((rule) => {
		let cssText = "";

		if (rule.parent.type !== "root") {
			rule.nodes.forEach((decl) => {
				decl.value = inlineImage(decl.value, dir);
			});

			return;
		}

		cssText = buildCSSText(rule.nodes, dir);
		list.comma(rule.selector).forEach((selector) => {
			let elms = "";
			let l = "";
			let i = "";
			let elm = "";
			let style = "";

			try {
				elms = document.querySelectorAll(selector);
			} catch (e) {
				return;
			}

			l = elms.length;

			for (i = 0; i < l; i++) {
				elm = elms[i];

				if (elm !== body && !body.contains(elm)) {
					continue;
				}

				style = elm.getAttribute("style");

				if (!style) {
					style = "";
				}

				elm.setAttribute("style", style + cssText);
			}
		});
		rule.remove();
	});

	if (root.nodes.length > 0) {
		remain.appendChild(document.createTextNode(root.toString()));
		document.head.appendChild(remain);
	}

	return document;
}

module.exports = function (html, filepath, callback) {
	const dom = new JSDOM(html);
	let {
		document
	} = dom.window;
	let elms = document.querySelectorAll("[style]");
	let l = elms.length;
	let i = 0;
	let elm = "";
	const links = document.querySelectorAll('link[rel="stylesheet"]');
	let href = "";
	const dir = path.dirname(filepath);

	for (; i < l; i++) {
		elm = elms[i];
		elm.setAttribute("_style", elm.getAttribute("style"));
		elm.setAttribute("style", "");
	}

	l = links.length;

	for (i = 0; i < l; i++) {
		elm = links[i];
		href = path.resolve(dir, elm.href);

		if (fs.existsSync(href)) {
			elm.parentNode.removeChild(elm);
			document = inlineCSS(fs.readFileSync(href, "utf8"), href, document);
		}
	}

	l = elms.length;

	for (i = 0; i < l; i++) {
		elm = elms[i];
		elm.setAttribute(
			"style",
			elm.getAttribute("style") + elm.getAttribute("_style")
		);
		elm.removeAttribute("_style");
	}

	elms = document.images;
	l = elms.length;

	for (i = 0; i < l; i++) {
		elm = elms[i];
		href = path.resolve(dir, elm.src.replace(/^file:\/\//, ""));

		if (fs.existsSync(href)) {
			elm.src = toDataURL(href);
		}
	}

	callback(dom.serialize(document));
};
