const path                = require('path');
const webpack             = require('webpack');
const HtmlWebpackPlugin   = require('html-webpack-plugin');
const ExtractTextPlugin   = require('extract-text-webpack-plugin');
const CopyWebpackPlugin   = require('copy-webpack-plugin');

module.exports = () => {

    const plugins = [];

    plugins.push(new HtmlWebpackPlugin( {
        template : './src/index.pug',
        inject   : true,
        minify   : false
    }));

    plugins.push(new CopyWebpackPlugin( [
        {
            context: './copy/',
            from: '**/*',
            to: '.'
        }
    ]));

    plugins.push( new webpack.optimize.UglifyJsPlugin({
        sourceMap: 'source-map',
        compress: {
            warnings: false
        },
        output: {
            comments: false
        }
    }));

    return {

        // devtool: 'source-map',

        entry: './src/app.js',

        output: {
            path: path.join( __dirname, 'bin' ),
            filename: 'app.bundle.js'
        },

        module: {
            loaders: [
                // JS
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    loader: 'babel-loader',
                    query: {
                        compact: true,
                        presets: [
                            ['es2015', { modules: false }]
                        ]
                    }
                },
                // Pug
                {
                    test: /\.pug$/,
                    include: path.join( __dirname, 'src' ),
                    loaders: [ 'pug-loader' ]
                },
                // GLSL
                {
                    test: /\.glsl$/,
                    loader: 'webpack-glsl-loader'
                }
            ]
        },

        plugins: plugins
    };
};
