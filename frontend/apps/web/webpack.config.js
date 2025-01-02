const { composePlugins, withNx } = require("@nx/webpack");
const { withReact } = require("@nx/react");
const WorkboxPlugin = require("workbox-webpack-plugin");

module.exports = composePlugins(
    withNx(),
    withReact({
        styles: ["apps/web/src/styles.css"],
        svgr: true,
    }),
    // Custom composable plugin
    (config, { options, context }) => {
        // `config` is the Webpack configuration object
        // `options` is the options passed to the `@nx/webpack:webpack` executor
        // `context` is the context passed to the `@nx/webpack:webpack` executor
        // customize configuration here
        return {
            ...config,
            plugins: [
                ...config.plugins,
                new WorkboxPlugin.GenerateSW({
                    // these options encourage the ServiceWorkers to get in there fast
                    // and not allow any straggling "old" SWs to hang around
                    clientsClaim: true,
                    skipWaiting: true,
                }),
            ],
        };
    }
);
