import $ from 'jquery';
import ColorPointWebGLRenderer from './ollo/color-points-webgl-renderer';
import Physics from './ollo/physics';
import positions from './ollo/positions';
import { Color, Vector3, Matrix4 } from './../node_modules/three/build/three.module';
import { Gestures } from 'rxjs-gestures';
const toxi = require( './ollo/toxiclibsjs-ollo.js' );
import ReactiveProperty from './ollo/reactive-property.js';

class Position {
    constructor ( ) {
        this.toScreenMatrix = new Matrix4();
        this.toPhysicsMatrix = new Matrix4();

        this._threeVec = new Vector3();
    }
    setSize ( points, width, height ) {

        // Bounds
        const xMin = points.reduce( ( acc, p ) => p[0] < acc ? p[0] : acc, Number.MAX_VALUE  );
        const yMin = points.reduce( ( acc, p ) => p[1] < acc ? p[1] : acc, Number.MAX_VALUE  );
        const xMax = points.reduce( ( acc, p ) => p[0] > acc ? p[0] : acc, Number.MIN_VALUE  );
        const yMax = points.reduce( ( acc, p ) => p[1] > acc ? p[1] : acc, Number.MIN_VALUE  );

        // Fitting
        const xPadding = 0.5;
        const yPadding = 0.5;
        const scale = fitScaleRatio( xMax + xPadding, yMax + yPadding, width, height );

        const scaleMatrix = new Matrix4().makeScale( scale, scale, 1 );
        const translateMatrix = new Matrix4().makeTranslation( ( width - ( xMax - xMin ) * scale ) / 2, ( height - ( yMax - yMin  ) * scale ) / 2, 0 );

        this.toScreenMatrix.set( 1,0,0,0,
                                 0,1,0,0,
                                 0,0,1,0,
                                 0,0,0,1 );

        this.toScreenMatrix.multiply( translateMatrix );
        this.toScreenMatrix.multiply( scaleMatrix );

        this.toPhysicsMatrix.set( 1,0,0,0,
                                  0,1,0,0,
                                  0,0,1,0,
                                  0,0,0,1 );

        this.toPhysicsMatrix.getInverse( this.toScreenMatrix );
    }
    copyFromScreenToPhysics ( screenPoint, physicsPoint ) {
        this._threeVec.set( screenPoint[ 0 ], screenPoint[ 1 ], 0 );
        this._threeVec.applyMatrix4( this.toPhysicsMatrix );
        physicsPoint.x = this._threeVec.x;
        physicsPoint.y = this._threeVec.y;
    }
    copyFromPhysicsToScreen ( physicsPoint, screenPoint ) {
        this._threeVec.set( physicsPoint.x, physicsPoint.y, 0 );
        this._threeVec.applyMatrix4( this.toScreenMatrix );
        // console.log( this._threeVec );
        screenPoint[ 0 ] = this._threeVec.x;
        screenPoint[ 1 ] = this._threeVec.y;
    }
}

$( function () {

    const curveRes = 20; // this requires

    // Position
    var position = new Position( positions.logo.points );
    position.setSize( positions.logo.points, $( '#ollo' ).width(), $( '#ollo' ).height() );

    // Create the physics
    const physics = new Physics( positions.logo.points );

    // Create the point renderer
    const renderer = new ColorPointWebGLRenderer();
    renderer.start( $( '#ollo' ) );

    // Add the inital points
    let pointsAsToxiVec = physics.spline.computeVertices( curveRes );
    const pointsPArray = pointsAsToxiVec.map( p => [ p.x, p.y ] );
    renderer.pointsProp.value = pointsPArray;

    // Add the colors
    var colors = pointsPArray
        // Change the point to it's position value 0:1
        .map( ( p, idx, { length: len } ) => idx/(len-1) )
        // Get the color for the position
        .map( t => {
            const gradientPoints = positions.logo.gradientPoints;

            let lowGradientPoint = gradientPoints[ 0 ];
            let highGradientPoint = gradientPoints[ gradientPoints.length - 1 ];

            positions.logo.gradientPoints.forEach( gp => {
                if ( gp.t < t && gp.t > lowGradientPoint.t ) {
                    lowGradientPoint = gp;
                }
                if ( gp.t > t && gp.t < highGradientPoint.t ) {
                    highGradientPoint = gp;
                }
            });

            let timeBetween = inverseLerp( lowGradientPoint.t, highGradientPoint.t, t );

            return [
                lerp( lowGradientPoint.color.r, highGradientPoint.color.r, timeBetween )/255,
                lerp( lowGradientPoint.color.g, highGradientPoint.color.g, timeBetween )/255,
                lerp( lowGradientPoint.color.b, highGradientPoint.color.b, timeBetween )/255
            ];
        });

    renderer.colorsProp.value = colors;

    // Start rendering from physics
    physics.frameCount.subscribe( numOfFrame => {

        // Computation of posisitons
        const pointsAsToxiVec = physics.spline.computeVertices( curveRes );

        // Get a reference to the renderers points
        const rendererPArrays = renderer.pointsProp.value;

        // Update the positions
        for ( let idx = 0; idx <  Math.min( rendererPArrays.length, pointsAsToxiVec.length ); idx++ ) {
            position.copyFromPhysicsToScreen( pointsAsToxiVec[ idx ], rendererPArrays[ idx ] );
        }

        // Update the reference, triggering a Redraw
        renderer.pointsProp.value = rendererPArrays;

    });

    // Interaction

    // Return to home
    const interaction = new ReactiveProperty(true);

    interaction
        .sampleTime( 10000 )
        .delay( 3000 )
        .subscribe( () => {
            physics.springBack();
        });

    // Touches
    const touchMap = new Map();

    Gestures
        .start( $( '#ollo' )[ 0 ] )
        .subscribe( event => {
            const mouse = new toxi.geom.Vec2D();
            position.copyFromScreenToPhysics( [ event.pageX, event.pageY ], mouse );
            const particle = physics.controlParticleNearest( mouse );
            particle.lock();
            particle.set( mouse.x, mouse.y );
            console.log( "setting particle for", event.identifier );
            touchMap.set( event.identifier, particle );
            interaction.value = true;
        });

    Gestures
        .move( $( '#ollo' )[ 0 ] )
        .subscribe( event => {

            const mouse = new toxi.geom.Vec2D();
            position.copyFromScreenToPhysics( [ event.pageX, event.pageY ], mouse );

            var particle = touchMap.get( event.identifier );

            if ( particle ) {
                particle.lock();
                particle.set( mouse.x, mouse.y );
                interaction.value = true;
            }
        });

    Gestures
        .end( $( '#ollo' )[ 0 ] )
        .subscribe( event => {
            var particle = touchMap.get( event.identifier );

            if ( particle ) {
                particle.unlock();
                touchMap.delete( event.identifier );
                interaction.value = true;
            }
        });



});

function inverseLerp ( start, end, scalar ) {
	return ( scalar - start ) / ( end - start );
}

function lerp (start, end, scalar) {
    return start + (end - start) * scalar;
}

function fitScaleRatio (width, height, boundsWidth, boundsHeight) {
    var widthScale = boundsWidth / width;
    var heightScale = boundsHeight / height;
    return Math.min(widthScale, heightScale);
}

// function start () {
//     return new Promise( ( resolve, reject ) => {
//
//         var app = {};
//
//         Physics
//            .make()
//            .then( physics => {
//                physics.initalPoints = positions.logo.points;
//                return Physics.init( physics );
//            })
//            .then( physics => {
//                app.physics = physics;
//                return Renderer.make();
//            })
//            .then( renderer => {
//                renderer.$canvasEl = $( '#ollo' );
//                renderer.positions = app.physics.vertices.map( vec2ToPArray );
//                renderer.colors = pp.physics.vertices
//                    .map( ( _, idx, { length: len } ) => idx / ( len - 1 ) )
//                    .map( );
//                return Renderer.init( renderer );
//            })
//            .then( renderer => {
//                app.renderer = renderer;
//                resolve( app );
//            })
//            .catch( reject );
//
//     });
// }
//
// function applyVec2ToPArray ( vec, pArray ) {
//     pArray[ 0 ] = vec.x;
//     pArray[ 1 ] = vec.y;
// }
//
// function applyPArrayToVec2 ( pArray, vec ) {
//     vec.x = pArray[ 0 ];
//     vec.y = pArray[ 1 ];
// }
//
// function vec2ToPArray ( vec ) {
//     return [ vec.x, vec.y ];
// }
//

//
// var data = [
//   [
//     49,
//     566
//   ],
//   [
//     145,
//     584
//   ],
//   [
//     213,
//     513
//   ],
//   [
//     152,
//     438
//   ],
//   [
//     72,
//     497
//   ],
//   [
//     131,
//     583
//   ],
//   [
//     252,
//     528
//   ],
//   [
//     293,
//     381
//   ],
//   [
//     264,
//     262
//   ],
//   [
//     215,
//     329
//   ],
//   [
//     234,
//     525
//   ],
//   [
//     331,
//     571
//   ],
//   [
//     376,
//     399
//   ],
//   [
//     330,
//     294
//   ],
//   [
//     305,
//     470
//   ],
//   [
//     401,
//     577
//   ],
//   [
//     485,
//     574
//   ],
//   [
//     520,
//     502
//   ],
//   [
//     458,
//     438
//   ],
//   [
//     383,
//     501
//   ],
//   [
//     454,
//     587
//   ],
//   [
//     566,
//     551
//   ]
// ];
//
// // import { Box2, Vector2 } from 'three';
//
// var box = new Box2( new Vector2(0,0), new Vector2(0,0) );
//
// box.setFromPoints( data.map( p => new Vector2(p[0],p[1]) ) );
//
// var size = box.getSize();
// var max = Math.max( size.x, size.y );
//
// console.log( JSON.stringify( data.map( p => {
//     p[0] = inverseLerp( box.min.x, box.min.x + max, p[ 0 ] );
//     p[1] = inverseLerp( box.min.y, box.min.y + max, p[ 1 ] );
//     return p;
// } ) ) );
//
//
// function inverseLerp ( start, end, scalar ) {
// 	return ( scalar - start ) / ( end - start );
// }

//
// // var pointsFlattened = data.reduce( ( acc, point ) => {
// //     acc.push( point[ 0 ] );
// //     acc.push( point[ 1 ] );
// //     return acc;
// // }, [] );
// //
// // var max = pointsFlattened.reduce( (a, b) => Math.max( a, b ), Number.MIN_VALUE );
// // var min = pointsFlattened.reduce( (a, b) => Math.min( a, b ), Number.MAX_VALUE );
// //
// // var reformatted = data.map( p => {
// //     p[ 0 ] = inverseLerp( min, max, p[ 0 ] );
// //     p[ 1 ] = inverseLerp( min, max, p[ 1 ] );
// //     return p;
// // } );
// //
// // console.log( min, max );
// // console.log( JSON.stringify( reformatted ) );
//
