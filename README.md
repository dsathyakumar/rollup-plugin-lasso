# rollup-plugin-lasso

A minimalist [rollup](https://github.com/rollup/rollup) plugin that fits into [Lasso JS](https://github.com/lasso-js/lasso) lifecycle, by piping the output from Rollup into Lasso.

## What it does?
- Does bundling with [rollup](https://github.com/rollup/rollup) & pipes the output to [Lasso JS](https://github.com/lasso-js/lasso). This is more about using Rollup in places where Lasso cannot be used.

## Usage

In your `browser.json`:

```javascript
{
  "dependencies": [
    {
          "if-flag": "my-awesome-feature",
          "dependencies": [
              {
                  "type": "rollup-lasso",
                  "inline": true,
                  "slot": "my-slot",
                  "path": "./myAwesomeFeature.js",
                  "rollup-config": {
                      "output": {
                          "format": "umd",
                          "amd": {
                              "id": "myAwesomeFeature"
                          },
                          "name": "myAwesomeFeature",
                          "exports": "named"
                      },
                      "plugins": {
                          "rollup-plugin-node-resolve": {
                              "jsnext": true,
                              "main": true,
                              "browser": true
                          },
                          "rollup-plugin-commonjs": {},
                          "rollup-plugin-babel": {
                              "exclude": "node_modules/**",
                              "babelrc": false,
                              "presets": [["env", { "modules": false }]],
                              "plugins": [
                                  "external-helpers"
                              ]
                          },
                          "rollup-plugin-uglify": {
                              "initiator": "uglify",
                              "config": {}
                          }
                      }
                  }
              }
          ]
      }
  ]
}
```

## Why is this needed?

There are some plugins & functionalities on the page, that we would want to appear before Lasso's initialization script `$_mod` kicks in. Lasso needs dependencies to be marked as `type: require` for all its transforms & plugins to kick in.
Marking as `type: require` will cause the file to be wrapped by the [lasso-modules-client](https://github.com/lasso-js/lasso-modules-client) variable - `$_mod` - an overhead for simple dependencies.

In most cases, this definition comes bundled with the externalized script containing the dependencies of your entire page. Just in case, you need to execute a script, on page load, before the externalized JS loads, this plugin helps do it, without wrapping it with the variable - `$_mod`.

This plugin will bundle with Rollup & pipe the output to Lasso.

For eg) Given a module/file like the one below, `lasso` doesn't support bundling this `inline` (or) into a slot (including bundling the `require`d modules, without `type: require` (as this has to be packaged without being wrapped by `$_mod`), before the rest of the bundled externalized set of modules (that contains the `lasso-modules-client` definition - `$_mod`)

```javascript
const modA = require('modA');
const modB = require('modB')

(() => {
	const myAwesomeFunc = () => {
		// some work here
		modA();
		// ....
		modB();
	};
    // do something with myAwesomeFunc
})();
```

## How different is this from [lasso-minify-transpile-inline](https://github.com/dsathyakumar/lasso-minify-transpile-inline/)
[lasso-minify-transpile-inline](https://github.com/dsathyakumar/lasso-minify-transpile-inline/) does the same job for a single file dependency that needs to be included inline.
But this plugin can `require` other dependencies & bundle into any slot of [Lasso JS](https://github.com/lasso-js/lasso) or `inline` as it uses [rollup](https://github.com/rollup/rollup) & you get a scope hoisted solution. By piping this output to [Lasso JS](https://github.com/lasso-js/lasso), it gets cached by [Lasso JS](https://github.com/lasso-js/lasso) as part of its build process & gaining the other goodness of being part of [Lasso JS](https://github.com/lasso-js/lasso) lifecycle such as [browser-refresh](https://github.com/patrick-steele-idem/browser-refresh).


### Include this plugin in the lasso config as:

```json
"lasso": {
        "plugins": [
            "lasso-less",
            "lasso-autoprefixer",
            "lasso-marko",
            "rollup-plugin-lasso"
        ],
        "minify": false,
        "minifyInlineOnly": true,
        "bundlingEnabled": true,
        "resolveCssUrls": true,
        "noConflict": "gh-fe",
        "cacheProfile": "production"
    }

```
