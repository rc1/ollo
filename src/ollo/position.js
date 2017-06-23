import { Matrix4 } from './../../node_modules/three/build/three.module';
const mat4 = require( "./../../node_modules/gl-matrix/src/gl-matrix/mat4.js");
const vec3 = require( "./../../node_modules/gl-matrix/src/gl-matrix/vec3.js");

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

export default Position;
