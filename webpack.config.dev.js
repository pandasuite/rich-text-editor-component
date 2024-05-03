const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    app: "./src/index.js",
  },
  devtool: "inline-source-map",
  devServer: {
    static: {
      directory: path.join(__dirname, "build"),
    },
    host: "0.0.0.0",
    port: 8080,
    open: false,
  },
  plugins: [
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    new CopyPlugin({
      patterns: [{ from: "public" }],
    }),
  ],
  output: {
    path: path.resolve(__dirname, "build"),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, "src"),
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
};
