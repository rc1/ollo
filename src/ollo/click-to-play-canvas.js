import clickeToPlayImage from './click-to-play-logo.png';
import ReactiveProperty from './reactive-property';
import { Scheduler } from 'rxjs/Scheduler';
import { Gestures } from 'rxjs-gestures';
import { Observable } from 'rxjs/Observable';
import "rxjs/add/operator/first";

class ClickToPlayCanvas {
    constructor () {
        this.rotationProp = new ReactiveProperty( 0 );
        this.subscriptions = [];
    }
    start () {

        return new Promise( ( resolve, reject ) => {

            var clickToPlayImage = new Image();

            clickToPlayImage.onload = () => {

                // Create the canvas element
                var canvas = document.createElement( 'canvas' );
                canvas.width = clickToPlayImage.width;
                canvas.height = clickToPlayImage.height;

                // Create the drawing context
                var context = canvas.getContext( '2d' );

                // Create the gradient
                var gradient = context.createLinearGradient(-canvas.width/2, 0, canvas.height/2, 0);
                gradient.addColorStop(0, "rgb(201, 236, 17)");
                gradient.addColorStop(0.204, "rgb(0, 166, 91)");
                gradient.addColorStop(0.464, "rgb(2, 202, 252)");
                gradient.addColorStop(0.635, "rgb(93, 67, 215)");
                gradient.addColorStop(0.795, "rgb(144, 19, 206)");
                gradient.addColorStop(1, "rgb(253, 0, 196)");

                // Create the rotation subscription
                this.rotationProp
                    .subscribeOn( Scheduler.animationFrame )
                    .subscribe ( () => {
                        // Clear the context
                        context.clearRect(0, 0, canvas.width, canvas.height);

                        // Draw a circle filled with the gradient
                        context.drawImage( clickToPlayImage, 0, 0 );

                        // Draw the gradient only where pixels are not transparent
                        context.globalCompositeOperation = 'source-in';
                        context.save();
                        context.translate( canvas.width/2, canvas.height/2 );
                        context.rotate( this.rotationProp.value );
                        context.fillStyle = gradient;
                        context.beginPath();
                        context.arc(0, 0, canvas.width/2, canvas.height/2, Math.PI*2, true);
                        context.closePath();
                        context.fill();
                        context.restore();
                        context.globalCompositeOperation = 'source-over';
                    });

                // Add a class once the mouse has clicked
                this.subscriptions.push(
                    Gestures
                        .start( window )
                        .first()
                        .subscribe( () => {
                           canvas.className += " has-clicked";
                        }));

                // Make rotations follow the mouse
                const self = this;
                const position = [0,0];
                this.subscriptions.push(
                    Gestures
                        .move( window )
                        // Get the angle from the centre of the screen
                        .map( ({ pageX, pageY }) => {
                            applyElementCenter( canvas, position );
                            return Math.atan2( position[1] - pageY, position[0]  - pageX );
                        })
                        .subscribe( function ( rotation ) {
                            self.rotationProp.value = rotation;
                        }));

                // Export
                this.context = context;
                this.canvas = canvas;

                resolve( this );
            };

            // Start the loading of the image
            clickToPlayImage.src = clickeToPlayImage;

        });
    }
    stop () {
        this.subscriptions.forEach( subscription => subscription.unsubscribe() );
    }
}

// Utils
// =====

function sum ( arr ) {
    return arr.reduce( ( acc, v ) => acc + v, 0 );
}

function applyElementCenter ( el, outArr ) {
    const boundingBox = el.getBoundingClientRect();
    outArr[0] = boundingBox.width/2 + boundingBox.left;
    outArr[1] = boundingBox.height/2 + boundingBox.top;
}

export default ClickToPlayCanvas;
