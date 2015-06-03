"use strict";

var balanced = require("balanced-match");
var fs = require("fs");
var jsdom = require("jsdom");
var mime = require("mime");
var path = require("path");
var postcss = require("postcss");

var list = postcss.list;

function inlineImage(value, from) {
  return list.comma(value).map(function (v) {
    var url = balanced("url(", ")", v);
    var p;

    if (url) {
      p = url.body.replace(/^\s*("|')?\s*(.*)\s*\1\s*$/, "$2");
      p = path.resolve(from, p);

      if (fs.existsSync(p)) {
        url.body = "data:" + mime.lookup(p) + ";base64," +
          fs.readFileSync(p).toString("base64");
      }

      v = url.pre + "url(" + url.body + ")" + url.post;
    }

    return v;
  }).join(",");
}

function buildCSSText(decls, root) {
  var cssText = "";
  decls.forEach(function (decl) {
    if (decl.type !== "decl") {
      return;
    }

    cssText += decl.prop + ":" + inlineImage(decl.value, root) + ";";
  });

  return cssText;
}

function inlineCSS(css, pathCSS, document) {
  var root = postcss.parse(css);
  var body = document.body;
  var remain = document.createElement("style");
  root.eachRule(function (rule) {
    if (rule.parent.type !== "root") {
      return;
    }

    var cssText = buildCSSText(rule.nodes, path.dirname(pathCSS));
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

  if (root.nodes.length > 0) {
    remain.appendChild(document.createTextNode(root.toString()));
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
    var elms = document.querySelectorAll('link[rel="stylesheet"]');
    var l = elms.length;
    var i;
    var elm;
    var href;

    for (i = 0; i < l; i++) {
      elm = elms[i];
      href = path.resolve(path.dirname(pathHTML), elm.href);

      if (fs.existsSync(href)) {
        elm.parentNode.removeChild(elm);
        document = inlineCSS(fs.readFileSync(href, "utf8"), href, document);
      }
    }

    callback(document.documentElement.innerHTML);
  });
};
