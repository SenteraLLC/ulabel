const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'ulabel.js',
    path: path.resolve(__dirname, 'dist'),
  },
};