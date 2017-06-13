const toxi = require( './toxiclibsjs-ollo.js' );
import Rx from 'rxjs';
import ReactiveProperty from './reactive-property.js';

class Physics {
    constructor ( initialPoints  ) {

        // World
        this.verletPhysics2D = new toxi.physics2d.VerletPhysics2D();

        this.verletPhysics2D.setNumIterations( 2 );

        // Starting points
        this.startingPositions = initialPoints.map( p => new toxi.physics2d.VerletParticle2D( p[0], p[1] ) );
        this.startingPositions.forEach( p => p.lock() );
        this.startingPositions.forEach( p => this.verletPhysics2D.addParticle( p ) );

        this.pointList = initialPoints.map( p => new toxi.physics2d.VerletParticle2D( p[0], p[1] ) );
        this.particleString = new toxi.physics2d.ParticleString2D( this.verletPhysics2D, this.pointList, 0.1 );

        // Spline
        this.spline = new toxi.geom.Spline2D();
        this.spline.setTightness( 0.28 );
        this.spline.setPointList( this.pointList );

        // Subscriptions
        // rx.js subscriptions
        this.subscriptions = [];

        // Frame Updating
        this.frameCount = new ReactiveProperty( 0 );
        this.subscriptions.push( Rx.Observable
            .interval(0, Rx.Scheduler.animationFrame )
            .throttleTime( 1/40 * 1000 )
            .subscribe( () => {
                this.verletPhysics2D.update();
                this.frameCount.value++;
            }));
    }
    controlParticleNearest ( mouseVec ) {
        const closestPoint = this.pointList.reduce( ( acc, p ) => {
            const distance = p.distanceTo( mouseVec );
            if ( distance < acc.dis ) {
                acc.value = p;
                acc.dis = distance;
            }
            return acc;
        }, { dis: Number.MAX_VALUE, value:null } ).value;
        closestPoint.lock();
        return closestPoint;
    }
    releaseControlOfParticle( p ) {
        p.unlock();
    }
    // Returns a function to cancel the sping back
    springBack () {
        const self = this;
        return (function () {
            const springs = [];
            let cancel = new Rx.Subject();
            Rx.Observable
                .from( self.startingPositions )
                .zip( Rx.Observable.from( self.pointList ) )
                .map( pair => new toxi.physics2d.VerletConstrainedSpring2D( pair[0], pair[1], 0, 0.013 * 4 ) )
                .do( spring => self.verletPhysics2D.addSpring( spring ) )
                .do( spring => springs.push( spring ) )
                .delay( 120000 )
                .takeUntil( cancel )
                .subscribe( spring => {
                    springs.forEach( spring => self.verletPhysics2D.removeSpring( spring ) );
                    self.pointList.forEach( ( p, idx ) => {
                        p.x = self.startingPositions[ idx ].x;
                        p.y = self.startingPositions[ idx ].y;
                        p.clearVelocity();
                        p.clearForce();
                    });
                },
                (err) => {},
                ()=> {
                    springs.forEach( spring => self.verletPhysics2D.removeSpring( spring ) );
                } );

            return () => {
                cancel.next( "" );
                cancel.unsubscribe();
            };

        }());




    }
}

export default Physics;
