'use strict';

const tryRequire = require('try-require');
const { get, has } = require('./get');
const { join } = require('path');
const rollup = require('rollup');

const DEPENDENCY_TYPE = 'rollup-lasso';
const DEPENDENCY_PROPS = {
    // Declare which properties can be passed to the dependency type
    properties: {
        'path': 'string',
        'type': 'string',
        'rollup-config': 'object'
    },

    // Validation checks and initialization based on properties:
    async init(context) {
        if (!rollup) {
            throw new Error('Rollup not found! This plugin requires Rollup to be installed');
        }
        let rollupMajorVersion = (rollup.VERSION) ? rollup.VERSION.split('.')[0] : '';
        if (rollupMajorVersion.length) {
            rollupMajorVersion = Number(rollupMajorVersion);
            if (rollupMajorVersion < 1) {
                throw new Error(' This plugin requires Rollup >= 1');
            }
        }
        // we don't force any inline props into this plugin.
        // if the user marks the dependency as `inline: true` in the browser.json, it is available
        // to be packaged inline in whatever slot name that is defined
        // This can be accessed from `LassoPageResult`.
        if (!this.path) {
            throw new Error('"path" property is required');
        }

        if (!this.type || this.type !== DEPENDENCY_TYPE) {
            throw new Error('"type" property is required');
        }

        if (!this['rollup-config'] || typeof this['rollup-config'] !== 'object') {
            throw new Error('rollup-config must be specified as an object');
        }

        if (this['rollup-config']) {
            this.outputOptions = this['rollup-config'].output;
            this.plugins = [];
            this.pluginList = this['rollup-config'].plugins || {};
            if (Object.keys(this.pluginList).length) {
                Object.keys(this.pluginList).forEach(keyAsPluginName => {
                    const pluginObj = tryRequire(keyAsPluginName);
                    if(pluginObj) {
                        const pluginConfig = this.pluginList[keyAsPluginName];
                        // don't uglify if it is development.
                        if (keyAsPluginName === 'rollup-plugin-uglify' && context.config.cacheProfile === 'development') {
                            return;
                        }
                        // pluginObj has to be a function
                        if (typeof pluginObj === 'function') {
                            // this.plugins.push(pluginObj.bind(null, pluginConfig));
                            this.plugins.push(pluginObj(pluginConfig));
                        } else if (typeof pluginObj === 'object' && has(pluginConfig, 'initiator')) {
                            // or an object. if an object, it uses the initiator as the root fn
                            // this.plugins.push(pluginObj[pluginConfig.initiator].bind(null, pluginConfig.config));
                            this.plugins.push(pluginObj[pluginConfig.initiator](pluginConfig.config));
                        }
                    }
                });
            }

            if (!has(this.outputOptions, 'format')) {
                this.outputOptions.format = 'umd';
            }
            if (!has(this.outputOptions, 'exports')) {
                this.outputOptions.exports = 'auto';
            }
            if (!has(this.outputOptions, 'name')) {
                throw new Error('rollup-config must specify "output" option with a "name"');
            }
            if ((this.outputOptions.format === 'amd' || this.outputOptions.format === 'umd') && !has(this.outputOptions, 'amd')) {
                throw new Error('if output format is "amd" or "umd", rollup-config must specify "output" option with "amd" property that contains a "id" prop');
            }
            // we don't write to disk with this file. This is just passed into rawOutputOptions, something that Rollup expects
            this.outputOptions.file =  join(__dirname, '__tmp.js');
            this.outputOptions.sourcemap = (context.config.cacheProfile === 'development' ? 'inline' : false);
        }
        // NOTE: resolvePath can be used to resolve a provided relative path to a full path
        this.path = this.resolvePath(this.path);
    },

    // Read the JS resource dependency
    async read(context) {
        const bundle = await rollup.rollup({
            input: this.path,
            output: {},
            plugins: this.plugins
        });
        let output = '';
        try {
            // we are only generating the bundle here & not writing the bundle to disk
            // eventually this will be cached by Lasso.
            // we have to explore if rollup cache can also be used.
            // the file here is something that rollup needs to specify to rawOutputOptions
            // and is used when writing the bundle to disk. But not used in this case.
            output = await bundle.generate(this.outputOptions);
        } catch (e) {
            console.log(e);
        } finally {
            // finally return code to Lasso (pipe output of Rollup to Lasso)
            // for now we only get the outout from first chunk.
            // if we ever want all chunks to be concatenated into one.
            // That can be dealt with in a separate PR
            return get(output, 'output[0].code', '');
        }
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
