const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/server.ts', // Replace with the entry point of your application
  mode: 'production',
  target: 'node',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js', // Output filename
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
