const toxi = require( './toxiclibsjs-ollo.js' );
import Rx from 'rxjs';
import ReactiveProperty from './reactive-property.js';

class Physics {
    constructor ( initialPoints ) {

        // World
        this.verletPhysics2D = new toxi.physics2d.VerletPhysics2D();
        this.verletPhysics2D.setWorldBounds(new toxi.geom.Rect(-0.3, -0.3, 1.3, 1.3));
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
            .take(100)
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
    springBack () {
        Rx.Observable
            .from( this.startingPositions )
            .zip( Rx.Observable.from( this.pointList ) )
            .map( pair => new toxi.physics2d.VerletConstrainedSpring2D( pair[0], pair[1], 0, 0.01 ) )
            .do( spring => this.verletPhysics2D.addSpring( spring ) )
            .delay( 6000 )
            .subscribe( spring => {
                this.verletPhysics2D.removeSpring( spring );
                this.pointList.forEach( p => p.clearVelocity() );
                this.pointList.forEach( p => p.clearForce() );
                //this.pointList.forEach( ( p, idx ) => p.set( this.startingPositions[ idx ].x, this.startingPositions[ idx ].y ) );
            });
    }
}

export default Physics;
