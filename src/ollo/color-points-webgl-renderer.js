import { Scene, OrthographicCamera, WebGLRenderer, Geometry, Math, Vector3, PointsMaterial, Points, Texture, Color } from './../../node_modules/three/build/three.module';
import * as Constants from './../../node_modules/three/src/constants';
import $ from 'jquery';
import Rx from 'rxjs';
import ReactiveProperty from './reactive-property.js';
import circleTexture from './circle-texture.js';

class ColorPointsWebGLRenderer {
    constructor () {

        // Size
        // a pArray bound to the canvas size
        this.sizeProp = new ReactiveProperty( [0,0] );

        // Point size
        this.pointSizeProp = new ReactiveProperty( 100 );

        // Points
        // an array of positions in the form [ x, y ]
        this.pointsProp = new ReactiveProperty( [] );

        // Colors
        // an array of positions in the form [ r, g, b ]
        this.colorsProp = new ReactiveProperty( [] );

        // Subscriptions
        // rx.js subscriptions
        this.subscriptions = [];

    }
    start ( $canvasEl ) {

        // Set size
        this.sizeProp.value = [ window.innerWidth, window.innerHeight ];
        this.subscriptions.push(
            Rx.Observable
               .fromEvent( window , 'resize' )
               .debounceTime( 100, Rx.Scheduler.requestAnimationFrame )
               .map( _ => [ window.innerWidth, window.innerHeight ] )
               .subscribe( size => this.sizeProp.value = size ) );

        // Needs Redraw
        const needsRedraw = new ReactiveProperty(false);

        // Scene
        const scene = new Scene();

        // Renderer
        const renderer = new WebGLRenderer( {
            //canvas: $canvasEl[ 0 ],
            antialias: false,
            autoClear: true,
            autoClearColor: 0x0000ff, // not working?
            devicePixelRatio: window.devicePixelRatio || 1
        });

        // Add to body
        $( 'body' ).append( renderer.domElement );

        // Change rendering to window
        this.subscriptions.push(
            this.sizeProp
                .subscribe( size => {
                    renderer.setSize( size[ 0 ], size[ 1 ], true );
                }));

        // Camera
        const camera = new OrthographicCamera( 0, this.sizeProp.value[ 0 ], 0, this.sizeProp.value[ 1 ], 1, 1000 );
        camera.position.z = 10;
        camera.lookAt( new Vector3( 0, 0, 0 ) );

        // Resizing
        // bind camera and resizes to sizeProp
        this.subscriptions.push(
            this.sizeProp
                .subscribe( size => {
                    camera.right = size[ 0 ];
                    camera.bottom = size[ 1 ];
                    camera.updateProjectionMatrix();
                    camera.aspect = size[ 0 ] / size[ 1 ];
                    needsRedraw.value = true;
                }));

        // Texture
        // a texture of a circle
        const texture = new Texture();
        const image = circleTexture();
        image.onload = () => {
            texture.needsUpdate = true;
            needsRedraw.value = true;
        };
        texture.minFilter = Constants.NearestFilter;
        texture.image = image;

        // Material
        const material = new PointsMaterial( {
            color: 0xFFFFFF,
            size: this.pointSizeProp.value,
            map: texture,
            transparent: true,
            depthWrite: false,
            alphaTest: 0.5,
            vertexColors: Constants.VertexColors,
            sizeAttenuation: false
        });

        // bind to point size
        this.subscriptions.push(
            this.pointSizeProp
                .subscribe( v => {
                    material.size = v;
                    needsRedraw.value = true;
                }));

        // Geometry
        const geometry = new Geometry();

        // Points
        const points = new Points( geometry, material );
        scene.add( points );

        // Bind colors, points & size to geometry

        const pointsNeedsUpdateProp = new ReactiveProperty(false);
        const colorsNeedUpdateProp = new ReactiveProperty(false);

        this.subscriptions.push(
            Rx.Observable.merge( this.sizeProp, this.pointsProp )
                .subscribe( _ => pointsNeedsUpdateProp.value = true ));

        this.subscriptions.push(
            this.colorsProp
                .subscribe( _ => colorsNeedUpdateProp.value = true ));

        this.subscriptions.push(
            Rx.Observable.merge( pointsNeedsUpdateProp, colorsNeedUpdateProp )
                .filter( v => v === true )
                .subscribe( () => {

                    // match size of vertices
                    if ( geometry.vertices.length != this.pointsProp.value.length ) {
                        geometry.vertices = range( this.pointsProp.value.length ).map( _ => new Vector3() );
                        pointsNeedsUpdateProp.value = true;
                    }

                    // match size of colors
                    if ( geometry.colors.length != this.colorsProp.value.length ) {
                        geometry.colors = range( this.colorsProp.value.length ).map( _ => new Color() );
                        colorsNeedUpdateProp.value = true;
                    }

                    if ( pointsNeedsUpdateProp.value ) {
                        geometry.vertices.forEach( ( v, idx ) => {
                            let p = this.pointsProp.value[ idx ];
                            v.x = p[ 0 ];
                            v.y = p[ 1 ];
                        });
                        geometry.verticesNeedUpdate = true;
                        pointsNeedsUpdateProp.value = false;
                        needsRedraw.value = true;
                    }

                    if ( colorsNeedUpdateProp.value ) {
                        geometry.colors.forEach( ( c, idx ) => c.fromArray( this.colorsProp.value[ idx ] ) );
                        geometry.colorsNeedUpdate = true;
                        colorsNeedUpdateProp.value = false;
                        needsRedraw.value = true;
                    }

                }));

        // Frame
        this.subscriptions.push(
            needsRedraw
                .subscribeOn( Rx.Scheduler.animationFrame )
                .subscribe( _ => {
                    renderer.render( scene, camera );
                })
        );
    }
    stop () {
        // clear up
        this.subscriptions.forEach( d => d.unsubscribe() );
    }
}

function range ( start, stop ) {
    if ( typeof stop === 'undefined' ) { stop = start; start = 0;  }
    return Array.apply( null, Array( stop - start ) ).map( function ( _, i ) { return start + i; } );
}

export default ColorPointsWebGLRenderer;
