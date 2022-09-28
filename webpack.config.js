const path = require('path');
// const webpack = require("webpack");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: {
    "ulabel": './src/index.js',
    "ulabel.min": './src/index.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library : {
      name: "ULabel",
      type: "commonjs",
      export: "default"
    }
  },
  optimization: {
    minimize: true,
    minimizer: [
      new UglifyJsPlugin({
        include: /\.min\.js$/,
      })
    ]
  }
};