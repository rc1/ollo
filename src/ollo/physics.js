var toxi = require( './toxiclibsjs-ollo.js' );

function make() {
    return new Promise( function ( resolve, reject ) {
        resolve( {
            initalPoints: [],
            vertices: null,
            curveRes: 30
        });
    });
}

function init ( physics ) {
    return new Promise( function ( resolve, reject ) {

        var spline = new toxi.geom.Spline2D();

        var points = physics.initalPoints.map( p => new toxi.physics2d.VerletParticle2D( p[0], p[1] ) );

        spline.setPointList( points );
        spline.setTightness( 0.28 );
        physics.vertices = spline.computeVertices( physics.curveRes );

        resolve( physics );
    });
}

var Physics = {
    make: make,
    init: init
};

export { Physics };
