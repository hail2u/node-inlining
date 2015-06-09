"use strict";

var balanced = require("balanced-match");
var fs = require("fs");
var jsdom = require("jsdom");
var mime = require("mime");
var onecolor = require("onecolor");
var path = require("path");
var postcss = require("postcss");

var list = postcss.list;

function toDataURL(p) {
  return "data:" + mime.lookup(p) + ";base64," +
    fs.readFileSync(p).toString("base64");
}

function inlineImage(value, root) {
  var url = balanced("url(", ")", value);
  var p;

  if (url) {
    p = url.body.replace(/^\s*("|')?\s*(.*)\s*\1\s*$/, "$2");
    p = path.resolve(root, p);

    if (fs.existsSync(p)) {
      url.body = toDataURL(p);
    }

    value = url.pre + "url(" + url.body + ")" + url.post;
  }

  return value;
}

function normalizeColor(value) {
  return list.space(value).map(function (v) {
    if (
      /^(rgb|hsl)a?\(.*\)$/i.test(v) ||
      /^#[0-9a-f]{3}$/i.test(v)
    ) {
      return onecolor(v).hex();
    }

    return v;
  }).join(" ");
}

function buildCSSText(decls, root) {
  var cssText = "";
  decls.forEach(function (decl) {
    if (decl.type !== "decl") {
      return;
    }

    cssText += decl.prop + ":" + list.comma(decl.value).map(function (v) {
      v = normalizeColor(v);
      v = inlineImage(v, root);

      return v;
    }).join(",");

    if (decl.important) {
      cssText += " !important";
    }

    cssText += ";";
  });

  return cssText;
}

function inlineCSS(css, pathCSS, document) {
  var dir = path.dirname(pathCSS);
  var body = document.body;
  var remain = document.createElement("style");
  css = postcss.parse(css);
  css.eachRule(function (rule) {
    var cssText;

    if (rule.parent.type !== "root") {
      rule.nodes.forEach(function (decl) {
        decl.value = inlineImage(decl.value, dir);
      });

      return;
    }

    cssText = buildCSSText(rule.nodes, dir);
    list.comma(rule.selector).forEach(function (selector) {
      var elms;
      var l;
      var i;
      var elm;
      var style;

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
    rule.removeSelf();
  });

  if (css.nodes.length > 0) {
    remain.appendChild(document.createTextNode(css.toString()));
    document.head.appendChild(remain);
  }

  return document;
}

module.exports = function (html, pathHTML, callback) {
  if (typeof pathHTML === "function") {
    callback = pathHTML;
    pathHTML = "index.html";
  }

  jsdom.env(html, function (errors, window) {
    var document = window.document;
    var elms = document.querySelectorAll("[style]");
    var l = elms.length;
    var i;
    var elm;
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    var href;
    var dir = path.dirname(pathHTML);

    for (i = 0; i < l; i++) {
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

    callback(jsdom.serializeDocument(document));
  });
};
