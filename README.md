Inlining
========

Inline external CSS files referenced by `link` element to a HTML file.


SYNOPSIS
--------

Sometimes we need to embed styles inline into HTML for HTML email. This package
read HTML file, extract all `<link rel="stylesheet">`, and embed inline. So, you
can write HTML email same as normal HTML document.

If you have following HTML file:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Inlining</title>
    <link href="test.css" rel="stylesheet">
  </head>
  <body>
    <p class="test">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  </body>
</html>
```

And following CSS file:

```css
.test {
  color: green;
}
```

You will get this HTML file with this package:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Inlining</title>
  </head>
  <body>
    <p class="test" style="color:green;">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  </body>
</html>
```


INSTALL
-------

    $ npm install -g hail2u/node-inlining


USAGE
-----

    $ inlining input.html >output.html

Use single dash for reading HTML from a standard input:

    $ cat input.html | inlining - >output.html


LICENSE
-------

MIT: http://hail2u.mit-license.org/2015
