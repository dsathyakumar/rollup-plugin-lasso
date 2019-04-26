'use strict';

const { get } = require('./get');
const rollup = require('rollup');
const rollupBabel = require('rollup-plugin-babel');
const rollupNodeResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');
const rollupUglify = require('rollup-plugin-uglify');
const rollupRemap = require('rollup-plugin-remap');

const DEPENDENCY_TYPE = 'lasso-rollup';

const DEPENDENCY_PROPS = {
    // Declare which properties can be passed to the dependency type
    properties: {
        'path': 'string',
        'inline': true,
        'type': 'string'
    },

    // Validation checks and initialization based on properties:
    async init(/* context */) {
        if (!this.path) {
            throw new Error('"path" property is required');
        }

        if (!this.inline) {
            throw new Error('"inline" property is required');
        }

        if (!this.type || this.type !== DEPENDENCY_TYPE) {
            throw new Error('"type" property is required');
        }

        // NOTE: resolvePath can be used to resolve a provided relative path to a full path
        this.path = this.resolvePath(this.path);
    },

    // Read the resource:
    async read(/* context */) {
        const bundle = await rollup.rollup({
            input: this.path,
            plugins: [
                rollupNodeResolve({
                    jsnext: true,
                    main: true,
                    browser: true
                }),
                rollupCommonjs(),
                rollupBabel({
                    exclude: 'node_modules/**',
                    babelrc: false,
                    presets: [['env', { modules: false }]],
                    plugins: [
                        'external-helpers'
                    ]
                }),
                rollupUglify.uglify({
                    output: {
                        comments: function(node, comment) {
                            const text = comment.value;
                            const type = comment.type;
                            if (type === 'comment2') {
                                // multiline comment
                                return /Global Header|@preserve|@license|@cc_on|Global Widget Delivery Platform/i.test(text);
                            }
                        }
                    }
                })
            ]
        });
        const { output } = await bundle.generate();
        // finally return code to Lasso (pipe output of Rollup to Lasso)
        // return get(src, 'code', '');
    },

    // getSourceFile is optional and is only used to determine the last modified time
    // stamp and to give the output file a reasonable name when bundling is disabled
    getSourceFile: function() {
        return this.path;
    }
};

module.exports = (lasso) => {
    lasso.dependencies.registerJavaScriptType(DEPENDENCY_TYPE, DEPENDENCY_PROPS);
};
