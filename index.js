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
    postcss.parse(css).eachRule(function (rule) {
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
    });

    callback(document.documentElement.innerHTML);
  });
};
