const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  entry: {
    ["sim-retrieval"]: "./src/sim-retrieval/sim-retrieval.ts",
    ["create-sim"]: "./src/create-sim/create-sim.ts",
    ["device-onboarding"]: "./src/device-onboarding/device-onboarding.ts",
  },
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name]/index.js",
    library: {
      type: "commonjs",
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ["ts-loader"],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  mode: "production",
  plugins: [new CleanWebpackPlugin({
    protectWebpackAssets: false,
    cleanAfterEveryBuildPatterns: ['**/*.LICENSE.txt'],
  })],
};
