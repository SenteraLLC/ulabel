const path = require('path');
const fs = require('fs');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: false,
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
    minimize: true, // Enable minimization so minimizers run
    minimizer: [
      new TerserPlugin({
        test: /\.min\.js$/, // Only minify .min.js files
        terserOptions: {
          compress: {
            drop_console: false,
          },
          format: {
            comments: false,
          },
        },
        extractComments: true, // Extract license comments
      }),
    ],
  },
  plugins: [
    // Copy the extracted license file for both builds
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('CopyLicensePlugin', (compilation) => {
          const licenseSource = path.join(__dirname, 'dist', 'ulabel.min.js.LICENSE.txt');
          const licenseDest = path.join(__dirname, 'dist', 'ulabel.js.LICENSE.txt');
          
          if (fs.existsSync(licenseSource)) {
            fs.copyFileSync(licenseSource, licenseDest);
          }
        });
      }
    }
  ],
};