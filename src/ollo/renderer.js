import { Scene, OrthographicCamera, WebGLRenderer, Geometry, Math, Vector3, PointsMaterial, Points, Texture, Color } from './../../node_modules/three/build/three.module';
import * as Constants from './../../node_modules/three/src/constants';
import $ from 'jquery';
import Rx from 'rxjs';
import ReactiveProperty from './reactive-property.js';
import circleTexture from './circle-texture.js';

function make () {
    return new Promise( ( resolve, reject ) => {
        resolve( {
            $canvasEl: null,
            disposibles: [],
            animationFrame: Rx.Observable.interval(0, Rx.Scheduler.animationFrame),
            needsRedraw: false,
            positions: [],
            sizeProp: null,
            geometry: null
        } );
    });
}

function init ( renderer ) {

    return new Promise( ( resolve, reject ) => {

        // Size Property
        var sizeProp = new ReactiveProperty( getSize( renderer ) );

        addTo( renderer, Rx.Observable
               .fromEvent( window, 'resize' )
               .debounceTime( 100, Rx.Scheduler.requestAnimationFrame )
               .map( _ => getSize( renderer ) )
               .subscribe( size => sizeProp.value = size ) );

        // Scene Setup
        var scene = new Scene();

        // Camera
        var camera = new OrthographicCamera( 0, sizeProp.value[0], sizeProp.value[1], 0, 1, 1000 );
        camera.position.z = 10;
        camera.lookAt( new Vector3( 0, 0, 0 ) );

        var webGLRenderer = new WebGLRenderer( {
            canvas: renderer.$canvasEl[ 0 ]
        });

        webGLRenderer.autoClear = true;
        webGLRenderer.autoClearColor = 0xffffff;

        renderer.$canvasEl.append( webGLRenderer.domElement );

        addTo( renderer, sizeProp
                .subscribe( wh => {
                   camera.left = 0;
                   camera.right = wh[ 0 ];
                   camera.top = wh[ 1 ];
                   camera.bottom = 0;
                   camera.near = 1;
                   camera.far = 1000;

                   camera.aspect = wh[ 0 ] / wh[ 1 ];
                   camera.updateProjectionMatrix();

                   webGLRenderer.setSize( wh[ 0 ], wh[ 1 ] );
                }));

        // Renderloop
        addTo( renderer, renderer.animationFrame.subscribe( _ => draw( renderer ) ));

        // Create points and colors
        var geometry = new Geometry();
        for ( var i = 0; i < renderer.positions.length; i ++ ) {

            var point = new Vector3();
    	    point.x = 0;
    	    point.y = 0;
    	    point.z = 0;
            geometry.vertices.push( point );
            geometry.colors.push( new Color( 0xff00ff ) );
        }

        var texture = new Texture();
        var image = circleTexture();
        image.onload = () => { texture.needsUpdate = true; };
        texture.image = image;

        var material = new PointsMaterial( {
            color: 0xFFFFFF,
            size: 2,
            map: texture,
            transparent: true,
            depthWrite: false,
            alphaTest: 0.5,
            vertexColors: Constants.VertexColors
        } );

        var points = new Points( geometry, material );
        scene.add( points );

        // Export
        renderer.scene = scene;
        renderer.camera = camera;
        renderer.webGLRenderer = webGLRenderer;
        renderer.sizeProp = sizeProp;
        renderer.geometry = geometry;

        resolve( renderer );
    });
}


function addTo ( renderer, disposible ) {
    renderer.disposibles.push( disposible );
}

function getSize ( renderer ) {
    return [ renderer.$canvasEl.width(), renderer.$canvasEl.height() ];
}

function draw ( renderer ) {
    if ( renderer.needsRedraw ) {
        renderer.positions.forEach( ( p, idx ) => {
            renderer.geometry.vertices[ idx ].x = lerp( 0, renderer.sizeProp.value[ 0 ], p[ 0 ] );
            renderer.geometry.vertices[ idx ].y = lerp( 0, renderer.sizeProp.value[ 1 ], p[ 1 ] );
        });
        renderer.needsRedraw = false;
    }

    renderer.webGLRenderer.render( renderer.scene, renderer.camera );
}

function lerp ( start, end, scalar ) {
    return start + (end - start) * scalar;
}

var Renderer = {
    make: make,
    init: init
};

export { Renderer };
