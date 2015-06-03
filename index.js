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
    var p;
    var url = balanced("url(", ")", v);

    if (url) {
      p = url.body.replace(/^("|')?(.*)\1$/, "$2");
      p = path.resolve(from, p);

      try {
        fs.accessSync(p, fs.F_OK);
        v = url.pre + "url(data:" + mime.lookup(p) + ";base64," +
          fs.readFileSync(p).toString("base64") + ")" + url.post;
      } catch (e) {
        v = url.pre + "url(" + url.body + ")" + url.post;
      }
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

module.exports = function (css, html, pathCSS, pathHTML, callback) {
  jsdom.env(html, function (errors, window) {
    var document = window.document;
    var body = document.body;
    var remain = document.createElement("style");
    var root = postcss.parse(css);
    root.eachRule(function (rule) {
      if (rule.parent.type !== "root") {
        return;
      }

      var cssText = buildCSSText(rule.nodes, path.dirname(pathCSS));
      list.comma(rule.selector).forEach(function (selector) {
        var elm;
        var elms;
        var i;
        var l;
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

    remain.appendChild(document.createTextNode(root.toString()));
    document.head.appendChild(remain);
    callback(document.documentElement.innerHTML);
  });
};
