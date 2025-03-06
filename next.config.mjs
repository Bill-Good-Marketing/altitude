import TerserPlugin from "terser-webpack-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
      },
    experimental: {
        serverSourceMaps: true,
        reactCompiler: {
            panicThreshold: 'ALL_ERRORS',
            compilationMode: 'all',
        },
        reactOwnerStack: true,
        optimizeServerReact: true,
        // dynamicIO: true,
        // cacheLife: {
        //     // For most data in the CRM which will rarely change.
        //     // Will only be updated if that contact is changed.
        //     explicitRevalidate: {
        //     }
        // },
    },
    webpack: (config, {isServer, dev}) => {
        if (isServer && !dev) {
            config.devtool = 'source-map';

            // Exclude Actions.ts files from being minified
            // Also exclude any files that are in an "actions" folder within any route
            config.optimization.minimizer.push(new TerserPlugin({
                exclude: [
                    /Actions\.ts/,
                    /actions\//,
                ]
            }));
        }
        return config;
    },
};

export default nextConfig;
