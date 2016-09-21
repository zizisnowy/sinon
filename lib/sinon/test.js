/**
 * @depend util/core.js
 * @depend sandbox.js
 */
/**
 * Test function, sandboxes fakes
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
(function (sinonGlobal) {
    "use strict";

    function makeApi(sinon) {
        var slice = Array.prototype.slice;

        function finish(sandbox, error, dontThrow) {
            if (error) {
                sandbox.restore();

                if (dontThrow) {
                    return;
                }

                throw error;
            }

            sandbox.verifyAndRestore();
        }

        function callSandboxedFn(context, args, fn, handler) {
            var config = sinon.getConfig(sinon.config);
            config.injectInto = config.injectIntoThis && context || config.injectInto;
            var sandbox = sinon.sandbox.create(config);
            var done = args.length && args[args.length - 1];
            var result;

            if (typeof done === "function") {
                args[args.length - 1] = function sinonDone(error) {
                    finish(sandbox, error, true);
                    done(error);
                };
            }

            try {
                result = fn.apply(context, args.concat(sandbox.args));
            } catch (e) {
                finish(sandbox, e);
            }

            return handler(sandbox, result, typeof done === "function");
        }

        function handleFn(sandbox, result) {
            if (result && typeof result.then === "function") {
                return result.then(
                    function (object) {
                        finish(sandbox);

                        return object;
                    },
                    function (error) {
                        finish(
                            sandbox,
                            error || new Error("Promise rejected with no/falsy error")
                        );
                    }
                );
            }

            finish(sandbox);

            return result;
        }

        function handleAsyncFn(sandbox, result, waitForDone) {
            if (result && typeof result.then === "function") {
                finish(sandbox, new Error(
                    "Your test should take a callback *or* return a promise. "
                        + "It should not do both."
                ));
            }

            if (!waitForDone) {
                finish(sandbox);
            }
        }

        function test(callback) {
            var type = typeof callback;

            if (type !== "function") {
                throw new TypeError("sinon.test needs to wrap a test function, got " + type);
            }

            return callback.length
                ? function sinonAsyncSandboxedTest(_) { // eslint-disable-line no-unused-vars
                    return callSandboxedFn(this, slice.call(arguments), callback, handleAsyncFn);
                }
                : function sinonSandboxedTest() {
                    return callSandboxedFn(this, slice.call(arguments), callback, handleFn);
                }
            ;
        }

        test.config = {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        };

        sinon.test = test;
        return test;
    }

    var isNode = typeof module !== "undefined" && module.exports && typeof require === "function";
    var isAMD = typeof define === "function" && typeof define.amd === "object" && define.amd;

    function loadDependencies(require, exports, module) {
        var core = require("./util/core");
        require("./sandbox");
        module.exports = makeApi(core);
    }

    if (isAMD) {
        define(loadDependencies);
    } else if (isNode) {
        loadDependencies(require, module.exports, module);
    } else if (sinonGlobal) {
        makeApi(sinonGlobal);
    }
}(typeof sinon === "object" && sinon || null)); // eslint-disable-line no-undef
