const path = require("path");

module.exports = {
    mode: "production",
    entry: "./renderer.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "renderer.bundle.js",
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                },
            },
        ],
    },
    resolve: {
        extensions: [".js", ".jsx"],
    },
    performance: {
        hints: false,
    },
};
