import $ from 'jquery';
import ColorPointWebGLRenderer from './ollo/color-points-webgl-renderer';
import Physics from './ollo/physics';
import positions from './ollo/positions';
import { Color, Vector3, Matrix4 } from './../node_modules/three/build/three.module';
import { Gestures } from 'rxjs-gestures';
import ReactiveProperty from './ollo/reactive-property.js';
import * as screenfull from 'screenfull';
const toxi = require( './ollo/toxiclibsjs-ollo.js' );
const glMatrix = require( "./../node_modules/gl-matrix/src/gl-matrix/common.js");
const mat4 = require( "./../node_modules/gl-matrix/src/gl-matrix/mat4.js");
const vec3 = require( "./../node_modules/gl-matrix/src/gl-matrix/vec3.js");

class Position {
    constructor ( ) {
        this.toScreenMatrix = new Matrix4();
        this.toPhysicsMatrix = new Matrix4();

        this.toSceenGlMatrix = new Float32Array([ 1, 0, 0, 0,
                                                  0, 1, 0, 0,
                                                  0, 0, 1, 0,
                                                  0, 0, 0, 1 ]);

        this.toPhysicsGlMatrix = new Float32Array([ 1, 0, 0, 0,
                                                    0, 1, 0, 0,
                                                    0, 0, 1, 0,
                                                    0, 0, 0, 1 ]);

        this._point = [ 0, 0, 0 ];
    }
    setSize ( points, width, height ) {

        // Bounds
        const xMin = points.reduce( ( acc, p ) => p[0] < acc ? p[0] : acc, Number.MAX_VALUE  );
        const yMin = points.reduce( ( acc, p ) => p[1] < acc ? p[1] : acc, Number.MAX_VALUE  );
        const xMax = points.reduce( ( acc, p ) => p[0] > acc ? p[0] : acc, Number.MIN_VALUE  );
        const yMax = points.reduce( ( acc, p ) => p[1] > acc ? p[1] : acc, Number.MIN_VALUE  );

        // Fitting
        const xPadding = 0.25;
        const yPadding = 0.25;
        this.scale = this.fitScaleRatio( xMax + xPadding, yMax + yPadding, width, height );

        const scaleMatrix = new Matrix4().makeScale( this.scale, this.scale, 1 );
        const translateMatrix = new Matrix4().makeTranslation( ( width - ( xMax - xMin ) * this.scale ) / 2, ( height - ( yMax - yMin  ) * this.scale ) / 2, 0 );

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

        mat4.copy( this.toSceenGlMatrix, this.toScreenMatrix.elements );
        mat4.copy( this.toPhysicsGlMatrix, this.toPhysicsMatrix.elements );
    }
    copyFromScreenToPhysics ( screenPoint, physicsPoint ) {
        this._point[ 0 ] = screenPoint[ 0 ];
        this._point[ 1 ] = screenPoint[ 1 ];
        this._point[ 2 ] =  0;
        vec3.transformMat4( this._point, this._point, this.toPhysicsGlMatrix );
        physicsPoint.x = this._point[ 0 ];
        physicsPoint.y = this._point[ 1 ];
    }
    copyFromPhysicsToScreen ( physicsPoint, screenPoint ) {
        this._point[ 0 ] = physicsPoint.x;
        this._point[ 1 ] =  physicsPoint.y;
        this._point[ 2 ] =  0;
        vec3.transformMat4( this._point, this._point, this.toSceenGlMatrix );
        screenPoint[ 0 ] = this._point[ 0 ];
        screenPoint[ 1 ] = this._point[ 1 ];
    }
    getPointSize () {
        return this.scale * 0.100;
    }
    fitScaleRatio (width, height, boundsWidth, boundsHeight) {
        var widthScale = boundsWidth / width;
        var heightScale = boundsHeight / height;
        return Math.min(widthScale, heightScale);
    }
}

$( function () {

    // iOS
    document.documentElement.addEventListener('touchmove', function (event) {
        event.preventDefault();
    }, false);


    // Config
    const curveRes = 100; // this requires

    // Position
    const position = new Position( positions.logo.points );

    // Create the physics
    const physics = new Physics( positions.logo.points );

    // Create the point renderer
    const renderer = new ColorPointWebGLRenderer();
    renderer.start();

    // Set the physics size
    const updatePhysicsWorldBounds = () => {
        const xy = new toxi.geom.Vec2D();
        position.copyFromScreenToPhysics( [0,0], xy );
        const size = new toxi.geom.Vec2D();
        position.copyFromScreenToPhysics( [ window.innerWidth, window.innerHeight ], size );
        physics.verletPhysics2D.setWorldBounds( new toxi.geom.Rect( xy.x, xy.y, size.x + Math.abs(xy.x), size.y + Math.abs(xy.y) ) );
    };

    // Set positions size
    renderer.sizeProp.subscribe( size => {
        position.setSize( positions.logo.points, window.innerWidth, window.innerHeight );
        renderer.pointSizeProp.value = position.getPointSize();
        updatePhysicsWorldBounds();
    });

    // Add the inital points
    let pointsAsToxiVec = physics.spline.computeVertices( curveRes );
    const pointsPArray = pointsAsToxiVec.reduce( ( acc, p, idx, { length: total } ) => {
        if ( idx > curveRes  && idx < total - curveRes ) {
            acc.push( p => [ p.x, p.y ] );
        }
        return acc;
    }, [] );
    renderer.pointsProp.value = pointsPArray;

    // Add the colors
    var colors = pointsPArray
        // Change the point to it's position value 0:1
        .map( ( p, idx, { length: len } ) => idx/(len-1) )
        // Get the color for the position
        .map( (t, idx ) => {
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
    physics.frameCount.throttleTime( 1/40 * 1000 ).subscribe( numOfFrame => {

        // Computation of posisitons
        const pointsAsToxiVec = physics.spline.computeVertices( curveRes );

        // Get a reference to the renderers points
        const rendererPArrays = renderer.pointsProp.value;

        // Update the positions
        for ( let idx = 0; idx < rendererPArrays.length; idx++ ) {
            position.copyFromPhysicsToScreen( pointsAsToxiVec[ idx + curveRes ], rendererPArrays[ idx ] );
        }

        // Update the reference, triggering a redraw
        renderer.pointsProp.value = rendererPArrays;

    });

    // Interaction

    // Return to home
    const interaction = new ReactiveProperty(true);

    let cancelSpringBack = null;

    interaction
        .sampleTime( 10000 )
        .delay( 3000 )
        .subscribe( () => {
            cancelSpringBack = physics.springBack();
        });

    // Touches
    const touchMap = new Map();

    Gestures
        .start( window )
        .subscribe( event => {
            if ( cancelSpringBack !== null ) {
                cancelSpringBack();
                cancelSpringBack = null;
            }

            const mouse = new toxi.geom.Vec2D();
            position.copyFromScreenToPhysics( [ event.pageX, event.pageY ], mouse );
            const particle = physics.controlParticleNearest( mouse );
            particle.lock();
            particle.set( mouse.x, mouse.y );
            touchMap.set( event.identifier, particle );
            interaction.value = true;
        });

    Gestures
        .move( window )
        .subscribe( event => {

            const mouse = new toxi.geom.Vec2D();
            position.copyFromScreenToPhysics( [ event.pageX, event.pageY ], mouse );

            var particle = touchMap.get( event.identifier );

            if ( particle ) {
                if ( cancelSpringBack !== null ) {
                    cancelSpringBack();
                    cancelSpringBack = null;
                }
                particle.lock();
                particle.set( mouse.x, mouse.y );
                interaction.value = true;
            }
        });

    Gestures
        .end( window )
        .subscribe( event => {
            if ( cancelSpringBack !== null ) {
                cancelSpringBack();
                cancelSpringBack = null;
            }

            var particle = touchMap.get( event.identifier );

            if ( particle ) {
                particle.unlock();
                touchMap.delete( event.identifier );
                interaction.value = true;
            }
        });

    // fullscreen
    $( window ).keypress(function() {
        if (screenfull.enabled) {
        	screenfull.request();
        }
    });


});

function inverseLerp ( start, end, scalar ) {
	return ( scalar - start ) / ( end - start );
}

function lerp (start, end, scalar) {
    return start + (end - start) * scalar;
}
