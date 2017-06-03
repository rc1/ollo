import $ from 'jquery';
import ColorPointWebGLRenderer from './ollo/color-points-webgl-renderer';
import positions from './ollo/positions';

$( function () {

    const renderer = new ColorPointWebGLRenderer();


    renderer.start( $( '#ollo' ) );

    renderer.pointsProp.value = positions.logo.points.map( p => [ p[ 0 ] * $( window ).width(), p[ 1 ] * $( window ).height() ] );
    renderer.colorsProp.value = positions.logo.points.map( _ => [ Math.random(), Math.random(), Math.random() ] );

});


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
// function inverseLerp ( start, end, scalar ) {
// 	return ( scalar - start ) / ( end - start );
// }
