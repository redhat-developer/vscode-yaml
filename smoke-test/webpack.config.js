import path from 'path';
import { fileURLToPath } from 'url';
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type WebpackConfig */
const config = {
  mode: 'none',
  entry: './smoke-test/smoke-test-runner.ts',
  target: 'webworker',
  output: {
    filename: 'smoke-test-runner.js',
    path: path.resolve(__dirname, '..', 'out', 'smoke-test'),
    libraryTarget: 'commonjs',
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
};
export default config;
