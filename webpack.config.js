const path  = require( 'path' );
const webpack = require( 'webpack' );
const HtmlWebpackPlugin = require( 'html-webpack-plugin' );
const ExtractTextPlugin = require( 'extract-text-webpack-plugin' );

module.exports = () => {

    const isProduction = process.env.NODE_ENV == 'production';

    const config = {
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
                            [ 'es2015', { modules: false } ]
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
                },
                // Images
                {
                    test: /\.(png|svg|jpg|gif)$/,
                    use: [
                        'file-loader'
                    ]
                },
                // Webapp Manifest
                {
                    test: /manifest.json$/,
                    loader: 'file-loader?name=manifest.json!web-app-manifest-loader'
                }
            ]
        },
        plugins: []
    };

    if ( !isProduction ) {
        config.devtool = 'source-map';
    }

    config.plugins.push(new HtmlWebpackPlugin( {
        template: './src/index.pug',
        inject: true,
        minify: false
    }));

    if ( isProduction ) {
        config.plugins.push( new webpack.optimize.UglifyJsPlugin({
            sourceMap: 'source-map',
            compress: {
                warnings: false
            },
            output: {
                comments: false
            }
        }));
    }

    return config;
};
