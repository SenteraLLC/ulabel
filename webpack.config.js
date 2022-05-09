const path = require('path');

module.exports = {
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  output: {
    filename: 'ulabel.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'ulabel',
    libraryTarget: 'umodule'
  },
  optimization: {
    minimize: false
  }
};