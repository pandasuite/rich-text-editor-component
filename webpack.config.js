const { merge } = require("webpack-merge");

const dev = require("./webpack.config.dev.js");

module.exports = merge(dev, {
  mode: "production",
  entry: {
    app: "./src/index.js",
  },
  devtool: "nosources-source-map",
});
