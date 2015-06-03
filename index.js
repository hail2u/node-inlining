"use strict";

var jsdom = require("jsdom");
var postcss = require("postcss");

var list = postcss.list;

function buildCSSText(decls) {
  var cssText = "";
  decls.forEach(function (decl) {
    if (decl.type !== "decl") {
      return;
    }

    cssText += decl.prop + ":" + decl.value + ";";
  });

  return cssText;
}

module.exports = function (css, html, callback) {
  jsdom.env(html, function (errors, window) {
    var document = window.document;
    var body = document.body;
    var remain = document.createElement("style");
    var root = postcss.parse(css);
    root.eachRule(function (rule) {
      if (rule.parent.type !== "root") {
        return;
      }

      var cssText = buildCSSText(rule.nodes);
      list.comma(rule.selector).forEach(function (selector) {
        var elm;
        var elms = document.querySelectorAll(selector);
        var i;
        var l = elms.length;

        for (i = 0; i < l; i++) {
          elm = elms[i];

          if (elm !== body && !body.contains(elm)) {
            continue;
          }

          elm.style.cssText += cssText;
        }
      });

      rule.removeSelf();
    });

    remain.appendChild(document.createTextNode(root.toString()));
    document.head.appendChild(remain);
    callback(document.documentElement.innerHTML);
  });
};
