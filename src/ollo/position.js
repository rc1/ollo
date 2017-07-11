import { Matrix4 } from 'three/src/math/Matrix4';
const mat4 = require( "gl-matrix/src/gl-matrix/mat4.js");
const vec3 = require( "gl-matrix/src/gl-matrix/vec3.js");

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
    setSize ( points, width, height, xPadding, yPadding ) {

        const pointsOrderedByX = points.slice().sort( ( a, b ) => a[0] - b[0] );
        const pointsOrderedByY = points.slice().sort( ( a, b ) => a[1] - b[1] );

        const xMin = first( pointsOrderedByX )[ 0 ];
        const yMin = first( pointsOrderedByY )[ 1 ];
        const xMax = last( pointsOrderedByX ) [ 0 ];
        const yMax = last( pointsOrderedByY )[ 1 ];

        // Fitting
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

        // Return screen bounding box
        const bottom = [ 0, yMax, 0 ];
        const top = [ 0, yMin, 0 ];
        const left = [ xMin, 0, 0 ];
        const right = [ xMax, 0, 0 ];
        return {
            bottom: vec3.transformMat4( bottom, bottom, this.toSceenGlMatrix )[ 1 ],
            top: vec3.transformMat4( top, top, this.toSceenGlMatrix )[ 1 ],
            left: vec3.transformMat4( left, left, this.toSceenGlMatrix )[ 0 ],
            right: vec3.transformMat4( right, right, this.toSceenGlMatrix )[ 0 ],
        };

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

// Utils
function first ( arr ) {
    return arr[ 0 ];
}
function last ( arr ) {
    return arr[ arr.length - 1 ];
}


export default Position;
