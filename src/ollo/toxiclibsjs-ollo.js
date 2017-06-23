/*!
* toxiclibsjs - v0.3.2
* http://haptic-data.com/toxiclibsjs
* Created by [Kyle Phillips](http://haptic-data.com),
* based on original work by [Karsten Schmidt](http://toxiclibs.org).
* Licensed [GPLv2](http://www.gnu.org/licenses/lgpl-2.1.html)
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.toxi = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = exports = {"geom":{},"physics2d":{}};
exports.geom.Vec2D = require("./geom/Vec2D");
exports.geom.Rect = require("./geom/Rect");
exports.geom.Spline2D = require("./geom/Spline2D");
exports.physics2d.VerletParticle2D = require("./physics2d/VerletParticle2D");
exports.physics2d.VerletPhysics2D = require("./physics2d/VerletPhysics2D");
exports.physics2d.VerletConstrainedSpring2D = require("./physics2d/VerletConstrainedSpring2D");
exports.physics2d.ParticleString2D = require("./physics2d/ParticleString2D");

},{"./geom/Rect":14,"./geom/Spline2D":16,"./geom/Vec2D":19,"./physics2d/ParticleString2D":46,"./physics2d/VerletConstrainedSpring2D":47,"./physics2d/VerletParticle2D":48,"./physics2d/VerletPhysics2D":49}],2:[function(require,module,exports){


var	internals = require('../internals'),
	Vec3D = require('./Vec3D'),
	Vec2D = require('./Vec2D'),
	mathUtils = require('../math/mathUtils');




/**
 @class Axis-aligned Bounding Box
 @member
 */
var AABB = function(a,b){
	if(a === undefined){
		Vec3D.call(this);
		this.setExtent(new Vec3D());
	} else if(typeof(a) == "number") {
		Vec3D.call(this,new Vec3D());
		this.setExtent(a);
	} else if( internals.has.XYZ( a ) ) {
		Vec3D.call(this,a);
		if(b === undefined && internals.is.AABB( a )) {
			this.setExtent(a.getExtent());
		} else {
			if(typeof b == "number"){
				this.setExtent(new Vec3D(b,b,b));
			}else { //should be an AABB
				this.setExtent(b);
			}
		}
	}


};

internals.extend(AABB,Vec3D);

AABB.fromMinMax = function(min,max){
	var a = Vec3D.min(min, max);
	var b = Vec3D.max(min, max);
	return new AABB( a.interpolateTo(b,0.5), b.sub(a).scaleSelf(0.5) );
};

AABB.prototype.containsPoint = function(p) {
    return p.isInAABB(this);
};

AABB.prototype.copy = function() {
    return new AABB(this);
};

/**
 * Returns the current box size as new Vec3D instance (updating this vector
 * will NOT update the box size! Use {@link #setExtent(ReadonlyVec3D)} for
 * those purposes)
 *
 * @return box size
 */
AABB.prototype.getExtent = function() {
   return this.extent.copy();
};

AABB.prototype.getMax = function() {
   // return this.add(extent);
   return this.max.copy();
};

AABB.prototype.getMin = function() {
   return this.min.copy();
};

AABB.prototype.getNormalForPoint = function(p) {
    p = p.sub(this);
    var pabs = this.extent.sub(p.getAbs());
    var psign = p.getSignum();
    var normal = Vec3D.X_AXIS.scale(psign.x);
    var minDist = pabs.x;
    if (pabs.y < minDist) {
        minDist = pabs.y;
        normal = Vec3D.Y_AXIS.scale(psign.y);
    }
    if (pabs.z < minDist) {
        normal = Vec3D.Z_AXIS.scale(psign.z);
    }
    return normal;
};

/**
 * Adjusts the box size and position such that it includes the given point.
 *
 * @param p
 *            point to include
 * @return itself
 */
AABB.prototype.includePoint = function(p) {
    this.min.minSelf(p);
    this.max.maxSelf(p);
    this.set(this.min.interpolateTo(this.max, 0.5));
    this.extent.set(this.max.sub(this.min).scaleSelf(0.5));
    return this;
};

/**
* Checks if the box intersects the passed in one.
*
* @param box
*            box to check
* @return true, if boxes overlap
*/
AABB.prototype.intersectsBox = function(box) {
    var t = box.sub(this);
    return Math.abs(t.x) <= (this.extent.x + box.extent.x) && Math.abs(t.y) <= (this.extent.y + box.extent.y) && Math.abs(t.z) <= (this.extent.z + box.extent.z);
};

/**
 * Calculates intersection with the given ray between a certain distance
 * interval.
 *
 * Ray-box intersection is using IEEE numerical properties to ensure the
 * test is both robust and efficient, as described in:
 *
 * Amy Williams, Steve Barrus, R. Keith Morley, and Peter Shirley: "An
 * Efficient and Robust Ray-Box Intersection Algorithm" Journal of graphics
 * tools, 10(1):49-54, 2005
 *
 * @param ray incident ray
 * @param minDist
 * @param maxDist
 * @return intersection point on the bounding box (only the first is
 *         returned) or null if no intersection
 */

AABB.prototype.intersectsRay = function(ray, minDist, maxDist) {
    var invDir = ray.getDirection().reciprocal();
    var signDirX = invDir.x < 0;
    var signDirY = invDir.y < 0;
    var signDirZ = invDir.z < 0;
    var bbox = signDirX ? this.max : this.min;
    var tmin = (bbox.x - ray.x) * invDir.x;
    bbox = signDirX ? this.min : this.max;
    var tmax = (bbox.x - ray.x) * invDir.x;
    bbox = signDirY ? this.max : this.min;
    var tymin = (bbox.y - ray.y) * invDir.y;
    bbox = signDirY ? this.min : this.max;
    var tymax = (bbox.y - ray.y) * invDir.y;
    if ((tmin > tymax) || (tymin > tmax)) {
        return null;
    }
    if (tymin > tmin) {
        tmin = tymin;
    }
    if (tymax < tmax) {
        tmax = tymax;
    }
    bbox = signDirZ ? this.max : this.min;
    var tzmin = (bbox.z - ray.z) * invDir.z;
    bbox = signDirZ ? this.min : this.max;
    var tzmax = (bbox.z - ray.z) * invDir.z;
    if ((tmin > tzmax) || (tzmin > tmax)) {
        return null;
    }
    if (tzmin > tmin) {
        tmin = tzmin;
    }
    if (tzmax < tmax) {
        tmax = tzmax;
    }
    if ((tmin < maxDist) && (tmax > minDist)) {
        return ray.getPointAtDistance(tmin);
    }
    return undefined;
};

/**
 * @param c
 *            sphere centre
 * @param r
 *            sphere radius
 * @return true, if AABB intersects with sphere
 */

AABB.prototype.intersectsSphere = function(c, r) {
	if(arguments.length == 1){ //must've been a sphere
		r = c.radius;
	}
    var s,
		d = 0;
    // find the square of the distance
    // from the sphere to the box
    if (c.x < this.min.x) {
        s = c.x - this.min.x;
        d = s * s;
    } else if (c.x > this.max.x) {
        s = c.x - this.max.x;
        d += s * s;
    }

    if (c.y < this.min.y) {
        s = c.y - this.min.y;
        d += s * s;
    } else if (c.y > this.max.y) {
        s = c.y - this.max.y;
        d += s * s;
    }

    if (c.z < this.min.z) {
        s = c.z - this.min.z;
        d += s * s;
    } else if (c.z > this.max.z) {
        s = c.z - this.max.z;
        d += s * s;
    }

    return d <= r * r;
};

AABB.prototype.intersectsTriangle = function(tri) {
	// use separating axis theorem to test overlap between triangle and box
	// need to test for overlap in these directions:
	//
	// 1) the {x,y,z}-directions (actually, since we use the AABB of the
	// triangle
	// we do not even need to test these)
	// 2) normal of the triangle
	// 3) crossproduct(edge from tri, {x,y,z}-directin)
	// this gives 3x3=9 more tests
	var v0,
		v1,
		v2,
		normal,
		e0,
		e1,
		e2,
		f;

	// move everything so that the boxcenter is in (0,0,0)
	v0 = tri.a.sub(this);
	v1 = tri.b.sub(this);
	v2 = tri.c.sub(this);

	// compute triangle edges
	e0 = v1.sub(v0);
	e1 = v2.sub(v1);
	e2 = v0.sub(v2);

	// test the 9 tests first (this was faster)
	f = e0.getAbs();
	if (this.testAxis(e0.z, -e0.y, f.z, f.y, v0.y, v0.z, v2.y, v2.z, this.extent.y, this.extent.z)) {
		return false;
	}
	if (this.testAxis(-e0.z, e0.x, f.z, f.x, v0.x, v0.z, v2.x, v2.z, this.extent.x, this.extent.z)) {
		return false;
	}
	if (this.testAxis(e0.y, -e0.x, f.y, f.x, v1.x, v1.y, v2.x, v2.y, this.extent.x, this.extent.y)) {
		return false;
	}

	f = e1.getAbs();
	if (this.testAxis(e1.z, -e1.y, f.z, f.y, v0.y, v0.z, v2.y, v2.z, this.extent.y, this.extent.z)) {
		return false;
	}
	if (this.testAxis(-e1.z, e1.x, f.z, f.x, v0.x, v0.z, v2.x, v2.z, this.extent.x, this.extent.z)) {
		return false;
	}
	if (this.testAxis(e1.y, -e1.x, f.y, f.x, v0.x, v0.y, v1.x, v1.y, this.extent.x, this.extent.y)) {
		return false;
	}

	f = e2.getAbs();
	if (this.testAxis(e2.z, -e2.y, f.z, f.y, v0.y, v0.z, v1.y, v1.z, this.extent.y, this.extent.z)) {
		return false;
	}
	if (this.testAxis(-e2.z, e2.x, f.z, f.x, v0.x, v0.z, v1.x, v1.z, this.extent.x, this.extent.z)) {
		return false;
	}
	if (this.testAxis(e2.y, -e2.x, f.y, f.x, v1.x, v1.y, v2.x, v2.y, this.extent.x, this.extent.y)) {
		return false;
	}

	// first test overlap in the {x,y,z}-directions
	// find min, max of the triangle each direction, and test for overlap in
	// that direction -- this is equivalent to testing a minimal AABB around
	// the triangle against the AABB

	// test in X-direction
	if (mathUtils.min(v0.x, v1.x, v2.x) > this.extent.x || mathUtils.max(v0.x, v1.x, v2.x) < -this.extent.x) {
		return false;
	}

	// test in Y-direction
	if (mathUtils.min(v0.y, v1.y, v2.y) > this.extent.y || mathUtils.max(v0.y, v1.y, v2.y) < -this.extent.y) {
		return false;
	}

	// test in Z-direction
	if (mathUtils.min(v0.z, v1.z, v2.z) > this.extent.z || mathUtils.max(v0.z, v1.z, v2.z) < -this.extent.z) {
		return false;
	}

	// test if the box intersects the plane of the triangle
	// compute plane equation of triangle: normal*x+d=0
	normal = e0.cross(e1);
	var d = -normal.dot(v0);
	if (!this.planeBoxOverlap(normal, d, this.extent)) {
		return false;
	}
	return true;
};

AABB.prototype.planeBoxOverlap = function(normal, d, maxbox) {
    var vmin = new Vec3D();
    var vmax = new Vec3D();

    if (normal.x > 0.0) {
        vmin.x = -maxbox.x;
        vmax.x = maxbox.x;
    } else {
        vmin.x = maxbox.x;
        vmax.x = -maxbox.x;
    }

    if (normal.y > 0.0) {
        vmin.y = -maxbox.y;
        vmax.y = maxbox.y;
    } else {
        vmin.y = maxbox.y;
        vmax.y = -maxbox.y;
    }

    if (normal.z > 0.0) {
        vmin.z = -maxbox.z;
        vmax.z = maxbox.z;
    } else {
        vmin.z = maxbox.z;
        vmax.z = -maxbox.z;
    }
    if (normal.dot(vmin) + d > 0.0) {
        return false;
    }
    if (normal.dot(vmax) + d >= 0.0) {
        return true;
    }
    return false;
};

/**
 * Updates the position of the box in space and calls
 * {@link #updateBounds()} immediately
 *
 * @see geom.Vec3D#set(float, float, float)
 */

AABB.prototype.set = function(a,b,c) {
		if(internals.is.AABB( a )) {
			this.extent.set(a.extent);
			return Vec3D.set.apply(this,[a]);
		}
		if( internals.has.XYZ( a )){
			b = a.y;
			c = a.z;
			a = a.a;
		}
		this.x = a;
		this.y = b;
		this.z = c;
		this.updateBounds();
		return this;
 };


AABB.prototype.setExtent = function(extent) {
        this.extent = extent.copy();
        return this.updateBounds();
};

AABB.prototype.testAxis = function(a, b, fa, fb, va, vb, wa, wb, ea, eb) {
    var p0 = a * va + b * vb;
    var p2 = a * wa + b * wb;
    var min;
	var max;
    if (p0 < p2) {
        min = p0;
        max = p2;
    } else {
        min = p2;
        max = p0;
    }
    var rad = fa * ea + fb * eb;
    return (min > rad || max < -rad);
};

AABB.prototype.toMesh = function(mesh){
	if(mesh === undefined){
		var TriangleMesh = require('./mesh/meshCommon').TriangleMesh;
		mesh = new TriangleMesh("aabb",8,12);
	}
	var a = this.min,//new Vec3D(this.min.x,this.max.y,this.max.z),
		g = this.max,//new Vec3D(this.max.x,this.max.y,this.max.z),
		b = new Vec3D(a.x, a.y, g.z),
		c = new Vec3D(g.x, a.y, g.z),
		d = new Vec3D(g.x, a.y, a.z),
		e = new Vec3D(a.x, g.y, a.z),
		f = new Vec3D(a.x, g.y, g.z),
		h = new Vec3D(g.x, g.y, a.z),
		ua = new Vec2D(0,0),
		ub = new Vec2D(1,0),
		uc = new Vec2D(1,1),
		ud = new Vec2D(0,1);
	// left
	mesh.addFace(a, b, f, ud, uc, ub);
	mesh.addFace(a, f, e, ud, ub, ua);
	// front
	mesh.addFace(b, c, g, ud, uc, ub);
	mesh.addFace(b, g, f, ud, ub, ua);
	// right
	mesh.addFace(c, d, h, ud, uc, ub);
	mesh.addFace(c, h, g, ud, ub, ua);
	// back
	mesh.addFace(d, a, e, ud, uc, ub);
	mesh.addFace(d, e, h, ud, ub, ua);
	// top
	mesh.addFace(e, f, h, ua, ud, ub);
	mesh.addFace(f, g, h, ud, uc, ub);
	// bottom
	mesh.addFace(a, d, b, ud, uc, ua);
	mesh.addFace(b, d, c, ua, uc, ub);
	return mesh;

};


AABB.prototype.toString = function() {
   return "<aabb> pos: "+Vec3D.prototype.toString.call(this)+" ext: "+this.extent.toString();
};

/**
* Updates the min/max corner points of the box. MUST be called after moving
* the box in space by manipulating the public x,y,z coordinates directly.
*
* @return itself
*/
AABB.prototype.updateBounds = function() {
  // this is check is necessary for the constructor
  if (this.extent !== undefined) {
      this.min = this.sub(this.extent);
      this.max = this.add(this.extent);
  }
  return this;
};

module.exports = AABB;



},{"../internals":30,"../math/mathUtils":45,"./Vec2D":19,"./Vec3D":20,"./mesh/meshCommon":25}],3:[function(require,module,exports){

/**
 * @class
 * Helper class for the spline3d classes in this package. Used to compute
 * subdivision points of the curve.
 * @member toxi
 * @param {Number} res number of subdivision steps between each control point of the spline3d
 */
var	BernsteinPolynomial = function(res) {
	this.resolution = res;
	var b0 = [],
		b1 = [],
		b2 = [],
		b3 = [];
	var t = 0;
	var dt = 1.0 / (res - 1);
	for (var i = 0; i < res; i++) {
		var t1 = 1 - t;
		var t12 = t1 * t1;
		var t2 = t * t;
		b0[i] = t1 * t12;
		b1[i] = 3 * t * t12;
		b2[i] = 3 * t2 * t1;
		b3[i] = t * t2;
		t += dt;
	}
	this.b0 = b0;
	this.b1 = b1;
	this.b2 = b2;
	this.b3 = b3;
};

module.exports = BernsteinPolynomial;



},{}],4:[function(require,module,exports){

    module.exports = require('./Ellipse').Circle;


},{"./Ellipse":5}],5:[function(require,module,exports){


var extend = require('../internals/extend'),
	has = require('../internals/has'),
	is = require('../internals/is'),
	mathUtils = require('../math/mathUtils'),
	Vec2D = require('./Vec2D');


//declared in this module
var Ellipse, Circle;

/**
 * @class defines a 2D ellipse and provides several utility methods for it.
 * @member toxi
 * @augments Vec2D
 */

Ellipse = function(a,b,c,d) {
	this.radius = new Vec2D();
	if(arguments.length === 0){
		Vec2D.apply(this,[0,0]);
		this.setRadii(1,1);
	} else if( has.XY( a ) ) {
		Vec2D.apply(this,[a.x,a.y]);
		if( has.XY( b ) ){
			this.setRadii(b.x,b.y);
		} else {
			this.setRadii(b,c);
		}
	} else {
		if(d === undefined) {
			if(c === undefined) {
				Vec2D.call(this, 0, 0 );
				this.setRadii(a,b);
			} else {
				Vec2D.call(this, a, b );
				this.setRadii(c,c);
			}
		} else {
			Vec2D.call(this, a,b);
			this.setRadii(c,d);
		}
	}
};

extend(Ellipse,Vec2D);

Ellipse.prototype.containsPoint = function(p) {
    var foci = this.getFoci();
    return p.distanceTo(foci[0]) + p.distanceTo(foci[1]) < 2 * mathUtils.max(this.radius.x, this.radius.y);
};

/**
 * Computes the area covered by the ellipse.
 */
Ellipse.prototype.getArea = function() {
    return mathUtils.PI * this.radius.x * this.radius.y;
};

/**
 * Computes the approximate circumference of the ellipse, using this
 * equation: <code>2 * PI * sqrt(1/2 * (rx*rx+ry*ry))</code>.
 *
 * The precise value is an infinite series elliptical integral, but the
 * approximation comes sufficiently close. See Wikipedia for more details:
 *
 * http://en.wikipedia.org/wiki/Ellipse
 *
 * @return circumference
 */
Ellipse.prototype.getCircumference = function() {
    // wikipedia solution:
    // return (float) (MathUtils.PI * (3 * (radius.x + radius.y) - Math
    // .sqrt((3 * radius.x + radius.y) * (radius.x + 3 * radius.y))));
    return Math.sqrt(0.5 * this.radius.magSquared()) * mathUtils.TWO_PI;
};

/**
 * @return the focus
 */
Ellipse.prototype.getFoci = function() {
    var foci = [];
    if (this.radius.x > this.radius.y) {
        foci[0] = this.sub(this.focus, 0);
        foci[1] = this.add(this.focus, 0);
    } else {
        foci[0] = this.sub(0, this.focus);
        foci[1] = this.add(0, this.focus);
    }
    return foci;
};

/**
 * @return the 2 radii of the ellipse as a Vec2D
 */
Ellipse.prototype.getRadii = function() {
    return this.radius.copy();
};


/**
 * Sets the radii of the ellipse to the new values.
 *
 * @param rx
 * @param ry
 * @return itself
 */
Ellipse.prototype.setRadii = function(rx,ry) {
	if( has.XY( rx ) ){
		ry = rx.y;
		rx = rx.x;
	}
    this.radius.set(rx, ry);
    this.focus = this.radius.magnitude();
    return this;
};

/**
 * Creates a {@link Polygon2D} instance of the ellipse sampling it at the
 * given resolution.
 *
 * @param res
 *            number of steps
 * @return ellipse as polygon
 */
Ellipse.prototype.toPolygon2D = function(res) {
    var Polygon2D = require('./Polygon2D');
    var poly = new Polygon2D();
    var step = mathUtils.TWO_PI / res;
    for (var i = 0; i < res; i++) {
		var v = Vec2D.fromTheta(i * step).scaleSelf(this.radius).addSelf(this);
		poly.add(v);
	}
    return poly;
};


exports = module.exports = Ellipse;

/**
 * Circle
 * @class This class overrides {@link Ellipse} to define a 2D circle and provides
 * several utility methods for it, including factory methods to construct
 * circles from points.
 * @member toxi
 * @augments Ellipse
 */
Circle = function(a,b,c) {
	if(arguments.length == 1){
		if( is.Circle( a ) ){
			Ellipse.apply(this,[a,a.radius.x]);
		} else {
			Ellipse.apply(this,[0,0,a]);
		}
	} else if(arguments.length == 2){
		Ellipse.apply(this,[a,b]);
	} else {
		Ellipse.apply(this,[a,b,c,c]);
	}
};

extend(Circle,Ellipse);





/**
 * Factory method to construct a circle which has the two given points lying
 * on its perimeter. If the points are coincident, the circle will have a
 * radius of zero.
 *
 * @param p1
 * @param p2
 * @return new circle instance
 */
Circle.from2Points = function(p1,p2) {
    var m = p1.interpolateTo(p2, 0.5);
    var distanceTo = m.distanceTo(p1);
    return new Circle(m, distanceTo);
};

/**
 * Factory method to construct a circle which has the three given points
 * lying on its perimeter. The function returns null, if the 3 points are
 * co-linear (in which case it's impossible to find a circle).
 *
 * Based on CPP code by Paul Bourke:
 * http://local.wasp.uwa.edu.au/~pbourke/geometry/circlefrom3/
 *
 * @param p1
 * @param p2
 * @param p3
 * @return new circle instance or null
 */
Circle.from3Points = function(p1,p2,p3) {
    var circle,
		deltaA = p2.sub(p1),
		deltaB = p3.sub(p2),
		centroid,
		radius;
	if (mathUtils.abs(deltaA.x) <= 0.0000001 && mathUtils.abs(deltaB.y) <= 0.0000001) {
		centroid = new Vec2D(p2.x + p3.x, p1.y + p2.y).scaleSelf(0.5);
		radius = centroid.distanceTo(p1);
		circle = new Circle(centroid, radius);
	} else {
		var aSlope = deltaA.y / deltaA.x;
		var bSlope = deltaB.y / deltaB.x;
		if (mathUtils.abs(aSlope - bSlope) > 0.0000001 && aSlope !== 0) {
			var x = (aSlope * bSlope * (p1.y - p3.y) + bSlope * (p1.x + p2.x) - aSlope * (p2.x + p3.x)) / (2 * (bSlope - aSlope));
			var y = -(x - (p1.x + p2.x) / 2) / aSlope + (p1.y + p2.y) / 2;
			centroid = new Vec2D(x, y);
			radius = centroid.distanceTo(p1);
			circle = new Circle(centroid, radius);
		}
	}
    return circle;
};


Circle.newBoundingCircle = function( vertices ){
	var origin = new Vec2D();
	var maxD = 0;
	var i = 0;
	var l = vertices.length;
	for( ; i<l; i++ ){
		origin.addSelf( vertices[i] );
	}
	origin.scaleSelf( 1 / vertices.length );
	for( i = 0; i<l; i++ ){
		var d = origin.distanceToSquared( vertices[i] );
		if( d > maxD ) {
			maxD = d;
		}
	}
	return new Circle( origin, Math.sqrt( maxD ) );
};




Circle.prototype.containsPoint = function(p) {
    return this.distanceToSquared(p) <= this.radius.x * this.radius.x;
};

Circle.prototype.getCircumference = function() {
    return mathUtils.TWO_PI * this.radius.x;
};

Circle.prototype.getRadius = function() {
    return this.radius.x;
};

Circle.prototype.getTangentPoints = function(p) {
    var m = this.interpolateTo(p, 0.5);
    return this.intersectsCircle(new Circle(m, m.distanceTo(p)));
};


Circle.prototype.intersectsCircle = function(c) {
    var res,
		delta = c.sub(this),
		d = delta.magnitude(),
		r1 = this.radius.x,
		r2 = c.radius.x;
    if (d <= r1 + r2 && d >= Math.abs(r1 - r2)) {
        var a = (r1 * r1 - r2 * r2 + d * d) / (2.0 * d);
        d = 1 / d;
        var p = this.add(delta.scale(a * d));
        var h = Math.sqrt(r1 * r1 - a * a);
        delta.perpendicular().scaleSelf(h * d);
        var i1 = p.add(delta);
        var i2 = p.sub(delta);
        res = [i1, i2 ];
    }
    return res;
};

Circle.prototype.setRadius = function(r) {
    this.setRadii(r, r);
    return this;
};


exports.Circle = Circle;



},{"../internals/extend":35,"../internals/has":37,"../internals/is":38,"../math/mathUtils":45,"./Polygon2D":10,"./Vec2D":19}],6:[function(require,module,exports){


var Vec3D = require('./Vec3D');

/**
 * @class
 * @member toxi
 */
var	IsectData3D = function(isec){
	if(isec !== undefined){
		this.isIntersection = isec.isIntersection;
		this.dist = isec.dist;
		this.pos = isec.pos.copy();
		this.dir = isec.dir.copy();
		this.normal = isec.normal.copy();
	}
	else {
		this.clear();
	}
};

IsectData3D.prototype = {
	clear: function(){
		this.isIntersection = false;
		this.dist = 0;
		this.pos = new Vec3D();
		this.dir = new Vec3D();
		this.normal = new Vec3D();
	},

	toString: function(){
		var s = "isec: "+this.isIntersection;
		if(this.isIntersection){
			s += " at:"+this.pos+ " dist:"+this.dist+" normal:"+this.normal;
		}
		return s;
	}
};

module.exports = IsectData3D;


},{"./Vec3D":20}],7:[function(require,module,exports){


var	Ray2D = require('./Ray2D'),
	internals = require('../internals'),
    mathUtils = require('../math/mathUtils');


/**
 @class
 @member toxi
 */
var Line2D = function( a, b) {
	this.a = a;
	this.b = b;
};


Line2D.prototype = {
    constructor: Line2D,

    /**
     * Computes the dot product of these 2 vectors: line start -> point
     * and the perpendicular line direction if the result is negative.
     *
     * @param {Vec2D} p
     * @return classifier Number
     */
    classifyPoint: function(p){
        var normal = this.b.sub(this.a).perpendicular();
        var d = p.sub(this.a).dot(normal);
        return mathUtils.sign(d);
    },

	/**
    * Computes the closest point on this line to the point given.
    *
    * @param {Vec2D} p point to check against
    * @return closest point on the line
    */
	closestPointTo: function(p) {
		var v = this.b.sub(this.a);
		var t = p.sub(this.a).dot(v) / v.magSquared();
		// Check to see if t is beyond the extents of the line segment
		if (t < 0.0) {
			return this.a.copy();
		} else if (t > 1.0) {
			return this.b.copy();
		}
		// Return the point between 'a' and 'b'
		return this.a.add(v.scaleSelf(t));
	},

	copy: function() {
		return new Line2D(this.a.copy(), this.b.copy());
	},

    distanceToPoint: function(p){
        return this.closestPointTo(p).distanceTo(p);
    },

    distanceToPointSquared: function(p){
        return this.closestPointTo(p).distanceToSquared(p);
    },

	equals: function(obj) {
		if (this == obj) {
			return true;
		}
		if (!( internals.is.Line2D( obj ) ) ) {
			return false;
		}
		var l = obj;
		return (this.a.equals(l.a) || this.a.equals(l.b)) && (this.b.equals(l.b) || this.b.equals(l.a));
	},

	getDirection: function() {
		return this.b.sub(this.a).normalize();
	},

    getHeading: function(){
        return this.b.sub(this.a).heading();
    },

	getLength: function() {
		return this.a.distanceTo(this.b);
	},

	getLengthSquared: function() {
		return this.a.distanceToSquared(this.b);
	},

	getMidPoint: function() {
		return this.a.add(this.b).scaleSelf(0.5);
	},

	getNormal: function() {
		return this.b.sub(this.a).perpendicular();
	},

	getTheta: function() {
		return this.a.angleBetween(this.b, true);
	},

	hasEndPoint: function(p) {
		return this.a.equals(p) || this.b.equals(p);
	},

	/**
    * Computes intersection between this and the given line. The returned value
    * is a {@link LineIntersection} instance and contains both the type of
    * intersection as well as the intersection point (if existing).
    *
    * Based on: http://local.wasp.uwa.edu.au/~pbourke/geometry/lineline2d/
    *
    * @param l
    *            line to intersect with
    * @return intersection result
    */
	intersectLine: function(l) {

        var Type = Line2D.LineIntersection.Type;

		var isec,
			denom = (l.b.y - l.a.y) * (this.b.x - this.a.x) - (l.b.x - l.a.x) * (this.b.y - this.a.y),
			na = (l.b.x - l.a.x) * (this.a.y - l.a.y) - (l.b.y - l.a.y) * (this.a.x - l.a.x),
			nb = (this.b.x - this.a.x) * (this.a.y - l.a.y) - (this.b.y - this.a.y) * (this.a.x - l.a.x);
		if (denom !== 0) {
			var ua = na / denom,
				ub = nb / denom,
                vecI = this.a.interpolateTo(this.b, ua);

			if (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0) {
				isec =new Line2D.LineIntersection(Type.INTERSECTING, vecI, ua, ub);
			} else {
				isec = new Line2D.LineIntersection(Type.NON_INTERSECTING, vecI, ua, ub);
			}
		} else {
			if (na === 0 && nb === 0) {
                if( this.distanceToPoint(l.a) === 0) {
                    isec = new Line2D.LineIntersection(Type.COINCIDENT, undefined);
                } else {
                    isec = new Line2D.LineIntersection(Type.COINCIDENT_NO_INTERSECT, undefined);
                }
			} else {
				isec = new Line2D.LineIntersection(Type.PARALLEL, undefined);
			}
		}
		return isec;
	},

	offsetAndGrowBy: function(offset,scale, ref) {
		var m = this.getMidPoint();
		var d = this.getDirection();
		var n = d.getPerpendicular();
		if (ref !== undefined && m.sub(ref).dot(n) < 0) {
			n.invert();
		}
		n.normalizeTo(offset);
		this.a.addSelf(n);
		this.b.addSelf(n);
		d.scaleSelf(scale);
		this.a.subSelf(d);
		this.b.addSelf(d);
		return this;
	},

	scale: function(scale) {
		var delta = (1 - scale) * 0.5;
		var newA = this.a.interpolateTo(this.b, delta);
		this.b.interpolateToSelf(this.a, delta);
		this.a.set(newA);
		return this;
	},

	set: function(a, b) {
		this.a = a;
		this.b = b;
		return this;
	},

	splitIntoSegments: function(segments,stepLength,addFirst) {
		return Line2D.splitIntoSegments(this.a, this.b, stepLength, segments, addFirst);
	},

	toRay2D: function() {
        var Ray2D = require('./Ray2D');
		return new Ray2D(this.a.copy(), this.b.sub(this.a).normalize());
	}
};



/**
 * Splits the line between A and B into segments of the given length,
 * starting at point A. The tweened points are added to the given result
 * list. The last point added is B itself and hence it is likely that the
 * last segment has a shorter length than the step length requested. The
 * first point (A) can be omitted and not be added to the list if so
 * desired.
 *
 * @param a start point
 * @param b end point (always added to results)
 * @param stepLength desired distance between points
 * @param segments existing array list for results (or a new list, if null)
 * @param addFirst false, if A is NOT to be added to results
 * @return list of result vectors
 */
Line2D.splitIntoSegments = function(a, b, stepLength, segments, addFirst) {
	if (segments === undefined) {
		segments = [];
	}
	if (addFirst) {
		segments.push(a.copy());
	}
	var dist = a.distanceTo(b);
	if (dist > stepLength) {
		var pos = a.copy();
		var step = b.sub(a).limit(stepLength);
		while (dist > stepLength) {
			pos.addSelf(step);
			segments.push(pos.copy());
			dist -= stepLength;
		}
	}
	segments.push(b.copy());
	return segments;
};


/**
 * Internal class for LineIntersection
 * @param {Number} type one of the Line2D.LineIntersection.Type
 * @param {Vec2D} pos the intersected point
 * @param {Number} ua coefficient
 * @param {Number} ub coefficient
 */
Line2D.LineIntersection = function(type, pos, ua, ub) {
	this.type = type;
	this.pos = pos;
    this.coeff = [ua, ub];
};

Line2D.LineIntersection.prototype = {
	getPos: function(){
		return this.pos ? this.pos.copy() : undefined;
	},

    getCoefficients: function(){
        return this.coeff;
    },

	getType: function(){
		return this.type;
	},

	toString: function(){
		return "type: "+this.type+ " pos: "+this.pos;
	}
};

Line2D.LineIntersection.Type = {
    COINCIDENT: 0,
    PARALLEL: 1,
    NON_INTERSECTING: 2,
    INTERSECTING: 3
};


module.exports = Line2D;


},{"../internals":30,"../math/mathUtils":45,"./Ray2D":12}],8:[function(require,module,exports){


var mathUtils = require('../math/mathUtils'),
    Ray3D = require('./Ray3D');

/**
 @class
 @member toxi
 */
var Line3D = function(vec_a, vec_b) {
    this.a = vec_a;
    this.b = vec_b;
};

Line3D.prototype = {
    constructor: Line3D,
    closestLineTo: function(l) {

        var p43 = l.a.sub(l.b);
        if (p43.isZeroVector()) {
            return new Line3D.LineIntersection(Line3D.LineIntersection.Type.NON_INTERSECTING);
        }

        var p21 = this.b.sub(this.a);
        if (p21.isZeroVector()) {
            return new Line3D.LineIntersection(Line3D.LineIntersection.Type.NON_INTERSECTING);
        }
        var p13 = this.a.sub(l.a);

        var d1343 = p13.x * p43.x + p13.y * p43.y + p13.z * p43.z;
        var d4321 = p43.x * p21.x + p43.y * p21.y + p43.z * p21.z;
        var d1321 = p13.x * p21.x + p13.y * p21.y + p13.z * p21.z;
        var d4343 = p43.x * p43.x + p43.y * p43.y + p43.z * p43.z;
        var d2121 = p21.x * p21.x + p21.y * p21.y + p21.z * p21.z;

        var denom = d2121 * d4343 - d4321 * d4321;
        if (Math.abs(denom) < mathUtils.EPS) {
            return new Line3D.LineIntersection(Line3D.LineIntersection.Type.NON_INTERSECTING);
        }
        var numer = d1343 * d4321 - d1321 * d4343;
        var mua = numer / denom;
        var mub = (d1343 + d4321 * mua) / d4343;

        var pa = this.a.add(p21.scaleSelf(mua));
        var pb = l.a.add(p43.scaleSelf(mub));
        return new Line3D.LineIntersection(Line3D.LineIntersection.Type.INTERSECTING, new Line3D(pa, pb), mua,mub);
    },

    /**
    * Computes the closest point on this line to the given one.
    *
    * @param p
    *            point to check against
    * @return closest point on the line
    */
    closestPointTo: function(p) {
        var v = this.b.sub(this.a);
        var t = p.sub(this.a).dot(v) / v.magSquared();
        // Check to see if t is beyond the extents of the line segment
        if (t < 0.0) {
            return this.a.copy();
        } else if (t > 1.0) {
            return this.b.copy();
        }
        // Return the point between 'a' and 'b'
        return this.a.add(v.scaleSelf(t));
    },

    copy: function() {
        return new Line3D(this.a.copy(), this.b.copy());
    },

    equals: function(obj) {
        if (this == obj) {
            return true;
        }
        if ((typeof(obj) != Line3D)) {
            return false;
        }
        return (this.a.equals(obj.a) || this.a.equals(l.b)) && (this.b.equals(l.b) || this.b.equals(l.a));
    },

    getDirection: function() {
        return this.b.sub(this.a).normalize();
    },

    getLength: function() {
        return this.a.distanceTo(this.b);
    },

    getLengthSquared: function() {
        return this.a.distanceToSquared(this.b);
    },

    getMidPoint: function() {
        return this.a.add(this.b).scaleSelf(0.5);
    },

    getNormal: function() {
        return this.b.cross(this.a);
    },

    hasEndPoint: function(p) {
        return this.a.equals(p) || this.b.equals(p);
    },


    offsetAndGrowBy: function(offset,scale,ref) {
        var m = this.getMidPoint(),
            d = this.getDirection(),
            n = this.a.cross(d).normalize();
        if (ref !== undefined && m.sub(ref).dot(n) < 0) {
            n.invert();
        }
        n.normalizeTo(offset);
        this.a.addSelf(n);
        this.b.addSelf(n);
        d.scaleSelf(scale);
        this.a.subSelf(d);
        this.b.addSelf(d);
        return this;
    },

    set: function(vec_a, vec_b) {
        this.a = vec_a;
        this.b = vec_b;
        return this;
    },

    splitIntoSegments: function(segments,stepLength, addFirst) {
        return Line3D.splitIntoSegments(this.a, this.b, stepLength, segments, addFirst);
    },

    toRay3D: function(){
        return new Ray3D( this.a.copy(), this.getDirection() );
    },

    toString: function() {
        return this.a.toString() + " -> " + this.b.toString();
    }
};

/**
    * Splits the line between A and B into segments of the given length,
    * starting at point A. The tweened points are added to the given result
    * list. The last point added is B itself and hence it is likely that the
    * last segment has a shorter length than the step length requested. The
    * first point (A) can be omitted and not be added to the list if so
    * desired.
    *
    * @param a
    *            start point
    * @param b
    *            end point (always added to results)
    * @param stepLength
    *            desired distance between points
    * @param segments
    *            existing array list for results (or a new list, if null)
    * @param addFirst
    *            false, if A is NOT to be added to results
    * @return list of result vectors
    */
Line3D.splitIntoSegments = function(vec_a, vec_b, stepLength, segments, addFirst) {
    if (segments === undefined) {
        segments = [];
    }
    if (addFirst) {
        segments.push(vec_a.copy());
    }
    var dist = vec_a.distanceTo(vec_b);
    if (dist > stepLength) {
        var pos = vec_a.copy();
        var step = vec_b.sub(vec_a).limit(stepLength);
        while (dist > stepLength) {
            pos.addSelf(step);
            segments.push(pos.copy());
            dist -= stepLength;
        }
    }
    segments.push(vec_b.copy());
    return segments;
};


Line3D.LineIntersection = function(type,line,mua,mub){
    this.type = type;
    if(mua === undefined){ mua = 0; }
    if(mub === undefined){ mub = 0; }
    this.line = line;
    this.coeff = [mua,mub];
};

Line3D.LineIntersection.prototype = {

    getCoefficient: function(){
        return this.coeff;
    },

    getLength: function(){
        if(this.line === undefined){ return undefined; }
        return this.line.getLength();
    },

    getLine: function(){
        if(this.line === undefined){ return undefined; }
        return this.line.copy();
    },

    getType: function(){
        return this.type;
    },

    isIntersectionInside: function(){
        return this.type == Line3D.LineIntersection.Type.INTERSECTING && this.coeff[0] >= 0 && this.coeff[0] <= 1 && this.coeff[1] >=0 && this.coeff[1] <= 1;
    },

    toString: function(){
        return "type: "+this.type+ " line: "+this.line;
    }
};

Line3D.LineIntersection.Type = {
    NON_INTERSECTING: 0,
    INTERSECTING: 1
};

module.exports = Line3D;



},{"../math/mathUtils":45,"./Ray3D":13}],9:[function(require,module,exports){


var mathUtils = require('../math/mathUtils'),
    internals = require('../internals'),
	Vec3D = require('./Vec3D');


/**
 * @description Implements a simple row-major 4x4 matrix class, all matrix operations are
 * applied to new instances. Use {@link #transpose()} to convert from
 * column-major formats...
 * @exports Matrix4x4 as toxi.Matrix4x4
 * @constructor
 */
var Matrix4x4 = function(v11,v12,v13,v14,v21,v22,v23,v24,v31,v32,v33,v34,v41,v42,v43,v44){
	this.temp = [];
	this.matrix = [];
	var self = this;
	if(arguments.length === 0) { //if no variables were supplied
		this.matrix[0] = [1,0,0,0];
		this.matrix[1] = [0,1,0,0];
		this.matrix[2] = [0,0,1,0];
		this.matrix[3] = [0,0,0,1];
	} else if(typeof(v11) == 'number'){ //if the variables were numbers
		var m1 = [v11,v12,v13,v14];
		var m2 = [v21,v22,v23,v24];
		var m3 = [v31,v32,v33,v34];
		var m4 = [v41,v42,v43,v44];
		this.matrix = [m1,m2,m3,m4];
	} else if( internals.is.Array( v11 ) ){ //if it was sent in as one array
		var array = v11;
		if (array.length != 9 && array.length != 16) {
			throw new Error("Matrix4x4: Array length must == 9 or 16");
		}
		if (array.length == 16) {
			this.matrix = [];
			this.matrix[0] = array.slice(0,4);
			this.matrix[1] = array.slice(4,8);
			this.matrix[2] = array.slice(8,12);
			this.matrix[3] = array.slice(12);
		} else {
			this.matrix[0] = array.slice(0,3);
			this.matrix[0][3] = NaN;
			this.matrix[1] = array.slice(3,6);
			this.matrix[1][3] = NaN;
			this.matrix[2] = array.slice(6,9);
			this.matrix[2][3] = NaN;
			this.matrix[3] = [NaN,NaN,NaN,NaN];
		}
	} else if( internals.is.Matrix4x4( v11 ) ){

	//else it should've been a Matrix4x4 that was passed in
		var m = v11,
			i = 0,
			j = 0,
			lenM,
			lenMM;

		if(m.matrix.length == 16){
			for(i=0;i<4;i++){
				this.matrix[i] = [m.matrix[i][0], m.matrix[i][1],m.matrix[i][2],m.matrix[i][3]];
			}
		} else {
			if(m.matrix.length == 4){
				lenM = m.matrix.length;
				for(i = 0; i < lenM; i++){
					lenMM = m.matrix[i].length;
					self.matrix[i] = [];
					for(j = 0; j < lenMM; j++){
						self.matrix[i][j] = m.matrix[i][j];
					}
				}
			}
			/*console.log("m.matrix.length: "+m.matrix.length);
			//should be a length of 9
			for(i=0;i<3;i++){
				this.matrix[i] = [m.matrix[i][0], m.matrix[i][1],m.matrix[i][2],NaN];
			}
			this.matrix[3] = [NaN,NaN,NaN,NaN];*/
		}
	} else {
		console.error("Matrix4x4: incorrect parameters used to construct new instance");
	}
};

Matrix4x4.prototype = {
	add: function(rhs) {
        var result = new Matrix4x4(this);
        return result.addSelf(rhs);
    },

    addSelf: function(m) {
        for (var i = 0; i < 4; i++) {
            var mi = this.matrix[i];
            var rhsm = m.matrix[i];
            mi[0] += rhsm[0];
            mi[1] += rhsm[1];
            mi[2] += rhsm[2];
            mi[3] += rhsm[3];
        }
        return this;
    },

    /**
     * Creates a copy of the given vector, transformed by this matrix.
     *
     * @param v
     * @return transformed vector
     */
    applyTo: function(v) {
        return this.applyToSelf(new Vec3D(v));
    },

    applyToSelf: function(v) {
        for (var i = 0; i < 4; i++) {
            var m = this.matrix[i];
            this.temp[i] = v.x * m[0] + v.y * m[1] + v.z * m[2] + m[3];
        }
        v.set(this.temp[0], this.temp[1], this.temp[2]).scaleSelf((1.0 / this.temp[3]));
        return v;
    },

    copy: function() {
        return new Matrix4x4(this);
    },

    getInverted: function() {
        return new Matrix4x4(this).invert();
    },

    getRotatedAroundAxis: function(axis,theta) {
        return new Matrix4x4(this).rotateAroundAxis(axis, theta);
    },

    getRotatedX: function(theta) {
        return new Matrix4x4(this).rotateX(theta);
    },

    getRotatedY: function(theta) {
        return new Matrix4x4(this).rotateY(theta);
    },

    getRotatedZ: function(theta) {
        return new Matrix4x4(this).rotateZ(theta);
    },

    getTransposed: function() {
        return new Matrix4x4(this).transpose();
    },

    identity: function() {
        var m = this.matrix[0];
        m[1] = m[2] = m[3] = 0;
        m = this.matrix[1];
        m[0] = m[2] = m[3] = 0;
        m = this.matrix[2];
        m[0] = m[1] = m[3] = 0;
        m = this.matrix[3];
        m[0] = m[1] = m[2] = 0;
        this.matrix[0][0] = 1;
        this.matrix[1][1] = 1;
        this.matrix[2][2] = 1;
        this.matrix[3][3] = 1;
        return this;
    },

    /**
     * Matrix Inversion using Cramer's Method Computes Adjoint matrix divided by
     * determinant Code modified from
     * http://www.intel.com/design/pentiumiii/sml/24504301.pdf
     *
     * @return itself
     */
	invert: function() {
        var tmp = [], //12
			src = [], //16
			dst = [], //16
			mat = this.toArray(),
			i = 0;

        for (i = 0; i < 4; i++) {
            var i4 = i << 2;
            src[i] = mat[i4];
            src[i + 4] = mat[i4 + 1];
            src[i + 8] = mat[i4 + 2];
            src[i + 12] = mat[i4 + 3];
        }

        // calculate pairs for first 8 elements (cofactors)
        tmp[0] = src[10] * src[15];
        tmp[1] = src[11] * src[14];
        tmp[2] = src[9] * src[15];
        tmp[3] = src[11] * src[13];
        tmp[4] = src[9] * src[14];
        tmp[5] = src[10] * src[13];
        tmp[6] = src[8] * src[15];
        tmp[7] = src[11] * src[12];
        tmp[8] = src[8] * src[14];
        tmp[9] = src[10] * src[12];
        tmp[10] = src[8] * src[13];
        tmp[11] = src[9] * src[12];

        // calculate first 8 elements (cofactors)
        var src0 = src[0],
			src1 = src[1],
			src2 = src[2],
			src3 = src[3],
			src4 = src[4],
			src5 = src[5],
			src6 = src[6],
			src7 = src[7];
		dst[0] = tmp[0] * src5 + tmp[3] * src6 + tmp[4] * src7;
		dst[0] -= tmp[1] * src5 + tmp[2] * src6 + tmp[5] * src7;
		dst[1] = tmp[1] * src4 + tmp[6] * src6 + tmp[9] * src7;
		dst[1] -= tmp[0] * src4 + tmp[7] * src6 + tmp[8] * src7;
		dst[2] = tmp[2] * src4 + tmp[7] * src5 + tmp[10] * src7;
		dst[2] -= tmp[3] * src4 + tmp[6] * src5 + tmp[11] * src7;
		dst[3] = tmp[5] * src4 + tmp[8] * src5 + tmp[11] * src6;
		dst[3] -= tmp[4] * src4 + tmp[9] * src5 + tmp[10] * src6;
		dst[4] = tmp[1] * src1 + tmp[2] * src2 + tmp[5] * src3;
		dst[4] -= tmp[0] * src1 + tmp[3] * src2 + tmp[4] * src3;
		dst[5] = tmp[0] * src0 + tmp[7] * src2 + tmp[8] * src3;
		dst[5] -= tmp[1] * src0 + tmp[6] * src2 + tmp[9] * src3;
		dst[6] = tmp[3] * src0 + tmp[6] * src1 + tmp[11] * src3;
		dst[6] -= tmp[2] * src0 + tmp[7] * src1 + tmp[10] * src3;
		dst[7] = tmp[4] * src0 + tmp[9] * src1 + tmp[10] * src2;
		dst[7] -= tmp[5] * src0 + tmp[8] * src1 + tmp[11] * src2;

        // calculate pairs for second 8 elements (cofactors)
		tmp[0] = src2 * src7;
		tmp[1] = src3 * src6;
		tmp[2] = src1 * src7;
		tmp[3] = src3 * src5;
		tmp[4] = src1 * src6;
		tmp[5] = src2 * src5;
		tmp[6] = src0 * src7;
		tmp[7] = src3 * src4;
		tmp[8] = src0 * src6;
		tmp[9] = src2 * src4;
		tmp[10] = src0 * src5;
		tmp[11] = src1 * src4;

        // calculate second 8 elements (cofactors)
		src0 = src[8];
		src1 = src[9];
		src2 = src[10];
		src3 = src[11];
		src4 = src[12];
		src5 = src[13];
		src6 = src[14];
		src7 = src[15];
		dst[8] = tmp[0] * src5 + tmp[3] * src6 + tmp[4] * src7;
		dst[8] -= tmp[1] * src5 + tmp[2] * src6 + tmp[5] * src7;
		dst[9] = tmp[1] * src4 + tmp[6] * src6 + tmp[9] * src7;
		dst[9] -= tmp[0] * src4 + tmp[7] * src6 + tmp[8] * src7;
		dst[10] = tmp[2] * src4 + tmp[7] * src5 + tmp[10] * src7;
		dst[10] -= tmp[3] * src4 + tmp[6] * src5 + tmp[11] * src7;
		dst[11] = tmp[5] * src4 + tmp[8] * src5 + tmp[11] * src6;
		dst[11] -= tmp[4] * src4 + tmp[9] * src5 + tmp[10] * src6;
		dst[12] = tmp[2] * src2 + tmp[5] * src3 + tmp[1] * src1;
		dst[12] -= tmp[4] * src3 + tmp[0] * src1 + tmp[3] * src2;
		dst[13] = tmp[8] * src3 + tmp[0] * src0 + tmp[7] * src2;
		dst[13] -= tmp[6] * src2 + tmp[9] * src3 + tmp[1] * src0;
		dst[14] = tmp[6] * src1 + tmp[11] * src3 + tmp[3] * src0;
		dst[14] -= tmp[10] * src3 + tmp[2] * src0 + tmp[7] * src1;
		dst[15] = tmp[10] * src2 + tmp[4] * src0 + tmp[9] * src1;
		dst[15] -= tmp[8] * src1 + tmp[11] * src2 + tmp[5] * src0;

		var det = 1.0 / (src[0] * dst[0] + src[1] * dst[1] + src[2] * dst[2] + src[3] * dst[3]);
		for (i = 0, k = 0; i < 4; i++) {
			var m = this.matrix[i];
			for (var j = 0; j < 4; j++) {
				m[j] = dst[k++] * det;
			}
		}
		return this;
    },

    multiply: function(a) {
		if(typeof(a) == "number"){
			return new Matrix4x4(this).multiply(a);
		}
		//otherwise it should be a Matrix4x4
		return new Matrix4x4(this).multiplySelf(a);
    },

    multiplySelf: function(a) {
		var i = 0,
			m;
		if(typeof(a) == "number"){
			for (i = 0; i < 4; i++) {
				m = this.matrix[i];
				m[0] *= a;
				m[1] *= a;
				m[2] *= a;
				m[3] *= a;
			}
			return this;
		}
		//otherwise it should be a matrix4x4
		var mm0 = a.matrix[0],
			mm1 = a.matrix[1],
			mm2 = a.matrix[2],
			mm3 = a.matrix[3];
        for (i = 0; i < 4; i++) {
            m = this.matrix[i];
            for (var j = 0; j < 4; j++) {
                this.temp[j] = m[0] * mm0[j] + m[1] * mm1[j] + m[2] * mm2[j] + m[3] * mm3[j];
            }
            m[0] = this.temp[0];
            m[1] = this.temp[1];
            m[2] = this.temp[2];
            m[3] = this.temp[3];
        }
        return this;
    },
    /**
     * Applies rotation about arbitrary axis to matrix
     *
     * @param axis
     * @param theta
     * @return rotation applied to this matrix
     */
    rotateAroundAxis: function(axis, theta) {
        var x, y, z, s, c, t, tx, ty;
        x = axis.x;
        y = axis.y;
        z = axis.z;
        s = Math.sin(theta);
        c = Math.cos(theta);
        t = 1 - c;
        tx = t * x;
        ty = t * y;
		_TEMP.set(
			tx * x + c, tx * y + s * z, tx * z - s * y, 0, tx * y - s * z,
			ty * y + c, ty * z + s * x, 0, tx * z + s * y, ty * z - s * x,
			t * z * z + c, 0, 0, 0, 0, 1
		);
        return this.multiplySelf(_TEMP);
    },

    /**
     * Applies rotation about X to this matrix.
     *
     * @param theta
     *            rotation angle in radians
     * @return itself
     */
    rotateX: function(theta) {
        _TEMP.identity();
        _TEMP.matrix[1][1] = _TEMP.matrix[2][2] = Math.cos(theta);
        _TEMP.matrix[2][1] = Math.sin(theta);
        _TEMP.matrix[1][2] = -_TEMP.matrix[2][1];
        return this.multiplySelf(_TEMP);
    },

    /**
     * Applies rotation about Y to this matrix.
     *
     * @param theta
     *            rotation angle in radians
     * @return itself
     */
    rotateY: function(theta) {
        _TEMP.identity();
        _TEMP.matrix[0][0] = _TEMP.matrix[2][2] = Math.cos(theta);
        _TEMP.matrix[0][2] = Math.sin(theta);
        _TEMP.matrix[2][0] = -_TEMP.matrix[0][2];
        return this.multiplySelf(_TEMP);
    },

    // Apply Rotation about Z to Matrix
    rotateZ: function(theta) {
        _TEMP.identity();
        _TEMP.matrix[0][0] = _TEMP.matrix[1][1] = Math.cos(theta);
        _TEMP.matrix[1][0] = Math.sin(theta);
        _TEMP.matrix[0][1] = -_TEMP.matrix[1][0];
        return this.multiplySelf(_TEMP);
    },

    scale: function(a,b,c) {
		return new Matrix4x4(this).scaleSelf(a,b,c);
    },

    scaleSelf: function(a,b,c) {
		if( internals.has.XYZ( a ) ){
			b = a.y;
			c = a.z;
			a = a.x;
		} else if(b === undefined || c === undefined) {
			b = a;
			c = a;
		}
        _TEMP.identity();
        _TEMP.matrix[0][0] = a;
        _TEMP.matrix[1][1] = b;
        _TEMP.matrix[2][2] = c;
        return this.multiplySelf(_TEMP);
    },

	set: function(a,b,c, d, e,f,g, h, i, j, k, l, m, n, o, p) {
		var mat;
		if(typeof(a) == "number"){
			mat = this.matrix[0];
			mat[0] = a;
			mat[1] = b;
			mat[2] = c;
			mat[3] = d;
			mat = this.matrix[1];
			mat[0] = e;
			mat[1] = f;
			mat[2] = g;
			mat[3] = h;
			mat = this.matrix[2];
			mat[0] = i;
			mat[1] = j;
			mat[2] = k;
			mat[3] = l;
			mat = this.matrix[3];
			mat[0] = m;
			mat[1] = n;
			mat[2] = o;
			mat[3] = p;
		} else {
			//it must be a matrix4x4
			for (var it_n = 0; it_n < 4; it_n++) {
	            mat = this.matrix[it_n];
				var mat_n = mat.matrix[it_n];
				mat[0] = mat_n[0];
				mat[1] = mat_n[1];
				mat[2] = mat_n[2];
				mat[3] = mat_n[3];
			}
		}
		return this;
    },

    setFrustrum: function(left,right,top,bottom,near,far){
    	var rl = (right - left),
    		tb = (top - bottom),
    		fn = (far - near);


    	return this.set(
    		(2.0 * near) / rl,
    		0,
    		(left + right) / rl,
    		0,
    		0,
    		(2.0 * near) / tb,
    		(top + bottom) / tb,
    		0,
    		0,
    		0,
    		-(near + far) / fn,
    		(-2 * near * far) / fn,
    		0,
    		0,
    		-1,
    		0
    	);
    },

    setOrtho: function(left,right,top,bottom,near,far){
    	var mat = [
    		2.0 / (right - left),
    		0,
    		0,
    		(left + right) / (right - left),
            0,
            2.0 / (top - bottom),
            0,
            (top + bottom) / (top - bottom),
            0,
            0,
            -2.0 / (far - near),
            (far + near) / (far - near),
            0,
            0,
            0,
            1
    	];

    	return this.set.apply(this,mat);
    },

    setPerspective: function(fov,aspect,near,far){
    	var y = near * Math.tan(0.5 * mathUtils.radians(fov)),
    		x = aspect * y;
    	return this.setFrustrum(-x,x,y,-y,near,far);
    },

    setPosition: function(x,y,z){
    	this.matrix[0][3] = x;
    	this.matrix[1][3] = y;
    	this.matrix[2][3] = z;
    	return this;
    },

    setScale: function(sX,sY,sZ){
    	this.matrix[0][0] = sX;
    	this.matrix[1][1] = sY;
    	this.matrix[2][2] = sZ;
    	return this;
    },


    sub: function(m) {
		return new Matrix4x4(this).subSelf(m);
    },

    subSelf: function(mat) {
        for (var i = 0; i < 4; i++) {
            var m = this.matrix[i];
            var n = mat.matrix[i];
            m[0] -= n[0];
            m[1] -= n[1];
            m[2] -= n[2];
            m[3] -= n[3];
        }
        return this;
    },

    /**
     * Copies all matrix elements into an linear array.
     *
     * @param result
     *            array (or null to create a new one)
     * @return matrix as 16 element array
     */
    toArray: function(result) {
        if (result === undefined) {
            result = [];
        }
        for (var i = 0, k = 0; i < 4; i++) {
            var m = this.matrix[i];
            for (var j = 0; j < 4; j++) {
                result[k++] = m[j];
            }
        }
        return result;
    },

    toFloatArray:function(result) {
        return new Float32Array(this.toArray(result));
    },

    /*
     * (non-Javadoc)
     *
     * @see java.lang.Object#toString()
     */
    toString: function() {
        return "| " + this.matrix[0][0] + " " + this.matrix[0][1] + " " + this.matrix[0][2] + " " + this.matrix[0][3] + " |\n" + "| " + this.matrix[1][0] + " " + this.matrix[1][1] + " " + this.matrix[1][2] + " " + this.matrix[1][3] + " |\n" + "| " + this.matrix[2][0] + " " + this.matrix[2][1] + " " + this.matrix[2][2] + " " + this.matrix[2][3] + " |\n" + "| " + this.matrix[3][0] + " " + this.matrix[3][1] + " " + this.matrix[3][2] + " " + this.matrix[3][3] + " |";
    },

    toTransposedFloatArray: function(result) {
        if (result === undefined) {
            result = [];
        }
        for (var i = 0, k = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                result[k++] = this.matrix[j][i];
            }
        }
        return result;
    },

    translate: function(dx,dy,dz) {
		return new Matrix4x4(this).translateSelf(dx, dy, dz);
    },

    translateSelf: function( dx, dy, dz) {
		if( internals.has.XYZ( dx ) ){
			dy = dx.y;
			dz = dx.z;
			dx = dx.x;
		}
		_TEMP.identity();
		_TEMP.setPosition(dx,dy,dz);
		return this.multiplySelf(_TEMP);
    },

    /**
     * Converts the matrix (in-place) between column-major to row-major order
     * (and vice versa).
     *
     * @return itself
     */
    transpose: function() {
        return this.set(
			this.matrix[0][0], this.matrix[1][0], this.matrix[2][0], this.matrix[3][0],
			this.matrix[0][1], this.matrix[1][1], this.matrix[2][1], this.matrix[3][1],
			this.matrix[0][2], this.matrix[1][2], this.matrix[2][2], this.matrix[3][2],
			this.matrix[0][3], this.matrix[1][3], this.matrix[2][3], this.matrix[3][3]
		);
	}
};

//private temp matrix
var _TEMP = new Matrix4x4();

module.exports = Matrix4x4;



},{"../internals":30,"../math/mathUtils":45,"./Vec3D":20}],10:[function(require,module,exports){
var MathUtils = require('../math/mathUtils');
var Vec2D = require('./Vec2D');
var Line2D = require('./Line2D');
var Circle = require('./Circle');
var Rect = require('./Rect');
var TriangleMesh = require('./mesh/TriangleMesh');
var has = require('../internals/has');
var is = require('../internals/is');

    /**
    * @class
    * @member toxi
    * @param {Array<Vec2D>|Vec2D...} [points] optionally provide points for the polygon
    */
    var Polygon2D = function(){
        this.vertices = [];
        var i,l;
        if(arguments.length > 1){ //comma-separated Vec2D's were passed in
            for(i=0, l = arguments.length;i<l;i++){
                this.add(arguments[i].copy());
            }
        } else if(arguments.length == 1){
            var arg = arguments[0];
            if( is.Array( arg ) ){ // if it was an array of points
                for(i=0,l = arg.length;i<l;i++){
                    this.add(arg[i].copy());
                }
            }
        } //otherwise no args were passed, and thats ok

    };


    Polygon2D.prototype = {
        constructor: Polygon2D,

        add: function(p){
            //accept an array also
            if( is.Array(p) ){
                for( var i=0, l = p.length; i<l; i++ ){
                    if( this.vertices.indexOf(p[i]) < 0 ){
                        this.vertices.push(p[i]);
                    }
                }
                return;
            }
            if(this.vertices.indexOf(p) < 0){
                this.vertices.push(p);
            }
        },

        /**
        * centers the polygon so that its new centroid is at the given point
        * @param {Vec2D} [origin]
        * @return itself
        */
        center: function( origin ){
            var centroid = this.getCentroid();
            var delta = origin !== undefined ? origin.sub( centroid ) : centroid.invert();
            for( var i=0, l = this.vertices.length; i<l; i++){
                this.vertices[i].addSelf( delta );
            }
            return this;
        },

        containsPoint: function(p){
            var num = this.vertices.length,
                i = 0,
                j = num-1,
                oddNodes = false,
                px = p.x,
                py = p.y;
            for(i=0;i<num;i++){
                var vi = this.vertices[i],
                    vj = this.vertices[j];
                if (vi.y < py && vj.y >= py || vj.y < py && vi.y >= py) {
                    if (vi.x + (py - vi.y) / (vj.y - vi.y) * (vj.x - vi.x) < px) {
                        oddNodes = !oddNodes;
                    }
                }
                j = i;
            }
            return oddNodes;
        },

        containsPolygon: function(poly) {
            for (var i=0,num=poly.vertices.length; i<num; i++) {
                if (!this.containsPoint(poly.vertices[i])) {
                    return false;
                }
            }
            return true;
        },

        copy: function(){
            return new Polygon2D( this.vertices );
        },

        flipVertexOrder: function(){
            this.vertices.reverse();
            return this;
        },

        /**
        * Returns the vertex at the given index. This function follows Python
        * convention, in that if the index is negative, it is considered relative
        * to the list end. Therefore the vertex at index -1 is the last vertex in
        * the list.
        * @param {Number} i index
        * @return vertex
        */
        get: function( i ){
            if( i < 0 ){
                i += this.vertices.length;
            }
            return this.vertices[i];
        },

        /**
        * Computes the length of this polygon's apothem. This will only be valid if
        * the polygon is regular. More info: http://en.wikipedia.org/wiki/Apothem
        * @return apothem length
        */
        getApothem: function() {
            return this.vertices[0]
                .interpolateTo(this.vertices[1], 0.5)
                .distanceTo( this.getCentroid() );
        },

        getArea: function(){
            var area = 0,
                numPoints = this.vertices.length;
            for(var i=0;i<numPoints;i++){
                var a = this.vertices[i],
                    b = this.vertices[(i+1) % numPoints];
                area += a.x * b.y;
                area -= a.y * b.x;
            }
            area *= 0.5;
            return area;
        },

        getBoundingCircle: function() {
            var Circle = require('./Circle');
            return Circle.newBoundingCircle( this.vertices );
        },

        getBounds: function(){
            var Rect = require('./Rect');
            return Rect.getBoundingRect(this.vertices);
        },

        getCentroid: function(){
            var res = new Vec2D(),
                numPoints = this.vertices.length;
            for(var i=0;i<numPoints;i++){
                var a = this.vertices[i],
                    b = this.vertices[(i+1) %numPoints],
                    factor = a.x * b.y - b.x * a.y;
                res.x += (a.x + b.x) * factor;
                res.y += (a.y + b.y) * factor;
            }
            return res.scale(1 / (this.getArea() * 6));
        },

        getCircumference: function(){
            var circ = 0;
            for(var i=0,num=this.vertices.length;i<num;i++){
                circ += this.vertices[i].distanceTo(this.vertices[(i+1)%num]);
            }
            return circ;
        },

        getClosestPointTo: function( p ){
            var minD = Number.MAX_VALUE;
            var q, c, d;
            var edges = this.getEdges();
            for( var i=0, len = edges.length; i<len; i++ ){
                c = edges[i].closestPointTo( p );
                d = c.distanceToSquared( p );
                if( d < minD ){
                    q = c;
                    minD = d;
                }
            }
            return q;
        },

        getClosestVertexTo: function( p ){
            var minD = Number.MAX_VALUE;
            var q, d, i = 0, len = this.vertices.length;
            for( ; i<len; i++){
                d = this.vertices[i].distanceToSquared( p );
                if( d < minD ){
                    q = this.vertices[i];
                    minD = d;
                }
            }
            return q;
        },

        getEdges: function() {
            var num = this.vertices.length,
                edges = [];
            for (var i = 0; i < num; i++) {
                edges[i] = new Line2D(this.vertices[i], this.vertices[(i + 1) % num]);
            }
            return edges;
        },

        //@deprecated
        getNumPoints: function(){
            return this.getNumVertices();
        },

        getNumVertices: function(){
            return this.vertices.length;
        },

        getRandomPoint: function(){
            var edges = this.getEdges();
            var numEdges = edges.length;
            var ea = edges[MathUtils.random(numEdges)],
                eb;
            while( eb === undefined || eb.equals( ea ) ){
                eb = edges[ MathUtils.random(numEdges) ];
            }
            //pick a random point on edge A
            var p = ea.a.interpolateTo( ea.b, Math.random() );
            //then randomly interpolate to another point on b
            return p.interpolateToSelf(
                eb.a.interpolateTo( eb.b, Math.random() ),
                Math.random()
            );
        },

        /**
        * Repeatedly inserts vertices as mid points of the longest edges until the
        * new vertex count is reached.
        * @param {Number} count new vertex count
        * @return itself
        */
        increaseVertexCount: function( count ){
            var num = this.vertices.length,
                longestID = 0,
                maxD = 0,
                i = 0,
                d,
                m;

            while( num < count ){
                //find longest edge
                longestID = 0;
                maxD = 0;
                for( i=0; i<num; i++ ){
                    d = this.vertices[i].distanceToSquared( this.vertices[ (i+1) % num ] );
                    if( d > maxD ){
                        longestID = i;
                        maxD = d;
                    }
                }
                //insert mid point of longest segment
                m = this.vertices[longestID]
                    .add(this.vertices[(longestID + 1) % num])
                    .scaleSelf(0.5);
                //push this into the array inbetween the 2 points
                this.vertices.splice( longestID+1, 0, m );
                num++;
            }
            return this;
        },

        intersectsPolygon: function(poly) {
            if (!this.containsPolygon(poly)) {
                var edges=this.getEdges();
                var pedges=poly.getEdges();
                for(var i=0, n=edges.length; i < n; i++) {
                    for(var j=0, m = pedges.length, e = edges[i]; j < m; j++) {
                        if (e.intersectLine(pedges[j]).getType() == Line2D.LineIntersection.Type.INTERSECTING) {
                            return true;
                        }
                    }
                }
                return false;
            } else {
                return true;
            }
        },

        isClockwise: function(){
            return this.getArea() > 0;
        },

        /**
        * Checks if the polygon is convex.
        * @return true, if convex.
        */
        isConvex: function(){
            var isPositive = false,
                num = this.vertices.length,
                prev,
                next,
                d0,
                d1,
                newIsP;

            for( var i = 0; i < num; i++ ){
                prev = (i===0) ? num -1 : i - 1;
                next = (i===num-1) ? 0 : i + 1;
                d0 = this.vertices[i].sub(this.vertices[prev]);
                d1 = this.vertices[next].sub(this.vertices[i]);
                newIsP = (d0.cross(d1) > 0);
                if( i === 0 ) {
                    isPositive = true;
                } else if( isPositive != newIsP ) {
                    return false;
                }
            }
            return true;
        },

        /**
        * Given the sequentially connected points p1, p2, p3, this function returns
        * a bevel-offset replacement for point p2.
        *
        * Note: If vectors p1->p2 and p2->p3 are exactly 180 degrees opposed, or if
        * either segment is zero then no offset will be applied.
        *
        * @param x1
        * @param y1
        * @param x2
        * @param y2
        * @param x3
        * @param y3
        * @param distance
        * @param out
        *
        * @see http://alienryderflex.com/polygon_inset/
        */
        _offsetCorner: function( x1, y1, x2, y2, x3, y3, distance, out ){
            var c1 = x2,
                d1 = y2,
                c2 = x2,
                d2 = y2;
            var dx1,
                dy1,
                dist1,
                dx2,
                dy2,
                dist2,
                insetX,
                insetY;

            dx1 = x2-x1;
            dy1 = y2-y1;
            dist1 = Math.sqrt(dx1*dx1 + dy1*dy1);
            dx2 = x3-x2;
            dy2 = y3-y2;
            dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);

            if( dist1 < MathUtils.EPS || dist2 < MathUtils.EPS ){
                return;
            }

            dist1 = distance / dist1;
            dist2 = distance / dist2;

            insetX = dy1 * dist1;
            insetY = -dx1 * dist1;
            x1 += insetX;
            c1 += insetX;
            y1 += insetY;
            d1 += insetY;
            insetX = dy2 * dist2;
            insetY = -dx2 * dist2;
            x3 += insetX;
            c2 += insetX;
            y3 += insetY;
            d2 += insetY;

            if( c1 === c2 && d1 === d2 ){
                out.set(c1,d1);
                return;
            }

            var l1 = new Line2D( new Vec2D(x1,y1), new Vec2D(c1,d1) ),
                l2 = new Line2D( new Vec2D(c2,d2), new Vec2D(x3,y3) ),
                isec = l1.intersectLine(l2),
                ipos = isec.getPos();
            if( ipos !== null || ipos !== undefined ){
                out.set(ipos);
            }
        },

        /**
        * Moves each line segment of the polygon in/outward perpendicular by the
        * given distance. New line segments and polygon vertices are created by
        * computing the intersection points of the displaced segments. Choosing an
        * too large displacement amount will result in deformation/undefined
        * behavior with various self intersections. Should that happen, please try
        * to clean up the shape using the {@link #toOutline()} method.
        *
        * @param distance
        *            offset/inset distance (negative for inset)
        * @return itself
        */
        offsetShape: function( distance ){
            var v = this.vertices;
            var num = v.length - 1;
            if( num > 1 ){
                var startX = v[0].x,
                    startY = v[0].y,
                    c = v[num].x,
                    d = v[num].y,
                    e = startX,
                    f = startY,
                    a,
                    b;
                for( var i = 0; i < num; i++ ){
                    a = c;
                    b = d;
                    c = e;
                    d = f;
                    e = v[i + 1].x;
                    f = v[i + 1].y;
                    this._offsetCorner(a, b, c, d, e, f, distance, v[i]);
                }
                this._offsetCorner(c, d, e, f, startX, startY, distance, v[num]);
            }
            return this;
        },

        /**
        * Reduces the number of vertices in the polygon based on the given minimum
        * edge length. Only vertices with at least this distance between them will
        * be kept.
        *
        * @param minEdgeLen
        * @return itself
        */
        reduceVertices: function( minEdgeLen ){
            minEdgeLen *= minEdgeLen;
            var vs = this.vertices,
                reduced = [],
                prev = vs[0],
                num = vs.length - 1,
                vec;
            reduced.push(prev);
            for( var i = 0; i < num; i++ ){
                vec = vs[i];
                if( prev.distanceToSquared(vec) >= minEdgeLen ){
                    reduced.push(vec);
                    prev = vec;
                }
            }
            if( vs[0].distanceToSquared(vs[num]) >= minEdgeLen ){
                reduced.push(vs[num]);
            }
            this.vertices = reduced;
            return this;
        },


        /**
        * Removes duplicate vertices from the polygon. Only successive points are
        * recognized as duplicates.
        * @param {Number} tolerance snap distance for finding duplicates
        * @return itself
        */
        removeDuplicates: function( tolerance ){
            //if tolerance is 0, it will be faster to just use 'equals' method
            var equals = tolerance ? 'equalsWithTolerance' : 'equals';
            var p, prev, i = 0, num = this.vertices.length;
            var last;
            for( ; i<num; i++ ){
                p = this.vertices[i];
                //if its the 'equals' method tolerance will just be ingored
                if( p[equals]( prev, tolerance ) ){
                    //remove from array, step back counter
                    this.vertices.splice( i, 1 );
                    i--;
                    num--;
                } else {
                    prev = p;
                }
            }
            num = this.vertices.length;
            if( num >  0 ){
                last = this.vertices[num-1];
                if( last[equals]( this.vertices[0], tolerance ) ){
                    this.vertices.splice( num-1, 1 );
                }
            }
            return this;
        },

        rotate: function(theta) {
            for (var i=0, num=this.vertices.length; i < num; i++) {
                this.vertices[i].rotate(theta);
            }
            return this;
        },

        scale: function( x, y ) {
            if (arguments.length==1) {
                var arg = arguments[0];
                if( has.XY( arg ) ){
                    x=arg.x;
                    y=arg.y;
                } else {
                    // uniform scale
                    x=arg;
                    y=arg;
                }
            } else if (arguments.length==2) {
                x=arguments[0];
                y=arguments[1];
            } else {
                throw "Invalid argument(s) passed.";
            }
            for (var i=0, num=this.vertices.length; i < num; i++) {
                this.vertices[i].scaleSelf(x, y);
            }
            return this;
        },

        scaleSize: function( x, y ){
            var centroid;
            if(arguments.length===1) {
                var arg = arguments[0];
                if( has.XY(arg) ){
                    x = arg.x;
                    y = arg.y;
                } else {
                    //uniform
                    x = arg;
                    y = arg;
                }
            } else if ( arguments.length===2) {
                x = arguments[0];
                y = arguments[1];
            } else {
                throw new Error('Invalid argument(s) passed.');
            }
            centroid = this.getCentroid();
            for( var i = 0, l = this.vertices.length; i<l; i++ ){
                var v = this.vertices[i];
                v.subSelf(centroid).scaleSelf(x,y).addSelf(centroid);
            }
            return this;
        },

        smooth: function(amount, baseWeight){
            var centroid = this.getCentroid();
            var num = this.vertices.length;
            var filtered = [];
            for(var i=0,j=num-1,k=1;i<num;i++){
                var a = this.vertices[i];
                var dir = this.vertices[j].sub(a).addSelf(this.vertices[k].sub(a))
                    .addSelf(a.sub(centroid).scaleSelf(baseWeight));
                filtered.push(a.add(dir.scaleSelf(amount)));
                j++;
                if(j == num){
                    j=0;
                }
                k++;
                if(k == num){
                    k=0;
                }
            }
            this.vertices = filtered;
            return this;
        },

        toMesh: function( mesh, centroid2D, extrude ){
            mesh = mesh || new TriangleMesh();
            var num = this.vertices.length;
            centroid2D = centroid2D || this.getCentroid();
            var centroid = centroid2D.to3DXY();
            centroid.z = extrude;
            var bounds = this.getBounds(),
                boundScale = new Vec2D(1/bounds.width, 1/bounds.height),
                uvC = centroid2D.sub(bounds.getTopLeft()).scaleSelf(boundScale),
                a, b, uvA, uvB;

            for( var i=1; i<=num; i++ ){
                a = this.vertices[i % num];
                b = this.vertices[i - 1];
                uvA = a.sub(bounds.getTopLeft()).scaleSelf(boundScale);
                uvB = b.sub(bounds.getTopLeft()).scaleSelf(boundScale);
                mesh.addFace(centroid, a.to3DXY(), b.to3DXY(), uvC, uvA, uvB);
            }
            return mesh;
        },

        toPolygon2D: function(){
            return this;
        },

        toString: function(){
            var s = "";
            for(var i=0;i<this.vertices.length;i++){
                s += this.vertices[i];
                if(i<this.vertices.length-1){
                    s+= ", ";
                }
            }
            return s;
        },

        translate: function() {
            var x,y;
            if (arguments.length==1 && has.XY( arguments[0] ) ){
                x=arguments[0].x;
                y=arguments[0].y;
            } else if (arguments.length==2) {
                x=arguments[0];
                y=arguments[1];
            } else {
                throw "Invalid argument(s) passed.";
            }
            for (var i=0, num=this.vertices.length; i < num; i++) {
                this.vertices[i].addSelf(x, y);
            }
            return this;
        }
    };

    /**
    * Constructs a new regular polygon from the given base line/edge.
    * @param {Vec2D} baseA left point of the base edge
    * @param {Vec2D} baseB right point of the base edge
    * @param {Number} res number of polygon vertices
    * @return polygon
    */
    Polygon2D.fromBaseEdge = function( baseA, baseB, res ){
        var theta = -( MathUtils.PI - (MathUtils.PI*(res-2) / res) ),
            dir = baseB.sub( baseA ),
            prev = baseB,
            poly = new Polygon2D( baseA, baseB ),
            p;
        for( var i=0; i< res-1; i++){
            p = prev.add( dir.getRotated(theta*i) );
            poly.add( p );
            prev = p;
        }
        return poly;
    };

    /**
    * Constructs a regular polygon from the given edge length and number of
    * vertices. This automatically computes the radius of the circle the
    * polygon is inscribed in.
    * More information: http://en.wikipedia.org/wiki/Regular_polygon#Radius
    *
    * @param {Number} len desired edge length
    * @param {Number} res number of vertices
    * @return polygon
    */
    Polygon2D.fromEdgeLength = function( len, res ){
        var Circle = require('./Circle');
        return new Circle( Polygon2D.getRadiusForEdgeLength(len,res) ).toPolygon2D( res );
    };

    /**
    * Computes the radius of the circle the regular polygon with the desired
    * edge length is inscribed in
    * @param {Number} len edge length
    * @param {Number} res number of polygon vertices
    * @return radius
    */
    Polygon2D.getRadiusForEdgeLength = function( len, res ){
        return len / ( 2 * MathUtils.sin(MathUtils.PI/res) );
    };

    module.exports = Polygon2D;


},{"../internals/has":37,"../internals/is":38,"../math/mathUtils":45,"./Circle":4,"./Line2D":7,"./Rect":14,"./Vec2D":19,"./mesh/TriangleMesh":22}],11:[function(require,module,exports){


var mathUtils = require('../math/mathUtils'),
	Matrix4x4 = require('./Matrix4x4');

/**
 * @class
 * @member toxi
 */
var	Quaternion = function (qw,vx,y,z){
	if(arguments.length == 4){
		this.w = qw;
		this.x = vx;
		this.y = y;
		this.z = z;
	} else if(arguments.length == 2){
		this.x = vx.x;
		this.y = vx.y;
		this.z = vx.z;
		this.w = qw;
	} else if(arguments.length == 1) {
		this.w = q.w;
		this.x = q.x;
		this.y = q.y;
		this.z = q.z;
	}
};


Quaternion.prototype = {
	add: function(q){
		return new Quaternion(this.x + q.x, this.y + q.y, this.z + q.z, this.w + q.w);
	},
	addSelf: function(q){
		this.x += q.x;
		this.y += q.y;
		this.z += q.z;
		return this;
	},
	copy: function(){
		return new Quaternion(this.w,this.x,this.y,this.z);
	},
	dot: function(q){
		return (this.x * q.x) + (this.y * q.y) + (this.z * q.z) + (this.w * q.w);
	},
	getConjugate: function(){
		var q = new Quaternion();
		q.x = -this.x;
		q.y = -this.y;
		q.z = -this.z;
		q.w = w;
		return q;
	},
	identity: function(){
		this.w = 1.0;
		this.x = 0.0;
		this.y = 0.0;
		this.z = 0.0;
		return this;
	},
	interpolateTo: function(target,t,is){
		return (arguments.length == 3) ? this.copy().interpolateTo(target,is.interpolate(0,1,t)) : this.copy().interpolateToSelf(target,t);
	},
	interpolateToSelf: function(target,t,is){
		if(arguments.length == 3){
			t = is.interpolate(0,1,t);
		}
		var scale,
			invscale,
			dot = mathUtils.clip(this.dot(target),-1,1);
			if((1.0-dot) >= mathUtils.EPS){
				var theta = Math.acos(dot);
				var invsintheta = 1.0 / Math.sin(theta);
				scale = (Math.sin(theta *(1.0 - t)) * invsintheta);
				invscale = (Math.sin(theta * t) * invsintheta);
			} else {
				scale = 1 - t;
				invscale = t;
			}
			if(dot < 0.0){
				this.w = scale * this.w - invscale * target.w;
				this.x = scale * this.x - invscale * target.x;
				this.y = scale * this.y - invscale * target.y;
				this.z = scale * this.z - invscale * target.z;
			} else {
				this.w = scale * w + invscale * target.w;
				this.x = scale * x + invscale * target.x;
				this.y = scale * y + invscale * target.y;
				this.z = scale * z + invscale * target.z;
			}
			return this;
	},
	magnitude: function() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
	},
	multiply: function(q2){
		var res = new Quaternion();
		res.w = this.w * q2.w - x * q2.x - y * q2.y - z * q2.z;
		res.x = this.w * q2.x + x * q2.w + y * q2.z - z * q2.y;
		res.y = this.w * q2.y + y * q2.w + z * q2.x - x * q2.z;
		res.z = this.w * q2.z + z * q2.w + x * q2.y - y * q2.x;

		return res;
	},
	normalize: function(){
		var mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
		if(mag > mathUtils.EPS){
			mag = 1 / mag;
			this.x *= mag;
			this.y *= mag;
			this.z *= mag;
			this.w *= mag;
		}
		return this;
	},
	scale: function(t){
		return new Quaternion(this.x * t, this.y * t, this.z * t, this.w * t);
	},
	scaleSelf: function(t){
		this.x *= t;
		this.y *= t;
		this.z *= t;
		this.w *= t;
		return this;
	},
	set: function(w,x,y,z){
		if(arguments.length == 4){
			this.w = w;
			this.x = x;
			this.y = y;
			this.z = z;
		} else if(arguments.length == 2){
			this.w = w;
			this.x = v.x;
			this.y = v.y;
			this.z = v.z;
		}
		else { //must be 1
			this.w = q.w;
			this.x = q.x;
			this.y = q.y;
			this.z = q.z;
		}
		return this;
	},
	sub: function(q){
		return new Quaternion(this.x - q.x, this.y - q.y, this.z - q.z, this.w - q.w);
	},
	subSelf: function(q){
		this.x -= q.x;
		this.y -= q.y;
		this.z -= q.z;
		this.w -= q.w;
		return this;
	},
	toArray: function(){
		return [this.w,this.x,this.y,this.z];
	},
	toAxisAngle: function(){
		var res = [];
		var sa = Math.sqrt(1.0 - this.w * this.w);
		if(sa < mathUtils.EPS){
			sa = 1.0;
		} else {
			sa = 1.0 / sa;
		}
		res[0] = Math.acos(this.w) * 2.0;
		res[1] = this.x * sa;
		res[2] = this.y * sa;
		res[3] = this.z * sa;
		return res;
	},
	toMatrix4x4: function(result){
		if(result === undefined){
			result = new Matrix4x4();
		}
		var x2 = this.x + this.x;
		var y2 = this.y + this.y;
		var z2 = this.z + this.z;
		var xx = this.x * x2;
		var xy = this.x * y2;
		var xz = this.x * z2;
		var yy = this.y * y2;
		var yz = this.y * z2;
		var zz = this.z * z2;
		var wx = this.w * x2;
		var wy = this.w * y2;
		var wz = this.w * z2;

		var st = x2 +','+y2+','+z2+','+xx+','+xy+','+xz+','+yy+','+yz+','+zz+','+wx+','+wy+','+wz;
		return result.set(
			1 - (yy + zz), xy - wz, xz + wy, 0, xy + wz,
			1 - (xx + zz), yz - wx, 0, xz - wy, yz + wx, 1 - (xx + yy), 0,
			0, 0, 0, 1
		);
	},
	toString: function(){
		return "{axis: ["+this.x+","+this.y+","+this.z+"], w: "+this.w+"}";
	}

};

Quaternion.DOT_THRESHOLD = 0.9995;

Quaternion.createFromAxisAngle = function(axis,angle){
	angle *= 0.5;
	var sin = mathUtils.sin(angle),
		cos = mathUtils.cos(angle),
		q = new Quaternion(cos,axis.getNormalizedTo(sin));
	return q;
};

Quaternion.createFromEuler = function(pitch,yaw,roll){
	pitch *= 0.5;
	yaw *=0.5;
	roll *= 0.5;

	var sinPitch = mathUtils.sin(pitch),
		cosPitch = mathUtils.cos(pitch),
		sinYaw = mathUtils.sin(yaw),
		cosYaw = mathUtils.cos(yaw),
		sinRoll = mathUtils.sin(roll),
		cosRoll = mathUtils.cos(roll);

	var cosPitchCosYaw = cosPitch * cosYaw,
		sinPitchSinYaw = sinPitch * sinYaw;

		var q = new Quaternion();
		q.x = sinRoll * cosPitchCosYaw - cosRoll * sinPitchSinYaw;
		q.y = cosRoll * sinPitch * cosYaw + sinRoll * cosPitch * sinYaw;
		q.z = cosRoll * cosPitch * sinYaw - sinRoll * sinPitch * cosYaw;
		q.w = cosRoll * cosPitchCosYaw + sinRoll * sinPitchSinYaw;

		return q;
};

Quaternion.createFromMatrix = function(m){
	var s = 0.0;
	var q = [];
	var trace = m.matrix[0][0] + m.matrix[1][1] + m.matrix[2][2];

	if(trace > 0.0){
		s = Math.sqrt(trace + 1.0);
		q[3] = s * 0.5;
		s = 0.5 / s;
		q[0] = (m.matrix[1][2] - m.matrix[2][1] * s);
		q[1] = (m.matrix[2][0] - m.matrix[0][2] * s);
		q[2] = (m.matrix[0][1] - m.matrix[1][0] * s);
	} else {

		var nxt = [ 1, 2, 0 ];
        var i = 0, j = 0, k = 0;

        if (m.matrix[1][1] > m.matrix[0][0]) {
            i = 1;
        }

        if (m.matrix[2][2] > m.matrix[i][i]) {
            i = 2;
        }

        j = nxt[i];
        k = nxt[j];
        s = Math.sqrt((m.matrix[i][i] - (m.matrix[j][j] + m.matrix[k][k])) + 1.0);

        q[i] = s * 0.5;
        s = 0.5 / s;
        q[3] = (m.matrix[j][k] - m.matrix[k][j]) * s;
        q[j] = (m.matrix[i][j] + m.matrix[j][i]) * s;
        q[k] = (m.matrix[i][k] + m.matrix[k][i]) * s;
    }

     return new Quaternion(q[3],q[0],q[1],q[2]);
 };

 Quaternion.getAlignmentQuat = function(dir,forward){
		var target = dir.getNormalized(),
			axis = forward.cross(target),
			length = axis.magnitude() + 0.0001,
			angle = Math.atan2(length, forward.dot(target));
        return this.createFromAxisAngle(axis, angle);
 };

 module.exports = Quaternion;


},{"../math/mathUtils":45,"./Matrix4x4":9}],12:[function(require,module,exports){


var extend = require('../internals').extend,
	Vec2D = require('./Vec2D'),
	Line2D = require('./Line2D');

/**
* Ray2D accepts 2 formats for its constructor
* Option 1:
* @param {Number} x,
* @param {Number} y,
* @param {toxi.geom.Vec2D} direction
*
* Option 2:
* @param {toxi.geom.Vec2D} position
* @param {toxi.geom.Vec2D} direction
*/
var	Ray2D = function(a,b,d){
	var o, dir;
	if(arguments.length == 3){
		Vec2D.apply(this,[a,b]);
		this.dir = d.getNormalized();
	} else if(arguments.length == 2){
		Vec2D.apply(this,[a]);
		this.dir = b.getNormalized();
	} else if(arguments.length === 0){
		Vec2D.apply(this);
		this.dir = Vec2D.Y_AXIS.copy();
	}
};
extend(Ray2D,Vec2D);

Ray2D.prototype.getDirection = function() {
	  return this.dir.copy();
};
/**
 * Calculates the distance between the given point and the infinite line
 * coinciding with this ray.
 */
Ray2D.prototype.getDistanceToPoint = function(p) {
	var sp = p.sub(this);
	return sp.distanceTo(this.dir.scale(sp.dot(this.dir)));
};

Ray2D.prototype.getPointAtDistance = function(dist) {
	return this.add(this.dir.scale(dist));
};

/**
 * Uses a normalized copy of the given vector as the ray direction.
 *
 * @param d new direction
 * @return itself
 */
Ray2D.prototype.setDirection = function(d) {
	this.dir.set(d).normalize();
	return this;
};

/**
 * Converts the ray into a 2D Line segment with its start point coinciding
 * with the ray origin and its other end point at the given distance along
 * the ray.
 *
 * @param dist end point distance
 * @return line segment
 */
Ray2D.prototype.toLine2DWithPointAtDistance = function(dist) {
	var Line2D = require('./Line2D');
	return new Line2D(this, this.getPointAtDistance(dist));
};

Ray2D.prototype.toString = function() {
	return "origin: " + Vec2D.prototype.toString.apply(this) + " dir: " + this.dir;
};

module.exports = Ray2D;


},{"../internals":30,"./Line2D":7,"./Vec2D":19}],13:[function(require,module,exports){


var extend = require('../internals').extend,
	Vec3D = require('./Vec3D'),
	Line3D = require('./Line3D');

/**
 * @class
 * @member toxi
 */
var	Ray3D = function(a,b,c,d){
	var o, dir;
	if(arguments.length == 4){
		o = new Vec3D(a,b,c);
		dir = d;
	}
	else if(arguments.length == 2){
		o = a;
		dir = b;
	}
	else {
		o = new Vec3D();
		dir = Vec3D.Y_AXIS.copy();
	}
	Vec3D.apply(this,[o]);
	this.dir = dir;
};

extend(Ray3D,Vec3D);

/**
	Returns a copy of the ray's direction vector.
	@return vector
*/
Ray3D.prototype.getDirection = function() {
    return this.dir.copy();
};

/**
	Calculates the distance between the given point and the infinite line
	coinciding with this ray.
	@param p
*/
Ray3D.prototype.getDistanceToPoint = function(p) {
    var sp = p.sub(this);
    return sp.distanceTo(this.dir.scale(sp.dot(this.dir)));
};

/**
	Returns the point at the given distance on the ray. The distance can be
	any real number.
	@param dist
	@return vector
*/
Ray3D.prototype.getPointAtDistance = function(dist) {
    return this.add(this.dir.scale(dist));
};

/**
  Uses a normalized copy of the given vector as the ray direction.
  @param d new direction
  @return itself
*/
Ray3D.prototype.setDirection = function(d) {
    this.dir.set(d).normalize();
    return this;
};

/**
  Converts the ray into a 3D Line segment with its start point coinciding
  with the ray origin and its other end point at the given distance along
  the ray.

  @param dist end point distance
  @return line segment
*/
Ray3D.prototype.toLine3DWithPointAtDistance = function(dist) {
    Line3D = require('./Line3D');
    return new Line3D(this, this.getPointAtDistance(dist));
};

Ray3D.prototype.toString = function() {
    return "origin: " + this.parent.toString.call(this) + " dir: " + this.dir;
};

module.exports = Ray3D;


},{"../internals":30,"./Line3D":8,"./Vec3D":20}],14:[function(require,module,exports){


    var	internals = require('../internals'),
        mathUtils = require('../math/mathUtils'),
        Vec2D = require('./Vec2D'),
        Line2D = require('./Line2D');

    /**
     * @class
     * @member toxi
     * @param {Number} [x]
     * @param {Number} [y]
     * @param {Number} [width]
     * @param {Number} [height]
     */
    var	Rect = function(a,b,width,height){
        if(arguments.length === 2){ //then it should've been 2 Vec2D's
            if( !( internals.has.XY( a ) ) ){
                throw new Error("Rect received incorrect parameters");
            } else {
                this.x = a.x;
                this.y = a.y;
                this.width = b.x - this.x;
                this.height = b.y - this.y;
            }
        } else if(arguments.length == 4){
            this.x = a;
            this.y = b;
            this.width = width;
            this.height = height;
        } else if(arguments.length === 1){ //object literal with x,y,width,height
            var o = arguments[0];
            if( internals.has.XYWidthHeight( o ) ){
                this.x = o.x;
                this.y = o.y;
                this.width = o.width;
                this.height = o.height;
            }
        } else if(arguments.length > 0){
            throw new Error("Rect received incorrect parameters");
        }
    };

    Rect.fromCenterExtent = function(center,extent){
        return new Rect(center.sub(extent),center.add(extent));
    };


    Rect.getBoundingRect = function( points ){
        var first = points[0];
        var bounds = new Rect(first.x, first.y, 0, 0);
        for (var i = 1, num = points.length; i < num; i++) {
            bounds.growToContainPoint(points[i]);
        }
        return bounds;
    };

    Rect.prototype = {
        containsPoint: function(p){
            var px = p.x;
            var py = p.y;
            if(px < this.x || px >= this.x + this.width){
                return false;
            }
            if(py < this.y || py >= this.y + this.height){
                return false;
            }
            return true;
        },

        copy: function(){
            return new Rect(this.x,this.y,this.width,this.height);
        },

        getArea: function(){
            return this.width * this.height;
        },

        getAspect: function(){
            return this.width / this.height;
        },

        getBottom: function(){
            return this.y + this.height;
        },

        getBottomRight: function(){
            return new Vec2D(this.x + this.width, this.y + this.height);
        },

        getCentroid: function(){
            return new Vec2D(this.x + this.width * 0.5, this.y + this.height * 0.5);
        },

        getDimensions: function(){
            return new Vec2D(this.width,this.height);
        },

        getEdge: function(id){
            var edge;
            switch(id){
                case 0:
                    edge = new Line2D(
                        new Vec2D(this.x,this.y),
                        new Vec2D(this.x + this.width, this.y)
                    );
                    break;
                case 1:
                    edge = new Line2D(
                        new Vec2D(this.x + this.width, this.y),
                        new Vec2D(this.x + this.width, this.y + this.height)
                    );
                    break;
                case 2:
                    edge = new Line2D(
                        new Vec2D(this.x, this.y + this.height),
                        new Vec2D(this.x + this.width, this.y + this.height)
                    );
                    break;
                case 3:
                    edge = new Line2D(
                        new Vec2D(this.x,this.y),
                        new Vec2D(this.x,this.y+this.height)
                    );
                    break;
                default:
                    throw new Error("edge ID needs to be 0...3");
            }
            return edge;
        },

        getLeft: function(){
            return this.x;
        },

        getRight: function(){
            return this.x + this.width;
        },

        getTop: function(){
            return this.y;
        },

        getTopLeft: function(){
            return new Vec2D(this.x,this.y);
        },

        growToContainPoint: function( p ){
            if (!this.containsPoint(p)) {
                if (p.x < this.x) {
                    this.width = this.getRight() - p.x;
                    this.x = p.x;
                } else if (p.x > this.getRight()) {
                    this.width = p.x - this.x;
                }
                if (p.y < this.y) {
                    this.height = this.getBottom() - p.y;
                    this.y = p.y;
                } else if (p.y > this.getBottom()) {
                    this.height = p.y - this.y;
                }
            }
            return this;
        },

        intersectsRay: function(ray,minDist,maxDist){
            //returns Vec2D of point intersection
            var invDir = ray.getDirection().reciprocal();
            var signDirX = invDir.x < 0;
            var signDirY = invDir.y < 0;
            var min = this.getTopLeft();
            var max = this.getBottomRight();
            var bbox = signDirX ? max : min;
            var tmin = (bbox.x - ray.x) * invDir.x;
            bbox = signDirX ? min : max;
            var tmax = (bbox.x - ray.x) * invDir.x;
            bbox = signDirY ? max : min;
            var tymin = (bbox.y - ray.y) * invDir.y;
            bbox = signDirY ? min : max;
            var tymax = (bbox.y - ray.y) * invDir.y;
            if((tmin > tymax) || (tymin > tmax)){
                return undefined;
            }
            if(tymin > tmin){
                tmin = tymin;
            }
            if (tymax < tmax) {
                tmax = tymax;
            }
            if ((tmin < maxDist) && (tmax > minDist)) {
                return ray.getPointAtDistance(tmin);
            }
            return undefined;
        },

        intersectsRect: function(r){
            return !(this.x > r.x + r.width || this.x + this.width < r.x || this.y > r.y + r.height || this.y + this.height < r.y);
        },

        scale: function(s){
            var c = this.getCentroid();
            this.width *= s;
            this.height *= s;
            this.x = c.x - this.width * 0.5;
            this.y = c.y - this.height * 0.5;
            return this;
        },

        set: function(x,y,width,height){
            if(arguments.length === 1){
                this.y = x.y;
                this.width = x.width;
                this.height = x.height;
                this.x = x.x;
            } else if(arguments.length === 4) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
            } else {
                throw new Error("Rect set() received wrong parameters");
            }
        },

        setDimensions: function(dim){
            if( arguments.length == 2 ){
                dim = { x: arguments[0], y: arguments[1] };
            }
            this.width = dim.x;
            this.height = dim.y;
            return this;
        },

        setPosition: function(pos){
            this.x = pos.x;
            this.y = pos.y;
            return this;
        },

        toPolygon2D: function(){
            var Polygon2D = require('./Polygon2D');
            var poly = new Polygon2D();
            poly.add(new Vec2D(this.x,this.y));
            poly.add(new Vec2D(this.x+this.width,this.y));
            poly.add(new Vec2D(this.x+this.width,this.y+this.height));
            poly.add(new Vec2D(this.x,this.y+this.height));
            return poly;
        },

        toString: function(){
            return "rect: {x: "+this.x +", y: "+this.y+ ", width: "+this.width+ ", height: "+this.height+"}";
        },

        union: function(r){
            var tmp = mathUtils.max(this.x + this.width, r.x + r.width);
            this.x = mathUtils.min(this.x,r.x);
            this.width = tmp - this.x;
            tmp = mathUtils.max(this.y + this.height, r.y + r.height);
            this.y = mathUtils.min(this.y,r.y);
            this.height = tmp - this.y;
            return this;
        }
    };


    module.exports = Rect;


},{"../internals":30,"../math/mathUtils":45,"./Line2D":7,"./Polygon2D":10,"./Vec2D":19}],15:[function(require,module,exports){


	//2 modules defined
	var Sphere, SphereFunction;

	//Sphere
	(function(){
		var internals = require('../internals');
		var meshCommon = require('./mesh/meshCommon');
		var Vec3D = require('./Vec3D');
		/**
		 * @module toxi.geom.Sphere
		 * @augments toxi.geom.Vec3D
		 */
		Sphere = function(a,b){
			if(a === undefined){
				Vec3D.apply(this,[new Vec3D()]);
				this.radius = 1;
			} else if( internals.has.XYZ( a ) ){
				Vec3D.apply(this,[a]);
				if( internals.is.Sphere( a ) ){
					this.radius = a.radius;
				} else {
					this.radius = b;
				}
			} else {
				Vec3D.apply(this,[new Vec3D()]);
				this.radius = a;
			}
		};
		internals.extend(Sphere,Vec3D);

		Sphere.prototype.containsPoint = function(p) {
			var d = this.sub(p).magSquared();
			return (d <= this.radius * this.radius);
		};

		/**
		 * Alternative to {@link SphereIntersectorReflector}. Computes primary &
		 * secondary intersection points of this sphere with the given ray. If no
		 * intersection is found the method returns null. In all other cases, the
		 * returned array will contain the distance to the primary intersection
		 * point (i.e. the closest in the direction of the ray) as its first index
		 * and the other one as its second. If any of distance values is negative,
		 * the intersection point lies in the opposite ray direction (might be
		 * useful to know). To get the actual intersection point coordinates, simply
		 * pass the returned values to {@link Ray3D#getPointAtDistance(float)}.
		 * @param ray
		 * @return 2-element float array of intersection points or null if ray
		 * doesn't intersect sphere at all.
		 */
		Sphere.prototype.intersectRay = function(ray) {
			var result, a, b, t,
				q = ray.sub(this),
				distSquared = q.magSquared(),
				v = -q.dot(ray.getDirection()),
				d = this.radius * this.radius - (distSquared - v * v);
			if (d >= 0.0) {
				d = Math.sqrt(d);
				a = v + d;
				b = v - d;
				if (!(a < 0 && b < 0)) {
					if (a > 0 && b > 0) {
						if (a > b) {
							t = a;
							a = b;
							b = t;
						}
					} else {
						if (b > 0) {
							t = a;
							a = b;
							b = t;
						}
					}
				}
				result = [a,b];
			}
			return result;
		};

		/**
		 * Considers the current vector as centre of a collision sphere with radius
		 * r and checks if the triangle abc intersects with this sphere. The Vec3D p
		 * The point on abc closest to the sphere center is returned via the
		 * supplied result vector argument.
		 * @param t
		 *			triangle to check for intersection
		 * @param result
		 *			a non-null vector for storing the result
		 * @return true, if sphere intersects triangle ABC
		 */
		Sphere.prototype.intersectSphereTriangle = function(t,result) {
			// Find Vec3D P on triangle ABC closest to sphere center
			result.set(t.closestPointOnSurface(this));

			// Sphere and triangle intersect if the (squared) distance from sphere
			// center to Vec3D p is less than the (squared) sphere radius
			var v = result.sub(this);
			return v.magSquared() <= this.radius * this.radius;
		};

		/**
		 * Calculates the normal vector on the sphere in the direction of the
		 * current point.
		 * @param q
		 * @return a unit normal vector to the tangent plane of the ellipsoid in the
		 * point.
		 */
		Sphere.prototype.tangentPlaneNormalAt = function(q) {
			return this.sub(q).normalize();
		};

		Sphere.prototype.toMesh = function() {
			//this fn requires SurfaceMeshBuilder, loading it here to avoid circular dependency
			//var SurfaceMeshBuilder = require('./mesh/SurfaceMeshBuilder');

			//if one argument is passed it can either be a Number for resolution, or an options object
			//if 2 parameters are passed it must be a TriangleMesh and then a Number for resolution
			var opts = {
				mesh: undefined,
				resolution: 0
			};
			if(arguments.length === 1){
				if(typeof(arguments[0]) == 'object'){ //options object
					opts.mesh = arguments[0].mesh;
					opts.resolution = arguments[0].res || arguments[0].resolution;
				} else { //it was just the resolution Number
					opts.resolution = arguments[0];
				}
			} else {
				opts.mesh = arguments[0];
				opts.resolution = arguments[1];
			}

			var builder = new meshCommon.SurfaceMeshBuilder(new SphereFunction(this));
			return builder.createMesh(opts.mesh, opts.resolution, 1);
		};
	}());


	//toxi.geom.mesh.SphereFunction
	(function( Sphere ){
		//SphereFunction
		var mathUtils = require('../math/mathUtils'),
			Vec3D = require('./Vec3D'),
			internals = require('../internals');

		/**
		 * @class This implementation of a {@link SurfaceFunction} samples a given
		 * {@link Sphere} instance when called by the {@link SurfaceMeshBuilder}.
		 * @member toxi
		 */
		SphereFunction = function(sphere_or_radius) {
			if(sphere_or_radius === undefined){
				this.sphere = new Sphere(new Vec3D(),1);
			}

			if(internals.is.Sphere( sphere_or_radius )){
				this.sphere = sphere_or_radius;
			}
			else{
				this.sphere = new Sphere(new Vec3D(),sphere_or_radius);
			}
			this.phiRange = mathUtils.PI;
			this.thetaRange = mathUtils.TWO_PI;
		};

		SphereFunction.prototype = {
			computeVertexFor: function(p,phi,theta) {
				phi -= mathUtils.HALF_PI;
				var cosPhi = mathUtils.cos(phi);
				var cosTheta = mathUtils.cos(theta);
				var sinPhi = mathUtils.sin(phi);
				var sinTheta = mathUtils.sin(theta);
				var t = mathUtils.sign(cosPhi) * mathUtils.abs(cosPhi);
				p.x = t * mathUtils.sign(cosTheta) * mathUtils.abs(cosTheta);
				p.y = mathUtils.sign(sinPhi) * mathUtils.abs(sinPhi);
				p.z = t * mathUtils.sign(sinTheta) * mathUtils.abs(sinTheta);
				return p.scaleSelf(this.sphere.radius).addSelf(this.sphere);
			},
			getPhiRange: function() {
				return this.phiRange;
			},
			getPhiResolutionLimit: function(res) {
				return res;
			},
			getThetaRange: function() {
				return this.thetaRange;
			},
			getThetaResolutionLimit: function(res) {
				return res;
			},
			setMaxPhi: function(max) {
				this.phiRange = mathUtils.min(max / 2, mathUtils.PI);
			},
			setMaxTheta: function(max) {
				this.thetaRange = mathUtils.min(max, mathUtils.TWO_PI);
			}
		};
	}( Sphere ));

	Sphere.SphereFunction = SphereFunction;
	module.exports = Sphere;



},{"../internals":30,"../math/mathUtils":45,"./Vec3D":20,"./mesh/meshCommon":25}],16:[function(require,module,exports){
var Vec2D = require('./Vec2D');
var is = require('../internals/is');
var BernsteinPolynomial = require('./BernsteinPolynomial');

/**
 * @class
 * @member toxi
 * @param {Vec2D[]} points array of Vec2D's
 * @param {BernsteinPolynomial} [bernsteinPoly]
 */
var	Spline2D = function(points, bernsteinPoly, tightness){
	if( arguments.length === 1 && !is.Array( points ) && is.Object(points)){
		//if its an options object
		bernsteinPoly = bernsteinPoly || points.bernsteinPoly;
		tightness = tightness || points.tightness;
		points = points.points;
	}
	var i = 0, l;
	this.pointList = [];
	if( typeof tightness !== 'number' ){
		tightness = Spline2D.DEFAULT_TIGHTNESS;
	}
	this.setTightness(tightness);
	//this may be undefined
	this.bernstein = bernsteinPoly;
	if( points !== undefined ){
		for(i = 0, l = points.length; i<l; i++){
			this.add( points[i].copy() );
		}
	}
	this.coeffA = [];
	this.delta = [];
	this.bi = [];
	for (i = 0; i < this.numP; i++) {
		this.coeffA[i] = new Vec2D();
		this.delta[i] = new Vec2D();
		this.bi[i] = 0;
	}
	this.bi = [];
};


Spline2D.prototype = {
	add: function(p){
		this.pointList.push(p.copy());
		this.numP = this.pointList.length;
		return this;
	},


	computeVertices: function(res){
		this.updateCoefficients();
        if( res < 1 ){
            res = 1;
        }
        res++;
		if (this.bernstein === undefined || this.bernstein.resolution != res) {
			this.bernstein = new BernsteinPolynomial(res);
		}
		var bst = this.bernstein;
		this.findCPoints();
		var deltaP = new Vec2D();
		var deltaQ = new Vec2D();
        res--;
        var verticeCount = (this.numP - 1) * res + 1;
        if ( typeof(this.vertices) == 'undefined' || this.vertices.length != verticeCount ) {
        	this.vertices = Array.apply( null, Array( verticeCount ) ).map( function () { return new Vec2D(); } );
        }
		var vertexIdx = 0;
		for (var i = 0; i < this.numP - 1; i++) {
			var p = this.points[i];
			var q = this.points[i + 1];

			// deltaP.set(this.delta[i]).addSelf(p);
			deltaP.x = this.delta[i].x + p.x;
			deltaP.y = this.delta[i].y + p.y;

			// deltaQ.set(q).subSelf(this.delta[i + 1]);
			deltaQ.x = q.x - this.delta[i + 1].x;
			deltaQ.y = q.y - this.delta[i + 1].y;

			for (var k = 0; k < res; k++) {
				var x = p.x * bst.b0[k] + deltaP.x * bst.b1[k] +
				deltaQ.x * bst.b2[k] +
				q.x * bst.b3[k];
				var y = p.y * bst.b0[k] + deltaP.y * bst.b1[k] +
				deltaQ.y * bst.b2[k] +
				q.y * bst.b3[k];
				this.vertices[ vertexIdx ].x = x;
				this.vertices[ vertexIdx ].y = y;
				vertexIdx++;
			}
		}
		this.vertices[ vertexIdx ].x = this.vertices[ vertexIdx - 1 ].x;
		this.vertices[ vertexIdx ].y = this.vertices[ vertexIdx - 1 ].y;
		return this.vertices;
	},

	findCPoints: function(){
		this.bi[1] = -0.25;
		var i, p0, p2, d0;
		p0 = this.pointList[0];
		p2 = this.pointList[2];
		d0 = this.delta[0];

		// this.coeffA[1].set(
		// 	(p2.x - p0.x - d0.x) * this.tightness,
		// 	(p2.y - p0.y - d0.y) * this.tightness);
		this.coeffA[1].x = (p2.x - p0.x - d0.x) * this.tightness;
		this.coeffA[1].y = (p2.y - p0.y - d0.y) * this.tightness;

		for (i = 2; i < this.numP - 1; i++) {
			this.bi[i] = -1 / (this.invTightness + this.bi[i - 1]);

			// this.coeffA[i].set(
			// 	-(this.points[i + 1].x - this.points[i - 1].x - this.coeffA[i - 1].x) *this.bi[i],
			// 	-(this.points[i + 1].y - this.points[i - 1].y - this.coeffA[i - 1].y) *this.bi[i]);
			this.coeffA[i].x = -(this.points[i + 1].x - this.points[i - 1].x - this.coeffA[i - 1].x) *this.bi[i];
			this.coeffA[i].y = -(this.points[i + 1].y - this.points[i - 1].y - this.coeffA[i - 1].y) *this.bi[i];
		}
		for (i = this.numP - 2; i > 0; i--) {

			// this.delta[i].set(fin
			// 	this.coeffA[i].x + this.delta[i + 1].x * this.bi[i],
			// 	this.coeffA[i].y + this.delta[i + 1].y * this.bi[i]);
			this.delta[i].x = this.coeffA[i].x + this.delta[i + 1].x * this.bi[i];
			this.delta[i].y = this.coeffA[i].y + this.delta[i + 1].y * this.bi[i];

		}
	},

	getDecimatedVertices: function(step,doAddFinalVertex){
		if(doAddFinalVertex === undefined)doAddFinalVertex = true;
		if(this.vertices === undefined || this.vertices.length < 2){
			this.computeVertices(Spline2D.DEFAULT_RES);
		}
		var arcLen = this.getEstimatedArcLength();
		var uniform = [];
		var delta = step / arcLen;
		var currIdx = 0;
		for(var t =0; t<1.0; t+= delta){
			var currT = t * arcLen;
			while(currT >= this.arcLenIndex[currIdx]){
				currIdx++;
			}
			var p = this.vertices[currIdx - 1];
			var q = this.vertices[currIdx];
			var frac = ((currT - this.arcLenIndex[currIdx - 1]) / (this.arcLenIndex[currIdx] - this.arcLenIndex[currIdx - 1]));

			var i = p.interpolateTo(q,frac);
			uniform.push(i);
		}
		if(doAddFinalVertex){
			uniform.push(this.vertices[this.vertices.length-1]);
		}
		return uniform;
	},


	getEstimatedArcLength: function(){
		var len;
		var arcLen = 0;

		if(this.arcLenIndex === undefined || (this.arcLenIndex !== undefined && this.arcLenIndex.length != this.vertices.length)){
			this.arcLenIndex = [0];
			len = this.vertices.length;
		}
		else {
			len = this.arcLenIndex.length;
		}

		for(var i=1;i<len;i++){
			var p = this.vertices[i-1];
			var q = this.vertices[i];
			arcLen += p.distanceTo(q);
			this.arcLenIndex[i] = arcLen;
		}

		return arcLen;
	},


	getNumPoints: function(){
		return this.numP;
	},

	getPointList: function(){
		return this.pointList;
	},

	getTightness: function(){
		return this.tightness;
	},

	setPointList: function(plist){
		this.pointList =plist.slice(0);
		return this;
	},

	setTightness: function(tight){
		this.tightness = tight;
		this.invTightness = 1 / this.tightness;
		return this;
	},

	updateCoefficients: function(){
		this.numP = this.pointList.length;
		if(this.points === undefined || (this.points !== undefined && this.points.length != this.numP)) {
			this.coeffA = [];
			this.delta = [];
			this.bi = [];
			for(var i=0;i<this.numP; i++){
				this.coeffA[i] = new Vec2D();
				this.delta[i] = new Vec2D();
			}
			this.setTightness(this.tightness);
		}
		this.points = this.pointList.slice(0);
	}

};

Spline2D.DEFAULT_TIGHTNESS = 0.25;
Spline2D.DEFAULT_RES = 16;

module.exports = Spline2D;


},{"../internals/is":38,"./BernsteinPolynomial":3,"./Vec2D":19}],17:[function(require,module,exports){


var mathUtils = require('../math/mathUtils'),
    Vec3D = require('./Vec3D'),
    Line3D = require('./Line3D'),
    AABB = require('./AABB');

/**
 * @class
 * @member toxi
 * @param {toxi.Vec3D} a
 * @param {toxi.Vec3D} b
 * @param {toxi.Vec3D} c
 */
var Triangle3D = function(a,b,c){
	this.a = a;
	this.b = b;
	this.c = c;
};

Triangle3D.createEquilateralFrom = function(a, b) {
    var c = a.interpolateTo(b, 0.5);
    var dir = b.sub(a);
    var n = a.cross(dir.normalize());
    c.addSelf(n.normalizeTo(dir.magnitude() * mathUtils.SQRT3 / 2));
    return new Triangle3D(a, b, c);
};

Triangle3D.isClockwiseInXY = function(a, b, c) {
	var determ = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
	return (determ < 0.0);
};

Triangle3D.isClockwiseInXZ = function(a, b,c) {
	var determ = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
	return (determ < 0.0);
};

Triangle3D.isClockwiseInYZ = function(a,b,c) {
    var determ = (b.y - a.y) * (c.z - a.z) - (c.y - a.y) * (b.z - a.z);
    return (determ < 0.0);
};


Triangle3D.prototype = {
	closestPointOnSurface: function(p) {
        var ab = this.b.sub(this.a);
        var ac = this.c.sub(this.a);
        var bc = this.c.sub(this.b);

        var pa = p.sub(this.a);
        var pb = p.sub(this.b);
        var pc = p.sub(this.c);

        var ap = a.sub(this.p);
        var bp = b.sub(this.p);
        var cp = c.sub(this.p);

        // Compute parametric position s for projection P' of P on AB,
        // P' = A + s*AB, s = snom/(snom+sdenom)
        var snom = pa.dot(ab);

        // Compute parametric position t for projection P' of P on AC,
        // P' = A + t*AC, s = tnom/(tnom+tdenom)
        var tnom = pa.dot(ac);

        if (snom <= 0.0 && tnom <= 0.0) {
            return this.a; // Vertex region early out
        }

        var sdenom = pb.dot(this.a.sub(this.b));
        var	tdenom = pc.dot(this.a.sub(this.c));

        // Compute parametric position u for projection P' of P on BC,
        // P' = B + u*BC, u = unom/(unom+udenom)
        var unom = pb.dot(bc);
        var udenom = pc.dot(this.b.sub(this.c));

        if (sdenom <= 0.0 && unom <= 0.0) {
            return this.b; // Vertex region early out
        }
        if (tdenom <= 0.0 && udenom <= 0.0) {
            return this.c; // Vertex region early out
        }

        // P is outside (or on) AB if the triple scalar product [N PA PB] <= 0
        var n = ab.cross(ac);
        var vc = n.dot(ap.crossSelf(bp));

        // If P outside AB and within feature region of AB,
        // return projection of P onto AB
        if (vc <= 0.0 && snom >= 0.0 && sdenom >= 0.0) {
            // return a + snom / (snom + sdenom) * ab;
            return this.a.add(ab.scaleSelf(snom / (snom + sdenom)));
        }

        // P is outside (or on) BC if the triple scalar product [N PB PC] <= 0
        var va = n.dot(bp.crossSelf(cp));
        // If P outside BC and within feature region of BC,
        // return projection of P onto BC
        if (va <= 0.0 && unom >= 0.0 && udenom >= 0.0) {
            // return b + unom / (unom + udenom) * bc;
            return this.b.add(bc.scaleSelf(unom / (unom + udenom)));
        }

        // P is outside (or on) CA if the triple scalar product [N PC PA] <= 0
        var vb = n.dot(cp.crossSelf(ap));
        // If P outside CA and within feature region of CA,
        // return projection of P onto CA
        if (vb <= 0.0 && tnom >= 0.0 && tdenom >= 0.0) {
            // return a + tnom / (tnom + tdenom) * ac;
            return this.a.add(ac.scaleSelf(tnom / (tnom + tdenom)));
        }

        // P must project inside face region. Compute Q using barycentric
        // coordinates
        var u = va / (va + vb + vc);
        var v = vb / (va + vb + vc);
        var w = 1.0 - u - v; // = vc / (va + vb + vc)
        // return u * a + v * b + w * c;
        return this.a.scale(u).addSelf(this.b.scale(v)).addSelf(this.c.scale(w));
    },

    computeCentroid: function() {
        this.centroid = this.a.add(this.b).addSelf(this.c).scaleSelf(1 / 3);
        return this.centroid;
    },

    computeNormal: function() {
        this.normal = this.a.sub(this.c).crossSelf(this.a.sub(this.b)).normalize();
        return this.normal;
    },

    containsPoint: function(p) {
        if (p.equals(this.a) || p.equals(this.b) || p.equals(this.c)) {
            return true;
        }
        var v1 = p.sub(this.a).normalize();
        var v2 = p.sub(this.b).normalize();
        var v3 = p.sub(this.c).normalize();

        var total_angles = Math.acos(v1.dot(v2));
        total_angles += Math.acos(v2.dot(v3));
        total_angles += Math.acos(v3.dot(v1));

        return (mathUtils.abs(total_angles - mathUtils.TWO_PI) <= 0.005);
    },

   flipVertexOrder: function() {
        var t = this.a;
        this.a = this.c;
        this.c = this.t;
        return this;
    },

    fromBarycentric: function(p) {
        return new Vec3D(this.a.x * p.x + this.b.x * p.y + this.c.x * p.z, this.a.y * p.x + this.b.y * p.y + this.c.y * p.z, this.a.z * p.x + this.b.z * p.y + this.c.z * p.z);
    },

    getBoundingBox: function() {
        var min = Vec3D.min(Vec3D.min(this.a, this.b), this.c);
        var max = Vec3D.max(Vec3D.max(this.a, this.b), this.c);
        return AABB.fromMinMax(min, max);
    },
    getClosestPointTo: function(p) {
        var edge = new Line3D(this.a, this.b);
        var Rab = edge.closestPointTo(p);
        var Rbc = edge.set(this.b, this.c).closestPointTo(p);
        var Rca = edge.set(this.c, this.a).closestPointTo(p);

        var dAB = p.sub(Rab).magSquared();
        var dBC = p.sub(Rbc).magSquared();
        var dCA = p.sub(Rca).magSquared();

        var min = dAB;
        var result = Rab;

        if (dBC < min) {
            min = dBC;
            result = Rbc;
        }
        if (dCA < min) {
            result = Rca;
        }

        return result;
    },

    isClockwiseInXY: function() {
        return Triangle3D.isClockwiseInXY(this.a, this.b, this.c);
    },

    isClockwiseInXZ: function() {
        return Triangle3D.isClockwiseInXY(this.a, this.b, this.c);
    },

    isClockwiseInYZ: function() {
        return Triangle3D.isClockwiseInXY(this.a, this.b, this.c);
    },

    set: function(a2, b2, c2) {
        this.a = a2;
        this.b = b2;
        this.c = c2;
    },

    toBarycentric: function(p) {
        var  e = b.sub(this.a).cross(this.c.sub(this.a));
        var  n = e.getNormalized();

        // Compute twice area of triangle ABC
        var areaABC = n.dot(e);
        // Compute lambda1
        var areaPBC = n.dot(this.b.sub(p).cross(this.c.sub(p)));
        var l1 = areaPBC / areaABC;

        // Compute lambda2
        var areaPCA = n.dot(this.c.sub(p).cross(this.a.sub(p)));
        var l2 = areaPCA / areaABC;

        // Compute lambda3
        var l3 = 1.0 - l1 - l2;

        return new Vec3D(l1, l2, l3);
    },

    toString: function() {
        return "Triangle: " + this.a + "," + this.b + "," + this.c;
    }

};

module.exports = Triangle3D;


},{"../math/mathUtils":45,"./AABB":2,"./Line3D":8,"./Vec3D":20}],18:[function(require,module,exports){
var mathUtils = require('../math/mathUtils');
var Triangle3D = require('./Triangle3D');
var Vec3D = require('./Vec3D');
var IsectData3D = require('./IsectData3D');

	/**
	 * @param {Triangle3D} [t]
	 */
	var TriangleIntersector = function(t){
		this.triangle = t || new Triangle3D();
		this.isectData = new IsectData3D();
	};

	TriangleIntersector.prototype = {
		getIntersectionData: function(){
			return this.isectData;
		},
		getTriangle: function(){
			return this.triangle;
		},
		/**
		 * @param {Ray3D} ray
		 * @returns {Boolean}
		 */
		intersectsRay: function(ray){
			this.isectData.isIntersection = false;
			var n = this.triangle.computeNormal(),
				dotprod = n.dot(ray.dir);
			if(dotprod < 0){
				var rt = ray.sub(this.triangle.a),
					t = -(n.x * rt.x + n.y * rt.y + n.z * rt.z) / (n.x * ray.dir.x + n.y * ray.dir.y + n.z * ray.dir.z);
				if(t >= mathUtils.EPS){
					var pos = ray.getPointAtDistance(t);
					//check if pos is inside triangle
					if(this.triangle.containsPoint(pos)){
						this.isectData.isIntersection = true;
						this.isectData.pos = pos;
						this.isectData.normal = n;
						this.isectData.dist = t;
						this.isectData.dir = this.isectData.pos.sub(ray).normalize();
					}
				}
			}
			return this.isectData.isIntersection;
		},
		/**
		 * @param {Triangle3D} tri
		 * @returns {TriangleIntersector}
		 */
		setTriangle: function(tri){
			this.triangle = tri;
			return this;
		}
	};

	module.exports = TriangleIntersector;


},{"../math/mathUtils":45,"./IsectData3D":6,"./Triangle3D":17,"./Vec3D":20}],19:[function(require,module,exports){

    //Vec2D is located in toxi/geom/vectors to circumvent circular dependencies
    module.exports = require('./vectors').Vec2D;

},{"./vectors":29}],20:[function(require,module,exports){

	//Vec3D is defined in toxi/geom/vectors to circumvent circular dependencies
	module.exports = require('./vectors').Vec3D;

},{"./vectors":29}],21:[function(require,module,exports){

	//these 2 modules get defined
	var Face, WEFace;

	(function(){
		var Triangle3D = require('../Triangle3D');
		Face = function(a,b,c,uvA,uvB,uvC) {
			this.a = a;
			this.b = b;
			this.c = c;
			var aminusc = this.a.sub(this.c);
			var aminusb = this.a.sub(this.b);
			var cross = aminusc.crossSelf(aminusb);
			this.normal = cross.normalize();
			this.a.addFaceNormal(this.normal);
			this.b.addFaceNormal(this.normal);
			this.c.addFaceNormal(this.normal);

			if(uvA !== undefined){
				this.uvA = uvA;
				this.uvB = uvB;
				this.uvC = uvC;
			}
		};

		Face.prototype = {
			computeNormal: function() {
				this.normal = this.a.sub(this.c).crossSelf(this.a.sub(this.b)).normalize();
			},

			flipVertexOrder: function() {
				var t = this.a;
				this.a = this.b;
				this.b = t;
				this.normal.invert();
			},

			getCentroid: function() {
				return this.a.add(this.b).addSelf(this.c).scale(1.0 / 3);
			},

			getClass: function(){
				return "Face";
			},

			getVertices: function(verts) {
				if (verts !== undefined) {
					verts[0] = this.a;
					verts[1] = this.b;
					verts[2] = this.c;
				} else {
					verts = [ this.a, this.b, this.c ];
				}
				return verts;
			},

			toString: function() {
				return this.getClass() + " " + this.a + ", " + this.b + ", " + this.c;
			},

			/**
			 * Creates a generic {@link Triangle3D} instance using this face's vertices.
			 * The new instance is made up of copies of the original vertices and
			 * manipulating them will not impact the originals.
			 *
			 * @return triangle copy of this mesh face
			 */
			toTriangle: function() {
				return new Triangle3D(this.a.copy(), this.b.copy(), this.c.copy());
			}
		};
	}());

	//define WEFace
	(function(){
		var internals = require('../../internals');
		var proto;
		//@param {WEVertex} a
		//@param {WEVertex} b
		//@param {WEVertex} c
		//@param {Vec2D} [uvA]
		//@param {Vec2D} [uvB]
		//@param {Vec2D} [uvC]
		WEFace = function( a, b, c, uvA, uvB, uvC ){
			Face.call(this, a, b, c, uvA, uvB, uvC);
			this.edges = [];
		};
		internals.extend( WEFace, Face );
		proto = WEFace.prototype;
		//@param {WingedEdge} edge
		proto.addEdge = function( edge ){
			this.edges.push( edge );
		};
		proto.getEdges = function(){
			return this.edges;
		};
		//@param {WEVertex[]} [verts]
		proto.getVertices = function( verts ){
			if( verts !== undefined ){
				verts[0] = this.a;
				verts[1] = this.b;
				verts[2] = this.c;
			} else {
				verts = [ this.a, this.b, this.c ];
			}
			return verts;
		};
	}());
	Face.WEFace = WEFace;
	module.exports = Face;


},{"../../internals":30,"../Triangle3D":17}],22:[function(require,module,exports){

	module.exports = require('./meshCommon').TriangleMesh;


},{"./meshCommon":25}],23:[function(require,module,exports){


	//WEVertex becomes a property on Vertex
	var Vertex, WEVertex;

	(function(){
		var extend = require('../../internals').extend,
			Vec3D = require('../Vec3D'),
			proto;

		Vertex = function(v,id) {
			Vec3D.call(this,v);
			this.id = id;
			this.normal = new Vec3D();
		};
		extend(Vertex,Vec3D);
		proto = Vertex.prototype;
		proto.addFaceNormal = function(n) {
			this.normal.addSelf(n);
		};

		proto.clearNormal = function() {
			this.normal.clear();
		};

		proto.computeNormal = function() {
			this.normal.normalize();
		};

		proto.toString = function() {
			return this.id + ": p: " + this.parent.toString.call(this) + " n:" + this.normal.toString();
		};
	}());

	(function(){
		var extend = require('../../internals').extend, proto;

		WEVertex = function( vec3d, id ){
			Vertex.call(this, vec3d, id);
			this.edges = [];
		};
		extend( WEVertex, Vertex );
		proto = WEVertex.prototype;
		//@param {WingedEdge} edge to add
		proto.addEdge = function( edge ){
			this.edges.push( edge );
		};
		//@param {Vec3D} dir
		//@param {Number} tolerance
		//@return {WingedEdge} closest
		proto.getNeighborInDirection = function( dir, tolerance ){
			var closest, delta = 1 - tolerance;
			var neighbors = this.getNeighbors();
			var d;
			for(var i=0, l=neighbors.length; i<l; i++){
				d = neighbors[i].sub( this ).normalize().dot( dir );
				if( d > delta ){
					closest = neighbors[i];
					delta = d;
				}
			}
			return closest;
		};
		//@return {WingedEdge[]} neighbors
		proto.getNeighbors = function(){
			var neighbors = [];
			for(var i=0, l=this.edges.length; i<l; i++){
				neighbors.push( this.edges[i].getOtherEndFor(this) );
			}
			return neighbors;
		};

		proto.removeEdge = function( e ){
			this.edges.splice( this.edges.indexOf( e ), 1 );
		};

		proto.toString = function(){
			return this.id + " {" + this.x + "," + this.y + "," + this.z + "}";
		};

		return WEVertex;
	}());
	Vertex.WEVertex = WEVertex;
	module.exports = Vertex;


},{"../../internals":30,"../Vec3D":20}],24:[function(require,module,exports){
var internals = require('../../internals');
var Line3D = require('../Line3D');

	var WingedEdge, proto;
	//@param {WEVertex} va
	//@param {WEVertex} vb
	//@param {WEFace} face
	//@param {Number} id
	WingedEdge = function( va, vb, face, id ){
		Line3D.call(this, va, vb);
		this.id = id;
		this.faces = [];
		this.addFace( face );
	};
	internals.extend( WingedEdge, Line3D );
	proto = WingedEdge.prototype;
	//@param {WEFace} face
	//@return {WingedEdge} this
	proto.addFace = function( face ){
		this.faces.push( face );
		return this;
	};
	//@return {WEFace[]} faces
	proto.getFaces = function() {
		return this.faces;
	};
	//@param {WEVertex} wevert
	//@return {WingedEdge}
	proto.getOtherEndFor = function( wevert ){
		if( this.a === wevert ){
			return this.b;
		}
		if( this.b === wevert ){
			return this.a;
		}
	};

	proto.remove = function(){
		var self = this;
		var rm = function( edges ){
			edges.splice( edges.indexOf( self ), 1 );
		};
		for( var i=0, l = this.faces.length; i<l; i++){
			rm( this.faces[i].edges );
		}
		rm( this.a.edges );
		rm( this.b.edges );
	};

	proto.toString = function(){
		return "id: " + this.id + " " + Line3D.prototype.toString.call(this) + " f: " + this.faces.length;
	};

	module.exports = WingedEdge;


},{"../../internals":30,"../Line3D":8}],25:[function(require,module,exports){


	var TriangleMesh, WETriangleMesh, Terrain, SurfaceMeshBuilder;

    var precision = 1000000;
    var format = function( n ){
        return Math.floor(n*precision) / precision;
    };
	//private: way of generating object keys for point map in meshes
	function vertexKeyGenerator( v ){
		//this will hold the ids consistently between vertex and vec3ds
		return "[ x: "+format(v.x)+ ", y: "+format(v.y)+ ", z: "+format(v.z)+"]";
	}
	//private: used for tracking edges in the internals.LinkedMap
	function edgeKeyGenerator( edge ){
        return edge.a.id + '->'+ edge.b.id;
	}


	//#TriangleMesh
	(function(){
		var	internals = require('../../internals'),
			mathUtils = require('../../math/mathUtils'),
			Matrix4x4 = require('../Matrix4x4'),
			Face = require('./Face'),
			Vec3D = require('../Vec3D'),
			Triangle3D = require('../Triangle3D'),
            TriangleIntersector = require('../TriangleIntersector'),
			Quaternion = require('../Quaternion'),
			Vertex = require('./Vertex');

		/**
		 * @class
		 * @member toxi
		 */
		//java TriangleMesh constructor is (name, numVertices, numFaces)
		//numVertices, numFaces is irrelevant with js arrays
		TriangleMesh = function(name){
			if(name === undefined)name = "untitled";
			this.init( name );
			return this;
		};

		TriangleMesh.__vertexKeyGenerator = vertexKeyGenerator;


		//statics
		TriangleMesh.DEFAULT_NUM_VERTICES = 1000;
		TriangleMesh.DEFAULT_NUM_FACES = 3000;
		TriangleMesh.DEFAULT_STRIDE = 4;

		TriangleMesh.prototype = {
            /**
             * add a Face to the mesh
             * @param {Vec3D} a
             * @param {Vec3D} b
             * @param {Vec3D} c
             * @param {Vec3D} [n] the normal
             * @param {Vec2D} [uvA]
             * @param {Vec2D} [uvB]
             * @param {Vec2D} [uvC]
             * @returns itself
             */
			addFace: function(a,b,c,n,uvA,uvB,uvC){
				//can be 3 args, 4 args, 6 args, or 7 args
				//if it was 6 swap vars around,
				if( arguments.length == 6 ){
					uvC = uvB;
					uvB = uvA;
					uvA = n;
					n = undefined;
				}
				//7 param method
				var va = this.__checkVertex(a);
				var vb = this.__checkVertex(b);
				var vc = this.__checkVertex(c);

				if(va.id === vb.id || va.id === vc.id || vb.id === vc.id){
					//console.log("ignoring invalid face: "+a + ", " +b+ ", "+c);
				} else {
					if(n != null ){
						var nc = va.sub(vc).crossSelf(va.sub(vb));
						if(n.dot(nc)<0){
							var t = va;
							va = vb;
							vb = t;
						}
					}
					var f = new Face(va,vb,vc,uvA,uvB,uvC);
					this.faces.push(f);
				}
				return this;
			},

            /**
             * add the contents of a TriangleMesh to this TriangleMesh
             * @param {TriangleMesh} m
             * @returns itself
             */
			addMesh: function(m){
				var l = m.getFaces().length;
				for(var i=0;i<l;i++){
					var f = m.getFaces()[i];
					this.addFace(f.a,f.b,f.c);
				}
				return this;
			},

			center: function(origin){
				this.computeCentroid();
				var delta = (origin != null) ? origin.sub(this.centroid) : this.centroid.getInverted();
				var l = this.vertices.length;
				for(var i=0;i<l;i++){
					var v = this.vertices[i];
					v.addSelf(delta);
				}

				return this.getBoundingBox();
			},

			__checkVertex: function(v){
				var vertex = this.vertexMap.get(v);
				if(!vertex){
					vertex = this._createVertex(v,this.uniqueVertexID++);
					this.vertexMap.put( vertex, vertex );
				}
				return vertex;
			},

			clear: function(){
				this.vertexMap = new internals.LinkedMap( vertexKeyGenerator );
				this.vertices = this.vertexMap.getArray();
				this.faces = [];
				this.bounds = undefined;
				return this;
			},

			computeCentroid: function(){
				this.centroid.clear();
				var l = this.vertices.length;
				for(var i=0;i<l;i++){
					this.centroid.addSelf(this.vertices[i]);
				}
				return this.centroid.scaleSelf(1.0/this.vertexMap.size()).copy();
			},

			computeFaceNormals: function(){
				var l = this.faces.length;
				for(var i=0;i<l;i++){
					this.faces[i].computeNormal();
				}
			},

			computeVertexNormals: function(){
				var l = this.vertices.length,
					i = 0;
				for(i=0;i<l;i++){
					this.vertices[i].clearNormal();
				}
				l = this.faces.length;
				for(i=0;i<l;i++){
					var f = this.faces[i];
					f.a.addFaceNormal(f.normal);
					f.b.addFaceNormal(f.normal);
					f.c.addFaceNormal(f.normal);
				}
				l = this.vertices.length;
				for(i=0;i<l;i++){
					this.vertices[i].computeNormal();
				}
				return this;
			},

			copy: function(){
				var m = new TriangleMesh(this.name+"-copy",this.vertexMap.size(),this.faces.length);
				var l = this.faces.length;
				for(var i=0;i<l;i++){
					var f = this.faces[i];
					m.addFace(f.a,f.b,f.c,f.normal,f.uvA,f.uvB,f.uvC);
				}
				return m;
			},

			_createVertex: function(vec3D,id){
				var vertex = new Vertex( vec3D, id );
				return vertex;
			},

			faceOutwards: function(){
				this.computeCentroid();
				var l = this.faces.length;
				for(var i=0;i<l;i++){
					var f = this.faces[i];
					var n = f.getCentroid().sub(this.centroid);
					var dot = n.dot(f.normal);
					if(dot <0) {
						f.flipVertexOrder();
					}
				}
				return this;
			},

			flipVertexOrder: function(){
				var l = this.faces.length,
                    tuv;
				for(var i=0;i<l;i++){
					var f = this.faces[i];
					var t = f.a;
					f.a = f.b;
					f.b = t;
                    if( f.uvA ){
                        tuv = f.uvA;
                        f.uvA = f.uvB;
                        f.uvB = tuv;
                    }
					f.normal.invert();
				}
				return this;
			},

			flipYAxis: function(){
				this.transform(new Matrix4x4().scaleSelf(1,-1,1));
				this.flipVertexOrder();
				return this;
			},

			getBoundingBox: function( ){
				var AABB = require('../AABB');
				var self = this;
				var minBounds = Vec3D.MAX_VALUE.copy();
				var maxBounds = Vec3D.MIN_VALUE.copy();
				var l = self.vertices.length;

				for(var i=0;i<l;i++){
					var v = self.vertices[i];
					minBounds.minSelf(v);
					maxBounds.maxSelf(v);
				}
				self.bounds = AABB.fromMinMax(minBounds,maxBounds);
				return self.bounds;
			},

			getBoundingSphere:function(){
				var Sphere = require('../Sphere');
				var radius = 0;
				this.computeCentroid();
				var l = this.vertices.length;
				for(var i=0;i<l;i++){
					var v = this.vertices[i];
					radius = mathUtils.max(radius,v.distanceToSquared(this.centroid));
				}
				var sph = new Sphere(this.centroid,Math.sqrt(radius));
				return sph;
			},

			getClosestVertexToPoint: function(p){
				var closest,
					minDist = Number.MAX_VALUE,
					l = this.vertices.length;
				for(var i=0;i<l;i++){
					var v = this.vertices[i];
					var d = v.distanceToSquared(p);
					if(d<minDist){
						closest = v;
						minDist = d;
					}
				}
				return closest;
			},

			/**
			 * Creates an array of unravelled normal coordinates. For each vertex the
			 * normal vector of its parent face is used. This method can be used to
			 * translate the internal mesh data structure into a format suitable for
			 * OpenGL Vertex Buffer Objects (by choosing stride=4). For more detail,
			 * please see {@link #getMeshAsVertexArray(float[], int, int)}
			 *
			 * @see #getMeshAsVertexArray(float[], int, int)
			 *
			 * @param normals existing float array or null to automatically create one
			 * @param offset start index in array to place normals
			 * @param stride stride/alignment setting for individual coordinates (min value = 3)
			 * @return array of xyz normal coords
			 */
			getFaceNormalsAsArray: function(normals, offset, stride) {
				if(arguments.length === 0){
					normals = undefined;
					offset = 0;
					stride = TriangleMesh.DEFAULT_STRIDE;
				} else if(arguments.length == 1 && typeof(arguments[0]) == 'object'){ //options object
					var opts = arguments[0];
					normals = opts.normals;
					offset = opts.offset;
					stride = opts.stride;
				}
				stride = mathUtils.max(stride, 3);
				if (normals === undefined) {
					normals = [];
				}
				var i = offset;
				var l = this.faces.length;
				for (var j=0;j<l;j++) {
					var f = this.faces[j];
					normals[i] = f.normal.x;
					normals[i + 1] = f.normal.y;
					normals[i + 2] = f.normal.z;
					i += stride;
					normals[i] = f.normal.x;
					normals[i + 1] = f.normal.y;
					normals[i + 2] = f.normal.z;
					i += stride;
					normals[i] = f.normal.x;
					normals[i + 1] = f.normal.y;
					normals[i + 2] = f.normal.z;
					i += stride;
				}
				return normals;
			},

			getFaces: function() {
				return this.faces;
			},

			/**
			 * Builds an array of vertex indices of all faces. Each vertex ID
			 * corresponds to its position in the vertices Array. The
			 * resulting array will be 3 times the face count.
			 * please see {@link #getUniqueVerticesAsArray([array])}
             * and {@link #getUniqueVertexNormalsAsArray([array])}
			 *
			 * @see #getUniqueVerticesAsArray([array])
             * @see #getUniqueVertexNormalsAsArray([array])
			 *
             * @param {Array|Unit16Array} [faceList] optionally provide an array or typed-array
			 * @return array of vertex indices
			 */
			getFacesAsArray: function(faceList) {
				faceList = faceList || [];
				var i = 0;
				var l = this.faces.length;
				for (var j=0;j<l;j++) {
					var f = this.faces[j];
					faceList[i++] = f.a.id;
					faceList[i++] = f.b.id;
					faceList[i++] = f.c.id;
				}
				return faceList;
			},

			getIntersectionData: function() {
				return this.intersector.getIntersectionData();
			},


			/**
			 * Creates an array of unravelled vertex coordinates for all faces. This
			 * method can be used to translate the internal mesh data structure into a
			 * format suitable for OpenGL Vertex Buffer Objects (by choosing stride=4).
			 * The order of the array will be as follows:
			 *
			 * <ul>
			 * <li>Face 1:
			 * <ul>
			 * <li>Vertex #1
			 * <ul>
			 * <li>x</li>
			 * <li>y</li>
			 * <li>z</li>
			 * <li>[optional empty indices to match stride setting]</li>
			 * </ul>
			 * </li>
			 * <li>Vertex #2
			 * <ul>
			 * <li>x</li>
			 * <li>y</li>
			 * <li>z</li>
			 * <li>[optional empty indices to match stride setting]</li>
			 * </ul>
			 * </li>
			 * <li>Vertex #3
			 * <ul>
			 * <li>x</li>
			 * <li>y</li>
			 * <li>z</li>
			 * <li>[optional empty indices to match stride setting]</li>
			 * </ul>
			 * </li>
			 * </ul>
			 * <li>Face 2:
			 * <ul>
			 * <li>Vertex #1</li>
			 * <li>...etc.</li>
			 * </ul>
			 * </ul>
			 *
			 * @param verts  an existing target array or null to automatically create one
			 * @param offset start index in arrtay to place vertices
			 * @param stride stride/alignment setting for individual coordinates
			 * @return array of xyz vertex coords
			 */
			getMeshAsVertexArray: function(verts, offset, stride) {
				if(verts ===undefined){
					verts = undefined;
				}
				if(offset === undefined){
					offset = 0;
				}
				if(stride === undefined){
					stride = TriangleMesh.DEFAULT_STRIDE;
				}
				stride = mathUtils.max(stride, 3);
				if (verts === undefined) {
					verts = [];
				}
				var i = 0,//offset
					l = this.faces.length;
				for (var j=0;j<l;++j) {
					var f = this.faces[j];
					verts[i] = f.a.x;
					verts[i + 1] = f.a.y;
					verts[i + 2] = f.a.z;
					i += stride;
					verts[i] = f.b.x;
					verts[i + 1] = f.b.y;
					verts[i + 2] = f.b.z;
					i += stride;
					verts[i] = f.c.x;
					verts[i + 1] = f.c.y;
					verts[i + 2] = f.c.z;
					i += stride;
				}
				return verts;
			},

			getNumFaces: function() {
				return this.faces.length;
			},

			getNumVertices: function() {
				return this.vertexMap.size();
			},

			getRotatedAroundAxis: function(axis,theta) {
				return this.copy().rotateAroundAxis(axis, theta);
			},

			getRotatedX: function(theta) {
				return this.copy().rotateX(theta);
			},

			getRotatedY: function(theta) {
				return this.copy().rotateY(theta);
			},

			getRotatedZ: function(theta) {
				return this.copy().rotateZ(theta);
			},

			getScaled: function(scale) {
				return this.copy().scale(scale);
			},

			getTranslated: function(trans) {
				return this.copy().translate(trans);
			},

            /**
             * flatten each vertex once into an array, useful for OpenGL attributes
             * @param {Array|Float32Array} [array] optionally pass in an array or typed-array to reuse
             * @return {Array|Float32Array}
             */
			getUniqueVerticesAsArray: function(array) {
				array = array || [];
				var i = 0;
				var l = this.vertices.length;
				for (var j=0;j<l;j++) {
					var v = this.vertices[j];
					array[i++] = v.x;
					array[i++] = v.y;
					array[i++] = v.z;
				}
				return array;
			},

            /**
             * flatten each vertex normal once into an array, useful for OpenGL attributes
             * @param {Array|Float32Array} [array] optionally pass in an array or typed-array to reuse
             * @return {Array|Float32Array}
             */
            getUniqueVertexNormalsAsArray: function(array){
                array = array || [];
                var n = 0;
                for(i=0; i<this.vertices.length; i++){
                    var v = this.vertices[i];
                    array[n++] = v.normal.x;
                    array[n++] = v.normal.y;
                    array[n++] = v.normal.z;
                }

                return array;
            },

            /**
             * get the UVs of all faces in flattened array that is, usefl for OpenGL attributes
             * any missing UV coordinates are returned as 0
             * @param {Array|Float32Array} [array] optionally pass in an array or typed-array to reuse
             * @return {Array|Float32Array}
             */
            getUVsAsArray: function(array){
                array = array || [];
                var i = 0;
                for(f=0; f<this.faces.length; f++){
                    var face = this.faces[f];
                    array[i++] = face.uvA ? face.uvA.x : 0;
                    array[i++] = face.uvA ? face.uvA.y : 0;
                    array[i++] = face.uvB ? face.uvB.x : 0;
                    array[i++] = face.uvB ? face.uvB.y : 0;
                    array[i++] = face.uvC ? face.uvC.x : 0;
                    array[i++] = face.uvC ? face.uvC.y : 0;
                }

                return array;
            },

			getVertexAtPoint: function(v) {
				var index;
				for(var i=0;i<this.vertices.length;i++){
					if(this.vertices[i].equals(v)){
						index = i;
					}
				}
				return this.vertices[index];
			},
			//my own method to help
			getVertexIndex: function(vec) {
				var matchedVertex = -1;
				var l = this.vertices.length;
				for(var i=0;i<l;i++)
				{
					var vert = this.vertices[i];
					if(vert.equals(vec))
					{
						matchedVertex =i;
					}
				}
				return matchedVertex;

			},

			getVertexForID: function(id) {
				var vertex,
					l = this.vertices.length;
				for (var i=0;i<l;i++) {
					var v = this.vertices[i];
					if (v.id == id) {
						vertex = v;
						break;
					}
				}
				return vertex;
			},

			/**
			 * Creates an array of unravelled vertex normal coordinates for all faces.
			 * This method can be used to translate the internal mesh data structure
			 * into a format suitable for OpenGL Vertex Buffer Objects (by choosing
			 * stride=4). For more detail, please see
			 * {@link #getMeshAsVertexArray(float[], int, int)}
			 *
			 * @see #getMeshAsVertexArray(float[], int, int)
			 *
			 * @param normals existing float array or null to automatically create one
			 * @param offset start index in array to place normals
			 * @param stride stride/alignment setting for individual coordinates (min value
			 *            = 3)
			 * @return array of xyz normal coords
			 */
			getVertexNormalsAsArray: function(normals, offset,stride) {
				if(offset === undefined)offset = 0;
				if(stride === undefined)stride = TriangleMesh.DEFAULT_STRIDE;
				stride = mathUtils.max(stride, 3);
				if (normals === undefined) {
					normals = [];
				}
				var i = offset;
				var l = this.faces.length;
				for (var j=0;j<l;j++) {
					var f = this.faces[j];
					normals[i] = f.a.normal.x;
					normals[i + 1] = f.a.normal.y;
					normals[i + 2] = f.a.normal.z;
					i += stride;
					normals[i] = f.b.normal.x;
					normals[i + 1] = f.b.normal.y;
					normals[i + 2] = f.b.normal.z;
					i += stride;
					normals[i] = f.c.normal.x;
					normals[i + 1] = f.c.normal.y;
					normals[i + 2] = f.c.normal.z;
					i += stride;
				}
				return normals;
			},

			getVertices: function() {
				return this.vertices;
			},

			handleSaveAsSTL: function(stl,useFlippedY) {
				/*f (useFlippedY) {
					stl.setScale(new Vec3D(1, -1, 1));
					for (Face f : faces) {
						stl.face(f.a, f.b, f.c, f.normal, STLWriter.DEFAULT_RGB);
					}
				} else {
					for (Face f : faces) {
						stl.face(f.b, f.a, f.c, f.normal, STLWriter.DEFAULT_RGB);
					}
				}
				stl.endSave();
				console.log(numFaces + " faces written");
				*/
				throw new Error("TriangleMesh.handleSaveAsSTL() currently not implemented");

			},

			init: function( name ){
				this.setName(name);
				this.matrix = new Matrix4x4();
				this.centroid = new Vec3D();
				this.vertexMap = new internals.LinkedMap( vertexKeyGenerator );
				//used for checking if theres an existing Vertex
				this.vertices = this.vertexMap.getArray();
				this.faces = [];
				this.uniqueVertexID = 0;
                this.intersector = new TriangleIntersector();
			},

			intersectsRay: function(ray) {
				var tri = this.intersector.getTriangle();
				var l = this.faces.length;
				var f;
				for (var i =0;i<l;i++) {
					f = this.faces[i];
					tri.a = f.a;
					tri.b = f.b;
					tri.c = f.c;
					if (this.intersector.intersectsRay(ray)) {
						return true;
					}
				}
				return false;
			},

			perforateFace: function(f, size) {
				var centroid = f.getCentroid();
				var d = 1 - size;
				var a2 = f.a.interpolateTo(centroid, d);
				var b2 = f.b.interpolateTo(centroid, d);
				var c2 = f.c.interpolateTo(centroid, d);
				this.removeFace(f);
				this.addFace(f.a, b2, a2);
				this.addFace(f.a, f.b, b2);
				this.addFace(f.b, c2, b2);
				this.addFace(f.b, f.c, c2);
				this.addFace(f.c, a2, c2);
				this.addFace(f.c, f.a, a2);
				return new Triangle3D(a2, b2, c2);
			},

			/**
			 * Rotates the mesh in such a way so that its "forward" axis is aligned with
			 * the given direction. This version uses the positive Z-axis as default
			 * forward direction.
			 *
			 * @param dir, new target direction to point in
			 * @param [forward], optional vector, defaults to Vec3D.Z_AXIS
			 * @return itself
			 */
			pointTowards: function(dir, forward) {
				forward = forward || Vec3D.Z_AXIS;
				return this.transform( Quaternion.getAlignmentQuat(dir, forward).toMatrix4x4(this.matrix), true);
			},

			removeFace: function(f) {
				var index = -1;
				var l = this.faces.length;
				for(var i=0;i<l;i++){
					if(this.faces[i] == f){
						index = i;
						break;
					}
				}
				if(index > -1){
					this.faces.splice(index,1);
				}
			},


			rotateAroundAxis: function(axis, theta) {
				return this.transform(this.matrix.identity().rotateAroundAxis(axis, theta));
			},

			rotateX: function(theta) {
				return this.transform(this.matrix.identity().rotateX(theta));
			},

			rotateY: function(theta) {
				return this.transform(this.matrix.identity().rotateY(theta));
			},

			rotateZ: function(theta) {
				return this.transform(this.matrix.identity().rotateZ(theta));
			},

			saveAsOBJ: function(obj, saveNormals) {
				if( saveNormals === undefined){
					saveNormals = true;
				}
				var vOffset = obj.getCurrVertexOffset() + 1,
					nOffset = obj.getCurrNormalOffset() + 1;
				obj.newObject( this.name );
				//vertices
				var v = 0, f = 0,
					vlen = this.vertices.length,
					flen = this.faces.length,
					face;
				for( v=0; v<vlen; v++ ){
					obj.vertex( this.vertices[v] );
				}
				//faces
				if( saveNormals ){
					//normals
					for( v=0; v<vlen; v++){
						obj.normal( this.vertices[v].normal );
					}
					for( f=0; f<flen; f++){
						face = this.faces[f];
						obj.faceWithNormals(face.b.id + vOffset, face.a.id + vOffset, face.c.id + vOffset, face.b.id + nOffset, face.a.id + nOffset, face.c.id + nOffset);
					}
				} else {
					for( f=0; f<flen; f++){
						face = this.faces[f];
						obj.face(face.b.id + vOffset, face.a.id + vOffset, face.c.id + vOffset);
					}
				}
			},

			saveAsSTL: function(a,b,c){
				throw new Error("TriangleMesh.saveAsSTL() currently not implemented");
			},

			scale: function(scale) {
				return this.transform(this.matrix.identity().scaleSelf(scale));
			},

			setName: function(name) {
				this.name = name;
				return this;
			},

			toString: function() {
				return "TriangleMesh: " + this.name + " vertices: " + this.getNumVertices() + " faces: " + this.getNumFaces();
			},

			toWEMesh: function() {
				return new WETriangleMesh(this.name).addMesh(this);
			},

			/**
			* Applies the given matrix transform to all mesh vertices. If the
			* updateNormals flag is true, all face normals are updated automatically,
			* however vertex normals need a manual update.
			* @param mat
			* @param updateNormals
			* @return itself
			*/
			transform: function(mat,updateNormals) {
				if(updateNormals === undefined){
					updateNormals = true;
				}
				var l = this.vertices.length;
				for(var i=0;i<l;i++){
					var v = this.vertices[i];
					v.set(mat.applyTo(v));
				}
				if(updateNormals){
					this.computeFaceNormals();
				}
				return this;
			},

			translate: function(x,y,z){
				if(arguments.length == 1){
					y = x.y;
					z = x.z;
					x = x.x;
				}
				return this.transform(this.matrix.identity().translateSelf(x,y,z));
			},

			updateVertex: function(origVec3D,newPos) {
				var vertex = this.vertexMap.get( origVec3D );
				if (vertex !== undefined ) {
					this.vertexMap.remove( vertex );
					vertex.set( newPos );
					this.vertexMap.put( newPos, vertex );
				}
				return this;
			}
		};
	}());

	//define WETriangleMesh
	(function( TriangleMesh ){
		//dependenecies
		var internals = require('../../internals');
		var Line3D = require('../Line3D');
		var Vec3D = require('../Vec3D');
		var WEVertex = require('./Vertex').WEVertex;
		var WEFace = require('./Face').WEFace;
		var WingedEdge = require('./WingedEdge');
		var MidpointSubdivision = require('./subdiv/MidpointSubdivision');

		//locals
		var proto;
		//constructor
		WETriangleMesh = function( name ){
			name = name || "untitled";
			TriangleMesh.call(this, name);
		};
		//passing these on to match java api
		WETriangleMesh.DEFAULT_NUM_FACES = TriangleMesh.DEFAULT_NUM_FACES;
		WETriangleMesh.DEFAULT_NUM_VERTICES = TriangleMesh.DEFAULT_NUM_VERTICES;

		internals.extend( WETriangleMesh, TriangleMesh );
		proto = WETriangleMesh.prototype;

		proto.addFace = function( a, b, c, norm, uvA, uvB, uvC ){
			if( arguments.length === 6 ){
				//6-arg a,b,c,uvA,uvB,uvC pass everything up one
				uvC = uvB;
				uvB = uvA;
				uvA = norm;
				norm = undefined;
			}

			var va = this.__checkVertex(a),
				vb = this.__checkVertex(b),
				vc = this.__checkVertex(c),
				nc, t, f;

			if( va.id === vb.id || va.id === vc.id || vb.id === vc.id ){
				console.log('Ignoring invalid face: ' + a + ',' + b + ',' + c);
			} else {
				if( norm !== undefined && norm !== null ){
					nc = va.sub(vc).crossSelf(va.sub(vb));
					if( norm.dot(nc) < 0 ){
						t = va;
						va = vb;
						vb = t;
					}
				}
				f = new WEFace(va, vb, vc, uvA, uvB, uvC);
				this.faces.push(f);
				this.updateEdge( va,vb,f );
				this.updateEdge( vb,vc,f );
				this.updateEdge( vc,va,f );
			}
			return this;
		};

		proto.center = function( origin, callback ){
			TriangleMesh.prototype.center.call(this, origin, callback);
			this.rebuildIndex();
		};

		proto.clear = function(){
			TriangleMesh.prototype.clear.call(this);
			this.edgeMap = new internals.LinkedMap( edgeKeyGenerator );
			this.edges = this.edgeMap.getArray();
			return this;
		};

		proto.copy = function(){
			var m = new WETriangleMesh( this.name+"-copy" );
			var i, l, f;
			l = this.faces.length;
			for(i=0; i<l; i++){
				f = this.faces[i];
				m.addFace( f.a, f.b, f.c, f.normal, f.uvA, f.uvB, f.uvC );
			}
			return m;
		};

		proto._createVertex = function( vec3D, id ){
			var vertex = new WEVertex( vec3D, id );
			return vertex;
		};
		//TODO: numEdges currently not hooked up
		proto.getNumEdges = function(){
			return this.edgeMap.size();
		};

		proto.init = function( name ){
			TriangleMesh.prototype.init.call(this, name);
			//this.edgeMap.put(va.toString()+vb.toString(), {WingedEdge} );
			this.edgeMap = new internals.LinkedMap( edgeKeyGenerator );
			this.edges = this.edgeMap.getArray();
			this.__edgeCheck = new Line3D( new Vec3D(), new Vec3D() );
			this.__uniqueEdgeID = 0;
		};

		proto.rebuildIndex = function(){
			//if vertices have moved / transformed a new vertexMap and edgeMap must be made
			//in order to have updated string keys of new positions
			//newVertexDictionary[{String}] = {Vertex}
			var newVertexMap = new internals.LinkedMap( vertexKeyGenerator );
			var newEdgeMap = new internals.LinkedMap( edgeKeyGenerator );

            var i = 0,
                arr = this.vertexMap.getArray();
            for(i=0; i<arr.length; i++){
				newVertexMap.put( arr[i], arr[i] );
			}

            arr = this.edgeMap.getArray();
            for(i=0; i<arr.length; i++){
				newEdgeMap.put( arr[i], arr[i] );
			}

			this.vertexMap = newVertexMap;
			this.vertices = newVertexMap.getArray();
			this.edgeMap = newEdgeMap;
			this.edges = newEdgeMap.getArray();
		};

		proto.removeEdge = function( edge ){
			edge.remove();
			var v = edge.a;
			if( v.edges.length === 0 ){
				this.vertexMap.remove( v );
			}
			v = edge.b;
			if( v.edges.length === 0 ){
				this.vertexMap.remove( v );
			}
            for(var i=0; i<edge.faces.length; i++){
                this.removeFace(edge.faces[i]);
            }
			var removed = this.edgeMap.remove( this.__edgeCheck.set( edge.a, edge.b ) );
            if(!removed){
                this.edgeMap.remove( this.__edgeCheck.set(edge.b, edge.a) );
            }
			if( removed !== edge ){
				throw new Error("Can't remove edge");
			}
		};

		proto.removeFace = function( face ){
			var i = this.faces.indexOf( face );
			if( i > -1 ){
				this.faces.splice( i, 1 );
			}

            i = 0;
            var edge;

            for(i=0; i<face.edges.length; i++){
                edge = face.edges[i];
                edge.faces.splice(edge.faces.indexOf(face), 1);
                if(edge.faces.length === 0){
                    this.removeEdge(edge);
                }
            }
		};

		//FIXME (FIXME in original java source)
		//TODO UNIT TEST .splice
		proto.removeUnusedVertices = function(){
			internals.each( this.vertices, function( vertex, i ){
				var isUsed = false;
				internals.each( this.faces, function( f ){
					if( f.a == vertex || f.b == vertex || f.c == vertex ){
						isUsed = true;
						return;
					}
				});
				if( !isUsed ){
					this.vertices.splice( i, 1 );
				}
			});
		};

		/**
		* @param {Vertex[] | Vertex{}} selection, array or object of Vertex's to remove
		*/
		proto.removeVertices = function( selection ){
			internals.each( selection, function( vertex ){
				//WingedEdgeVertex
				internals.each( vertex.edges, function( edge ){
					internals.each( edge.faces, function( face ){
						this.removeFace( face );
					});
				});
			});
		};

		//@param {Vec3D | WingedEdge} a or edge
		//@param {Vec3D | SubdivisionStrategy} b or strategy if edge supplied
		//@param {SubdivisionStrategy} [subDiv] or undefined
		proto.splitEdge = function( a, b, subDiv ){
			var edge, mid;
			if( arguments.length === 3 ){
				edge = this.edgeMap.get( this.__edgeCheck.set(a, b) );

                if(!edge){
                    this.edgeMap.get( this.__edgeCheck.set(b,a) );
                }

			} else if( arguments.length == 2 ){
				edge = a;
				subDiv = b;
			}
			mid = subDiv.computeSplitPoints( edge );
			this.splitFace( edge.faces[0], edge, mid);
			if( edge.faces.length > 1 ){
				this.splitFace( edge.faces[1], edge, mid);
			}
			this.removeEdge( edge );
		};
		//@param {WEFace} face,
		//@param {WingedEdge} edge,
		//@param {Vec3D[]} midPoints
		proto.splitFace = function( face, edge, midPoints ){
			var p, i, ec, prev, num, mid;
			for(i=0; i<3; i++){
				ec = face.edges[i];
				if( !ec.equals(edge) ){
					if( ec.a.equals(edge.a) || ec.a.equals(edge.b) ){
						p = ec.b;
					} else {
						p = ec.a;
					}
					break;
				}
			}
			num = midPoints.length;
			for(i=0; i<num; i++){
				mid = midPoints[i];
				if( i === 0 ){
					this.addFace( p, edge.a, mid, face.normal );
				} else {
					this.addFace( p, prev, mid, face.normal );
				}
				if( i === num-1 ){
					this.addFace( p, mid, edge.b, face.normal );
				}
				prev = mid;
			}
		};

		//@param {SubdivisionStrategy | Number} subDiv or minLength
		//@param {Number} [minLength] if also supplying subDiv
		proto.subdivide = function( subDiv, minLength ){
			if( arguments.length === 1 ){
				minLength = subDiv;
				subDiv = new MidpointSubdivision();
			}
			this.subdivideEdges( this.edges.slice(0), subDiv, minLength);
		};

		proto.subdivideEdges = function( origEdges, subDiv, minLength ){
			origEdges.sort( subDiv.getEdgeOrdering() );
			minLength *= minLength;
			var i=0, l = origEdges.length;
			for(i=0; i<l; i++){
				var e = origEdges[i];
				if( this.edges.indexOf( e ) > -1 ) {
					if( e.getLengthSquared() >= minLength ) {
						this.splitEdge( e, subDiv );
					}
				}
			}
		};

		proto.subdivideFaceEdges = function( faces, subDiv, minLength ){
			var fedges = [], i,j, f, e, fl, el;
			fl = this.faces.length;
			for(i=0; i<fl; i++){
				f = this.faces[i];
				el = f.edges.length;
				for(j=0; j<el; j++){
					e = f.edges[j];
					if( fedges.indexOf(e) < 0 ){
						fedges.push( e );
					}
				}
			}
			this.subdividEdges( fedges, subDiv, minLength );
		};

		proto.toString = function(){
			return "WETriangleMesh: " + this.name + " vertices: " + this.getNumVertices() + " faces: " + this.getNumFaces() + " edges:" + this.getNumEdges();
		};

		/**
		* Applies the given matrix transform to all mesh vertices. If the
		* updateNormals flag is true, all face normals are updated automatically,
		* however vertex normals still need a manual update.
		* @param {toxi.geom.Matrix4x4} matrix
		* @param {Boolean} [updateNormals]
		*/
		proto.transform = function( matrix, updateNormals ){
			if( updateNormals === undefined || updateNormals === null ){
				updateNormals = true;
			}
			for(var i=0, l = this.vertices.length; i<l; i++){
				matrix.applyToSelf( this.vertices[i] );
			}
			this.rebuildIndex();
			if( updateNormals ){
				this.computeFaceNormals();
			}
			return this;
		};

		proto.updateEdge = function( va, vb, face ){
			//dictionary key is va.toString() + vb.toString()
			//because Line3D toString would be different than WingedEdge toString()
			this.__edgeCheck.set( va, vb );
			var e = this.edgeMap.get( this.__edgeCheck );
            if(!e){
                //edge could be as b->a or a->b
                this.__edgeCheck.set(vb, va);
                e = this.edgeMap.get(this.__edgeCheck);
            }
			if( e !== undefined ){
				e.addFace( face );
			} else {
				e = new WingedEdge( va, vb, face, this.__uniqueEdgeID++ );
				this.edgeMap.put( e, e );
				va.addEdge( e );
				vb.addEdge( e );
			}
			face.addEdge( e );
		};
	}( TriangleMesh ));


	//Terrain
	(function( TriangleMesh ){
		var internals = require('../../internals'),
			mathUtils = require('../../math/mathUtils'),
			Interpolation2D = require('../../math/Interpolation2D'),
			Ray3D = require('../Ray3D'),
			TriangleIntersector = require('../TriangleIntersector'),
			Triangle3D = require('../Triangle3D'),
			IsectData3D = require('../IsectData3D'),
			Vec2D = require('../vectors').Vec2D,
			Vec3D = require('../vectors').Vec3D;
		/**
		* Constructs a new and initially flat terrain of the given size in the XZ
		* plane, centred around the world origin.
		*
		* @param {Number} width
		* @param {Number} depth
		* @param {toxi.geom.Vec2D | Number} scale
		*/
		Terrain = function(width, depth, scale){
			this.width = width;
			this._depth = depth;
			if( !internals.has.XY(scale) ){
				scale = new Vec2D(scale,scale);
			}
			this.setScale( scale );
			this.elevation = [];
			var i = 0,
				len = width * depth;
			for(i=0; i<len; i++){
				this.elevation[i] = 0;
			}

			this.__elevationLength = this.width * this._depth;
			this.vertices = [];
			var offset = new Vec3D(parseInt(this.width / 2,10), 0, parseInt(this._depth / 2,10)),
				scaleXZ = this.getScale().to3DXZ();
			i=0;
			for(var z = 0; z < this._depth; z++){
				for(var x = 0; x < this.width; x++){
					this.vertices[i++] = new Vec3D(x,0,z).subSelf(offset).scaleSelf(scaleXZ);
				}
			}
		};

		Terrain.prototype = {
			/**
			* @return number of grid cells along the Z axis.
			*/
			getDepth: function(){
				return this._depth;
			},
			getElevation: function(){
				return this.elevation;
			},
			/**
			* @param {Number} x
			* @param {Number} z
			* @return the elevation at grid point
			*/
			getHeightAtCell: function(x,z){
				//console.log("["+x+","+z+"]");
				return this.elevation[this._getIndex(x,z)];
			},
			/**
			* Computes the elevation of the terrain at the given 2D world coordinate
			* (based on current terrain scale).
			*
			* @param {Number} x scaled world coord x
			* @param {Number} z scaled world coord z
			* @return {Number} interpolated elevation
			*/
			getHeightAtPoint: function(x,z){
				var xx = x / this._scale.x + this.width * 0.5,
					zz = z / this._scale.y + this._depth * 0.5,
					y = 0,
					flxx = ~~x,
					flzz = ~~zz;

				if(xx >= 0 & xx < this.width && zz >= 0 && zz < this._depth){

					var x2 = ~~Math.min(xx + 1, this.width - 1),
						z2 = ~~Math.min(zz + 1, this._depth - 1);

					var	a = this.getHeightAtCell(flxx, flzz),
						b = this.getHeightAtCell(x2, flzz),
						c = this.getHeightAtCell(flxx, z2),
						d = this.getHeightAtCell(x2, z2);

					y = Interpolation2D.bilinear(xx,zz, flxx, flzz, x2, z2, a, b, c, d);
				}
				return y;
			},
			/**
			* Computes the array index for the given cell coords & checks if they're in
			* bounds. If not an {@link IndexOutOfBoundsException} is thrown.
			* @param {Number} x
			* @param {Number} z
			* @return {Number} array index
			*/
			_getIndex: function(x,z){
				var idx = z * this.width + x;
				if(idx < 0 || idx > this.__elevationLength){
					throw new Error("the given terrain cell is invalid: "+x+ ";"+z);
				}
				return idx;
			},
			/**
			 * @return {Vec2D} the scale
			 */
			getScale: function(){
				return this._scale;
			},

			getVertexAtCell: function(x,z){
				return this.vertices[this._getIndex(x,z)];
			},
			/**
			 * @return {Number} number of grid cells along X axis
			 */
			getWidth: function(){
				return this.width;
			},
			/**
			* Computes the 3D position (with elevation) and normal vector at the given
			* 2D location in the terrain. The position is in scaled world coordinates
			* based on the given terrain scale. The returned data is encapsulated in a
			* {@link toxi.geom.IsectData3D} instance.
			* @param {Number} x
			* @param {Number} z
			* @return {IsectData3D} intersection data parcel
			*/
			intersectAtPoint: function(x,z){
				var xx = x / this._scale.x + this.width * 0.5,
					zz = z / this._scale.y + this._depth * 0.5,
					isec = new IsectData3D();
				if(xx >= 0 && xx < this.width && zz >= 0 && zz < this._depth){
					var x2 = ~~Math.min(xx + 1, this.width - 1),
						z2 = ~~Math.min(zz + 1, this._depth - 1),
						flxx = ~~xx,
						flzz = ~~zz,

						a = this.getVertexAtCell(flxx,flzz),
						b = this.getVertexAtCell(x2, flzz),
						c = this.getVertexAtCell(x2,z2),
						d = this.getVertexAtCell(flxx,z2),
						r = new Ray3D(new Vec3D(x, 10000, z), new Vec3D(0, -1, 0)),
						i = new TriangleIntersector(new Triangle3D(a, b, d));

					if(i.intersectsRay(r)){
						isec = i.getIntersectionData();
					} else {
						i.setTriangle(new Triangle3D(b, c, d));
						i.intersectsRay(r);
						isec = i.getIntersectionData();
					}
				}
				return isec;
			},
			/**
			* Sets the elevation of all cells to those of the given array values.
			* @param {Array} elevation array of height values
			* @return itself
			*/
			setElevation: function(elevation){
				if(this.__elevationLength == elevation.length){
					for(var i = 0, len = elevation.length; i<len; i++){
						this.vertices[i].y = this.elevation[i] = elevation[i];
					}
				} else {
					throw new Error("the given elevation array size does not match terrain");
				}
				return this;
			},
			/**
			* Sets the elevation for a single given grid cell.
			* @param {Number} x
			* @param {Number} z
			* @param {Number} h new elevation value
			* @return itself
			*/
			setHeightAtCell: function(x,z,h){
				var index = this._getIndex(x,z);
				this.elevation[index] = h;
				this.vertices[index].y = h;
				return this;
			},
			setScale: function(scale){
				if(!internals.has.XY(scale) ){
					scale = new Vec2D(scale,scale);
				}
				this._scale = scale;
			},
			toMesh: function(){
				var opts = {
					mesh: undefined,
					minX: 0,
					minZ: 0,
					maxX: this.width,
					maxZ: this._depth
				};

				var v = this.vertices,
					w = this.width,
					d = this._depth;

				if(arguments.length == 1 && typeof arguments[0] == 'object'){
					//options object
					var args = arguments[0];
					opts.mesh = args.mesh || new TriangleMesh("terrain");
					opts.minX = args.minX || opts.minX;
					opts.minZ = args.minZ || opts.minZ;
					opts.maxX = args.maxX || opts.maxX;
					opts.maxZ = args.maxZ || opts.maxZ;
				} else if(arguments.length >= 5){
					opts.mesh = arguments[0];
					opts.minX = arguments[1];
					opts.minZ = arguments[2];
					opts.maxX  = arguments[3];
					opts.maxZ = arguments[4];
				}

				opts.mesh = opts.mesh || new TriangleMesh("terrain");
				opts.minX = mathUtils.clip(opts.minX, 0, w - 1);
				opts.maxX = mathUtils.clip(opts.maxX, 0, w);
				opts.minZ = mathUtils.clip(opts.minZ, 0, d-1);
				opts.maxZ = mathUtils.clip(opts.maxZ, 0, d);
				opts.minX++;
				opts.minZ++;


				for(var z = opts.minZ, idx = opts.minX * w; z < opts.maxZ; z++, idx += w){
					for(var x = opts.minX; x < opts.maxX; x++){
						opts.mesh.addFace(v[idx - w + x - 1], v[idx - w + x], v[idx + x - 1]);
						opts.mesh.addFace(v[idx - w + x], v[idx + x], v[idx + x - 1]);
					}
				}
				return opts.mesh;
			}
		};

	}( TriangleMesh ));


	//SurfaceMeshBuilder
	(function( TriangleMesh ){
		var Vec3D = require('../Vec3D'),
			Vec2D = require('../Vec2D');

		/**
		 * @class An extensible builder class for {@link TriangleMesh}es based on 3D surface
		 * functions using spherical coordinates. In order to create mesh, you'll need
		 * to supply a {@link SurfaceFunction} implementation to the builder.
		 * @member toxi
		 */
		SurfaceMeshBuilder = function(func) {
			this.func = func;
		};

		SurfaceMeshBuilder.prototype = {
			/*
				create a mesh from a surface,
				parameter options:
					1 - Object options
					1 - Number resolution
					3 - TriangleMesh mesh, Number resolution, Number size
					4 - TriangleMesh mesh, Number resolution, Number size, boolean isClosed
			*/
			createMesh: function() {
				var opts = {
					mesh: undefined,
					resolution: 0,
					size: 1,
					isClosed: true
				};
				if(arguments.length == 1){
					if(typeof arguments[0] == 'object'){ //options object
						var arg = arguments[0];
						//if a mesh was provided as an option, use it, otherwise make one
						opts.mesh = arg.mesh;
						opts.resolution = arg.res || arg.resoultion || 0;
						if(arg.size !== undefined){
							opts.size = arg.size;
						}
						if(arg.isClosed !== undefined){
							opts.isClosed = arg.isClosed;
						}
					} else { //resolution Number
						opts.resolution = arguments[0];
					}
				} else if(arguments.length > 2){
					opts.mesh = arguments[0];
					opts.resolution = arguments[1];
					opts.size = arguments[2];
					if(arguments.length == 4){
						opts.isClosed = arguments[3];
					}
				}
				var mesh = opts.mesh;
				if(mesh === undefined || mesh === null){
					mesh = new TriangleMesh();
				}

				var a = new Vec3D(),
					b = new Vec3D(),
					pa = new Vec3D(),
					pb = new Vec3D(),
					a0 = new Vec3D(),
					b0 = new Vec3D(),
					phiRes = this.func.getPhiResolutionLimit(opts.resolution),
					phiRange = this.func.getPhiRange(),
					thetaRes = this.func.getThetaResolutionLimit(opts.resolution),
					thetaRange = this.func.getThetaRange(),
					pres = 1.0 / phiRes, //(1 == opts.resolution % 2 ? opts.resolution - 0 : opts.resolution);
					tres = 1.0 / thetaRes,
					ires = 1.0 / opts.resolution,
					pauv = new Vec2D(),
					pbuv = new Vec2D(),
					auv = new Vec2D(),
					buv = new Vec2D();

				for (var p = 0; p < phiRes; p++) {
					var phi = p * phiRange * ires;
					var phiNext = (p + 1) * phiRange * ires;
					for (var t = 0; t <= thetaRes; t++) {
						var theta = t * thetaRange * ires;
						var func = this.func;
						a =	func.computeVertexFor(a, phiNext, theta).scaleSelf(opts.size);
						auv.set( t * tres, 1 - (p + 1) * pres);
						b = func.computeVertexFor(b, phi, theta).scaleSelf(opts.size);
						buv.set( t * tres, 1 - p * pres );
						if (b.equalsWithTolerance(a, 0.0001) ) {
							b.set(a);
						}
						if (t > 0) {
							if (t == thetaRes && opts.isClosed) {
								a.set(a0);
								b.set(b0);
							}
							mesh.addFace(pa, pb, a, pauv.copy(), pbuv.copy(), auv.copy());
							mesh.addFace(pb, b, a, pbuv.copy(), buv.copy(), auv.copy());
						} else {
							a0.set(a);
							b0.set(b);
						}
						pa.set(a);
						pb.set(b);
						pauv.set(auv);
						pbuv.set(buv);
					}
				}
				return mesh;
			},


			/**
			@return the function
			*/
			getFunction: function() {
				return this.func;
			},

			setFunction: function(func) {
				this.func = func;
			}
		};
	}( TriangleMesh ));

	exports.TriangleMesh = TriangleMesh;
	exports.WETriangleMesh = WETriangleMesh;
	exports.Terrain = Terrain;
	exports.SurfaceMeshBuilder = SurfaceMeshBuilder;



},{"../../internals":30,"../../math/Interpolation2D":44,"../../math/mathUtils":45,"../AABB":2,"../IsectData3D":6,"../Line3D":8,"../Matrix4x4":9,"../Quaternion":11,"../Ray3D":13,"../Sphere":15,"../Triangle3D":17,"../TriangleIntersector":18,"../Vec2D":19,"../Vec3D":20,"../vectors":29,"./Face":21,"./Vertex":23,"./WingedEdge":24,"./subdiv/MidpointSubdivision":27}],26:[function(require,module,exports){

	var EdgeLengthComparator = function(){};
	EdgeLengthComparator.prototype.compare = function( edge1, edge2 ){
		return -parseInt( edge1.getLengthSquared()-edge2.getLengthSquared(), 10);
	};
	module.exports = EdgeLengthComparator;

},{}],27:[function(require,module,exports){
var internals = require('../../../internals');
var SubdivisionStrategy = require('./SubdivisionStrategy');

	var MidpointSubdivison = function(){
		SubdivisionStrategy.call(this);
	};
	internals.extend( MidpointSubdivison, SubdivisionStrategy );
	MidpointSubdivison.prototype.computeSplitPoints = function( edge ){
		var mid = [];
		mid.push( edge.getMidPoint() );
		return mid;
	};

	module.exports = MidpointSubdivison;

},{"../../../internals":30,"./SubdivisionStrategy":28}],28:[function(require,module,exports){
var EdgeLengthComparator = require('./EdgeLengthComparator');

	var SubdivisionStrategy, proto;
	SubdivisionStrategy = function(){
		this._order = SubdivisionStrategy.DEFAULT_ORDERING;
	};
	SubdivisionStrategy.DEFAULT_ORDERING = new EdgeLengthComparator();
	proto = SubdivisionStrategy.prototype;

	proto.getEdgeOrdering = function(){
		return this._order.compare;
	};
	proto.setEdgeOrdering = function( order ){
		this._order = order;
	};

	module.exports = SubdivisionStrategy;


},{"./EdgeLengthComparator":26}],29:[function(require,module,exports){


	var mathUtils = require('../math/mathUtils');
	var has = require('../internals/has'),
		is = require('../internals/is');

	var hasXY = has.XY;
	var isRect = is.Rect;

	//modules defined within
	var Vec2D, Vec3D;

	/**
	@class a two-dimensional vector class
	*/
	Vec2D = function(a,b){
		if( hasXY(a) ){
			b = a.y;
			a = a.x;
		} else {
			a = a || 0;
			b = b || 0;
		}
		this.x = a;
		this.y = b;
	};

	Vec2D.Axis = {
		X: {
			getVector: function(){ return Vec2D.X_AXIS; },
			toString: function(){ return "Vec2D.Axis.X"; }
		},
		Y: {
			getVector: function(){ return Vec2D.Y_AXIS; },
			toString: function(){ return "Vec2D.Axis.Y"; }
		}
	};

	//private,
	var _getXY = (function(){
		//create a temp object to avoid creating garbage-collectable objects
		var temp = { x: 0, y: 0 };
		return function getXY(a,b) {
			if( a && typeof a.x === 'number' && typeof a.y === 'number' ){
				return a;
			} else {
				if(a !== undefined && b === undefined){
					b = a;
				}
				else if(a === undefined){ a = 0; }
				else if(b === undefined){ b = 0; }
			}
			temp.x = a;
			temp.y = b;
			return temp;
		};
	})();
	//public
	Vec2D.prototype = {

		abs: function() {
			this.x = Math.abs(this.x);
			this.y = Math.abs(this.y);
			return this;
		},

		add: function(a, b) {
			var v  = new Vec2D(a,b);
			v.x += this.x;
			v.y += this.y;
			return v;
		},

		/**
		 * Adds vector {a,b,c} and overrides coordinates with result.
		 *
		 * @param a
		 *				X coordinate
		 * @param b
		 *				Y coordinate
		 * @return itself
		 */
		addSelf: function(a,b) {
			var v = _getXY(a,b);
			this.x += v.x;
			this.y += v.y;
			return this;
		},

		angleBetween: function(v, faceNormalize) {
			if(faceNormalize === undefined){
				return Math.acos(this.dot(v));
			}
			var theta = (faceNormalize) ? this.getNormalized().dot(v.getNormalized()) : this.dot(v);
			return Math.acos(mathUtils.clipNormalized(theta));
		},

		//bisect() is in Vec2D_post.js

		/**
		 * Sets all vector components to 0.
		 *
		 * @return itself
		 */
		clear: function() {
			this.x = this.y = 0;
			return this;
		},

		compareTo: function(vec) {
			if (this.x == vec.x && this.y == vec.y) {
				return 0;
			}
			return this.magSquared() - vec.magSquared();
		},

		/**
		 * Forcefully fits the vector in the given rectangle.
		 *
		 * @param a
		 *		either a Rectangle by itself or the Vec2D min
		 * @param b
		 *		Vec2D max
		 * @return itself
		 */
		constrain: function(a,b) {
			if( hasXY( a ) && hasXY( b ) ){
				this.x = mathUtils.clip(this.x, a.x, b.x);
				this.y = mathUtils.clip(this.y, a.y, b.y);
			} else if( isRect( a ) ){
				this.x = mathUtils.clip(this.x, a.x, a.x + a.width);
				this.y = mathUtils.clip(this.y, a.y, a.y + a.height);
			}
			return this;
		},

		copy: function() {
			return new Vec2D(this);
		},

		cross: function(v) {
			return (this.x * v.y) - (this.y * v.x);
		},

		distanceTo: function(v) {
			if (v !== undefined) {
				var dx = this.x - v.x;
				var dy = this.y - v.y;
				return Math.sqrt(dx * dx + dy * dy);
			} else {
				return NaN;
			}
		},

		distanceToSquared: function(v) {
			if (v !== undefined) {
				var dx = this.x - v.x;
				var dy = this.y - v.y;
				return dx * dx + dy * dy;
			} else {
				return NaN;
			}
		},

		dot: function(v) {
			return this.x * v.x + this.y * v.y;
		},

		equals: function(obj) {
			if ( !hasXY( obj ) ) {
				return false;
			}
			return this.x == obj.x && this.y == obj.y;
		},

		equalsWithTolerance: function(v, tolerance) {
			if( !hasXY( v ) ){
				return false;
			}
			if (mathUtils.abs(this.x - v.x) < tolerance) {
				if (mathUtils.abs(this.y - v.y) < tolerance) {
					return true;
				}
			}
			return false;
		},

		floor: function() {
			this.x = mathUtils.floor(this.x);
			this.y = mathUtils.floor(this.y);
			return this;
		},

		/**
		 * Replaces the vector components with the fractional part of their current
		 * values
		 *
		 * @return itself
		 */
		frac: function() {
			this.x -= mathUtils.floor(this.x);
			this.y -= mathUtils.floor(this.y);
			return this;
		},

		getAbs: function() {
			return new Vec2D(this).abs();
		},

		getComponent: function(id) {
			if(typeof id == 'number'){
				id = (id === 0) ? Vec2D.Axis.X : Vec2D.Axis.Y;
			}
			if(id == Vec2D.Axis.X){
				return this.x;
			} else if(id == Vec2D.Axis.Y){
				return this.y;
			}
			return 0;
		},

		getConstrained: function(r) {
			return new Vec2D(this).constrain(r);
		},

		getFloored: function() {
			return new Vec2D(this).floor();
		},

		getFrac: function() {
			return new Vec2D(this).frac();
		},

		getInverted: function() {
			return new Vec2D(-this.x, -this.y);
		},

		getLimited: function(lim) {
			if (this.magSquared() > lim * lim) {
				return this.getNormalizedTo(lim);
			}
			return new Vec2D(this);
		},

		getNormalized: function() {
			return new Vec2D(this).normalize();
		},

		getNormalizedTo: function(len) {
			return new Vec2D(this).normalizeTo(len);
		},
		getPerpendicular: function() {
			return new Vec2D(this).perpendicular();
		},

		getReciprocal: function() {
			return new Vec2D(this).reciprocal();
		},

		getReflected: function(normal) {
			return new Vec2D(this).reflect(normal);
		},

		getRotated: function(theta) {
			return new Vec2D(this).rotate(theta);
		},

		getSignum: function() {
			return new Vec2D(this).signum();
		},

		heading: function() {
			return Math.atan2(this.y, this.x);
		},

		interpolateTo: function(v, f, s) {
			if(s === undefined){
				return new Vec2D(this.x + (v.x -this.x) * f, this.y + (v.y - this.y) * f);
			} else
			{
				return new Vec2D(s.interpolate(this.x,v.x,f),s.interpolate(this.y,v.y,f));
			}
		},

		/**
		 * Interpolates the vector towards the given target vector, using linear
		 * interpolation
		 *
		 * @param v
		 *				target vector
		 * @param f
		 *				interpolation factor (should be in the range 0..1)
		 * @return itself, result overrides current vector
		 */
		interpolateToSelf: function(v, f, s) {
			if(s === undefined) {
				this.x += (v.x - this.x) * f;
				this.y += (v.y - this.y) * f;
			} else {
				this.x = s.interpolate(this.x,v.x,f);
				this.y = s.interpolate(this.y,v.y,f);
			}
			return this;
		},

		invert: function() {
			this.x *= -1;
			this.y *= -1;
			return this;
		},

		isInCircle: function(sO,sR) {
			var d = this.sub(sO).magSquared();
			return (d <= sR * sR);
		},

		isInRectangle: function(rect) {
			if (this.x < rect.x || this.x > rect.x + rect.width) {
				return false;
			}
			if (this.y < rect.y || this.y > rect.y + rect.height) {
				return false;
			}
			return true;
		},

		isInTriangle: function(a,b,c) {
			var v1 = this.sub(a).normalize();
			var v2 = this.sub(b).normalize();
			var v3 = this.sub(c).normalize();

			var total_angles = Math.acos(v1.dot(v2));
			total_angles += Math.acos(v2.dot(v3));
			total_angles += Math.acos(v3.dot(v1));

			return (Math.abs(total_angles - mathUtils.TWO_PI) <= 0.005);
		},

		isMajorAxis: function(tol) {
			var ax = Math.abs(this.x);
			var ay = Math.abs(this.y);
			var itol = 1 - tol;
			if (ax > itol) {
				return (ay < tol);
			} else if (ay > itol) {
				return (ax < tol);
			}
			return false;
		},

		isZeroVector: function() {
			return Math.abs(this.x) < mathUtils.EPS && Math.abs(this.y) < mathUtils.EPS;
		},

		/**
		 * Adds random jitter to the vector in the range -j ... +j using the default
		 * {@link Random} generator of {@link MathUtils}.
		 *
		 * @param a
		 *				maximum x jitter or  Vec2D
		 * @param b
		 *				maximum y jitter or undefined
		 * @return itself
		 */
		jitter: function(a,b) {
			var v = _getXY(a,b);
			this.x += mathUtils.normalizedRandom() * v.x;
			this.y += mathUtils.normalizedRandom() * v.y;
			return this;
		},

		limit: function(lim) {
			if (this.magSquared() > lim * lim) {
				return this.normalize().scaleSelf(lim);
			}
			return this;
		},

		magnitude: function() {
			return Math.sqrt(this.x * this.x + this.y * this.y);
		},

		magSquared: function() {
			return this.x * this.x + this.y * this.y;
		},

		max: function(v) {
			return new Vec2D(mathUtils.max(this.x, v.x), mathUtils.max(this.y, v.y));
		},

		maxSelf: function(v) {
			this.x = mathUtils.max(this.x, v.x);
			this.y = mathUtils.max(this.y, v.y);
			return this;
		},

		min: function(v) {
			return new Vec2D(mathUtils.min(this.x, v.x), mathUtils.min(this.y, v.y));
		},

		minSelf: function(v) {
			this.x = mathUtils.min(this.x, v.x);
			this.y = mathUtils.min(this.y, v.y);
			return this;
		},

		/**
		 * Normalizes the vector so that its magnitude = 1
		 *
		 * @return itself
		 */
		normalize: function() {
			var mag = this.x * this.x + this.y * this.y;
			if (mag > 0) {
				mag = 1.0 / Math.sqrt(mag);
				this.x *= mag;
				this.y *= mag;
			}
			return this;
		},

		/**
		 * Normalizes the vector to the given length.
		 *
		 * @param len
		 *				desired length
		 * @return itself
		 */
		normalizeTo: function(len) {
			var mag = Math.sqrt(this.x * this.x + this.y * this.y);
			if (mag > 0) {
				mag = len / mag;
				this.x *= mag;
				this.y *= mag;
			}
			return this;
		},

		perpendicular: function() {
			var t = this.x;
			this.x = -this.y;
			this.y = t;
			return this;
		},

		positiveHeading: function() {
			var dist = Math.sqrt(this.x * this.x + this.y * this.y);
			if (this.y >= 0){
				return Math.acos(this.x / dist);
			}
			return (Math.acos(-this.x / dist) + mathUtils.PI);
		},

		reciprocal: function() {
			this.x = 1.0 / this.x;
			this.y = 1.0 / this.y;
			return this;
		},

		reflect: function(normal) {
			return this.set(normal.scale(this.dot(normal) * 2).subSelf(this));
		},

		/**
		 * Rotates the vector by the given angle around the Z axis.
		 *
		 * @param theta
		 * @return itself
		 */
		rotate: function(theta) {
			var co = Math.cos(theta);
			var si = Math.sin(theta);
			var xx = co * this.x - si * this.y;
			this.y = si * this.x + co * this.y;
			this.x = xx;
			return this;
		},

		roundToAxis: function() {
			if (Math.abs(this.x) < 0.5) {
				this.x = 0;
			} else {
				this.x = this.x < 0 ? -1 : 1;
				this.y = 0;
			}
			if (Math.abs(this.y) < 0.5) {
				this.y = 0;
			} else {
				this.y = this.y < 0 ? -1 : 1;
				this.x = 0;
			}
			return this;
		},

		scale: function(a, b) {
			var v = _getXY(a,b);
			return new Vec2D(this.x * v.x, this.y * v.y);
		},

		scaleSelf: function(a,b) {
			var v = _getXY(a,b);
			this.x *= v.x;
			this.y *= v.y;
			return this;
		},

		set: function(a,b){
			var v = _getXY(a,b);
			this.x = v.x;
			this.y = v.y;
			return this;
		},

		setComponent: function(id, val) {
			if(typeof id == 'number')
			{
				id = (id === 0) ? Vec2D.Axis.X : Vec2D.Axis.Y;
			}
			if(id === Vec2D.Axis.X){
				this.x = val;
			} else if(id === Vec2D.Axis.Y){
				this.y = val;
			}
			return this;
		},

		/**
		 * Replaces all vector components with the signum of their original values.
		 * In other words if a components value was negative its new value will be
		 * -1, if zero => 0, if positive => +1
		 *
		 * @return itself
		 */
		signum: function() {
			this.x = (this.x < 0 ? -1 : this.x === 0 ? 0 : 1);
			this.y = (this.y < 0 ? -1 : this.y === 0 ? 0 : 1);
			return this;
		},

		sub: function(a,b){
			var v = _getXY(a,b);
			return new Vec2D(this.x -v.x,this.y - v.y);
		},

		/**
		 * Subtracts vector {a,b,c} and overrides coordinates with result.
		 *
		 * @param a
		 *				X coordinate
		 * @param b
		 *				Y coordinate
		 * @return itself
		 */
		subSelf: function(a,b) {
			var v = _getXY(a,b);
			this.x -= v.x;
			this.y -= v.y;
			return this;
		},

		tangentNormalOfEllipse: function(eO,eR) {
			var p = this.sub(eO);

			var xr2 = eR.x * eR.x;
			var yr2 = eR.y * eR.y;

			return new Vec2D(p.x / xr2, p.y / yr2).normalize();
		},


		//to3D** methods are in Vec2D_post.js

		toArray: function() {
			return [this.x,this.y];
		},

		toCartesian: function() {
			var xx = (this.x * Math.cos(this.y));
			this.y = (this.x * Math.sin(this.y));
			this.x = xx;
			return this;
		},

		toPolar: function() {
			var r = Math.sqrt(this.x * this.x + this.y * this.y);
			this.y = Math.atan2(this.y, this.x);
			this.x = r;
			return this;
		},

		toString: function() {
			var s = "{x:"+this.x+", y:"+this.y+"}";
			return s;
		}

	};

	//these requires are in the functions because of a circular dependency
	Vec2D.prototype.bisect = function(b) {
		var diff = this.sub(b);
		var sum = this.add(b);
		var dot = diff.dot(sum);
		return new Vec3D(diff.x, diff.y, -dot / 2);
	};

	Vec2D.prototype.to3DXY = function() {
		return new Vec3D(this.x, this.y, 0);
	};

	Vec2D.prototype.to3DXZ = function() {
		return new Vec3D(this.x, 0, this.y);
	};

	Vec2D.prototype.to3DYZ = function() {
		return new Vec3D(0, this.x, this.y);
	};

	Vec2D.X_AXIS = new Vec2D(1,0);
	Vec2D.Y_AXIS = new Vec2D(0,1);
	Vec2D.ZERO = new Vec2D();
	Vec2D.MIN_VALUE = new Vec2D(Number.MIN_VALUE,Number.MIN_VALUE);
	Vec2D.MAX_VALUE = new Vec2D(Number.MAX_VALUE, Number.MAX_VALUE);
	Vec2D.fromTheta = function(theta){
		return new Vec2D(Math.cos(theta),Math.sin(theta));
	};
	Vec2D.max = function(a,b){
		return new Vec2D(mathUtils.max(a.x,b.x), mathUtils.max(a.y,b.y));
	};

	Vec2D.min = function(a, b) {
		return new Vec2D(mathUtils.min(a.x, b.x), mathUtils.min(a.y, b.y));
	};

	Vec2D.randomVector = function(rnd){
		var v = new Vec2D(Math.random()*2 - 1, Math.random() * 2 - 1);
		return v.normalize();
	};

	/**
	 * @member toxi
	 * @class Creates a new vector with the given coordinates. Coordinates will default to zero
	 * @param {Number} x the x
	 * @param {Number} y the y
	 * @param {Number} z the z
	 */
	Vec3D = function(x, y, z){
		if( has.XYZ( x ) ){
			this.x = x.x;
			this.y = x.y;
			this.z = x.z;
		} else if(x === undefined){ //if none or all were passed
			this.x = 0.0;
			this.y = 0.0;
			this.z = 0.0;
		} else {
			this.x = x;
			this.y = y;
			this.z = z;
		}
	};

	Vec3D.prototype = {

		abs: function(){
			this.x = Math.abs(this.x);
			this.y = Math.abs(this.y);
			this.z = Math.abs(this.z);
			return this;
		},

		add: function(a,b,c){
			if( has.XYZ( a ) ){
				return new Vec3D(this.x+a.x,this.y+a.y,this.z+a.z);
			}
			return new Vec3D(this.x+a,this.y+b,this.z+c);

		},
		/**
		 * Adds vector {a,b,c} and overrides coordinates with result.
		 *
		 * @param a
		 *				X coordinate
		 * @param b
		 *				Y coordinate
		 * @param c
		 *				Z coordinate
		 * @return itself
		 */
		addSelf: function(a,b,c){
			if(a !== undefined && b!== undefined && c !== undefined){
				this.x += a;
				this.y += b;
				this.z += c;
			} else {
				this.x += a.x;
				this.y += a.y;
				this.z += a.z;
			}
			return this;
		},

		angleBetween: function(vec, faceNormalizeBool){
			var theta;
			if(faceNormalizeBool){
				theta = this.getNormalized().dot(vec.getNormalized());
			} else {
				theta = this.dot(vec);
			}
			return Math.acos(theta);
		},


		clear: function(){
			this.x = this.y = this.z = 0;
			return this;
		},

		compareTo: function(vec){
			if(this.x == vec.x && this.y == vec.y && this.z == vec.z){
				return 0;
			}
			return (this.magSquared() - vec.magSqaured());
		},
		/**
		 * Forcefully fits the vector in the given AABB specified by the 2 given
		 * points.
		 *
		 * @param box_or_min
		 *		either the AABB box by itself, or your min Vec3D with accompanying max
		 * @param max
		 * @return itself
		 */
		constrain: function(box_or_min, max){
			var min;
			if( is.AABB( box_or_min ) ){
				max = box_or_min.getMax();
				min = box_or_min.getMin();
			} else {
				min = box_or_min;
			}
			this.x = mathUtils.clip(this.x, min.x, max.x);
			this.y = mathUtils.clip(this.y, min.y, max.y);
			this.z = mathUtils.clip(this.z, min.z, max.z);
			return this;
		},

		copy: function(){
			return new Vec3D(this);
		},

		cross: function(vec){
			return new Vec3D(this.y*vec.z - vec.y * this.z, this.z * vec.x - vec.z * this.x,this.x * vec.y - vec.x * this.y);
		},

		crossInto: function(vec, result){
			var vx = vec.x;
			var vy = vec.y;
			var vz = vec.z;
			result.x = this.y * vz - vy * this.z;
			result.y = this.z * vx-vz * this.x;
			result.z = this.x * vy - vx * this.y;
			return result;
		},
		/**
		 * Calculates cross-product with vector v. The resulting vector is
		 * perpendicular to both the current and supplied vector and overrides the
		 * current.
		 *
		 * @param v
		 *				the v
		 *
		 * @return itself
		 */
		crossSelf: function(vec){
			var cx = this.y * vec.z - vec.y * this.z;
			var cy = this.z * vec.x - vec.z * this.x;
			this.z = this.x * vec.y - vec.x * this.y;
			this.y = cy;
			this.x = cx;
			return this;
		},

		distanceTo: function(vec){
			if(vec !== undefined){
				var dx = this.x - vec.x;
				var dy = this.y - vec.y;
				var dz = this.z - vec.z;
				return Math.sqrt(dx * dx + dy * dy + dz * dz);
			}
			return NaN;
		},

		distanceToSquared: function(vec){
			if(vec !== undefined){
				var dx = this.x - vec.x;
				var dy = this.y - vec.y;
				var dz = this.z - vec.z;
				return dx * dx + dy*dy + dz*dz;
			}
			return NaN;
		},

		dot: function(vec){
			return this.x * vec.x + this.y * vec.y + this.z * vec.z;
		},

		equals: function(vec){
			if( has.XYZ( vec ) ){
				return this.x == vec.x && this.y == vec.y && this.z == vec.z;
			}
			return false;
		},

		equalsWithTolerance: function(vec,tolerance){
			if(Math.abs(this.x-vec.x) < tolerance){
				if(Math.abs(this.y - vec.y) < tolerance){
					if(Math.abs(this.z - vec.z) < tolerance){
						return true;
					}
				}
			}
			return false;
		},

		floor: function(){
			this.x = Math.floor(this.x);
			this.y = Math.floor(this.y);
			this.z = Math.floor(this.z);
			return this;
		},
		/**
		 * Replaces the vector components with the fractional part of their current
		 * values.
		 *
		 * @return itself
		 */
		frac: function(){
			this.x -= Math.floor(this.x);
			this.y -= Math.floor(this.y);
			this.z -= Math.floor(this.z);
			return this;
		},

		getAbs: function(){
			return new Vec3D(this).abs();
		},

		getComponent: function(id){
			if(typeof(id) == 'number'){
				if(id === Vec3D.Axis.X){
					id = 0;
				} else if(id === Vec3D.Axis.Y){
					id = 1;
				} else {
					id = 2;
				}
			}
			switch(id){
				case 0:
				return this.x;
				case 1:
				return this.y;
				case 2:
				return this.z;
			}
		},

		getConstrained: function(box){
			return new Vec3D(this).constrain(box);
		},

		getFloored: function(){
			return new Vec3D(this).floor();
		},

		getFrac: function(){
			return new Vec3D(this).frac();
		},

		getInverted: function(){
			return new Vec3D(-this.x,-this.y,-this.z);
		},

		getLimited: function(limit){
			if(this.magSquared() > limit * limit){
				return this.getNormalizedTo(limit);
			}
			return new Vec3D(this);
		},

		getNormalized: function(){
			return new Vec3D(this).normalize();
		},

		getNormalizedTo: function(length){
			return new Vec3D(this).normalizeTo(length);
		},

		getReciprocal: function(){
			return this.copy().reciprocal();
		},

		getReflected: function(normal){
			return this.copy().reflect(normal);
		},

		getRotatedAroundAxis: function(vec_axis,theta){
			return new Vec3D(this).rotateAroundAxis(vec_axis,theta);
		},

		getRotatedX: function(theta){
			return new Vec3D(this).rotateX(theta);
		},

		getRotatedY: function(theta){
			return new Vec3D(this).rotateY(theta);
		},

		getRotatedZ: function(theta){
			return new Vec3D(this).rotateZ(theta);
		},

		getSignum: function(){
			return new Vec3D(this).signum();
		},

		headingXY: function(){
			return Math.atan2(this.y,this.x);
		},

		headingXZ: function(){
			return Math.atan2(this.z,this.x);
		},

		headingYZ: function(){
			return Math.atan2(this.y,this.z);
		},

		immutable: function(){
			return this; //cant make read-only in javascript, implementing to avoid error
		},

		interpolateTo: function(v,f,s) {
			if(s === undefined){
				return new Vec3D(this.x + (v.x - this.x)*f, this.y + (v.y - this.y) * f, this.z + (v.z - this.z)*f);
			}
			return new Vec3D(s.interpolate(this.y,v.y,f),s.interpolate(this.y,v.y,f),s.interpolate(this.z,v.z,f));

		},

		interpolateToSelf: function(v,f,s){
			if(s === undefined){
				this.x += (v.x-this.x)*f;
				this.y += (v.y-this.y)*f;
				this.z += (v.z-this.z)*f;
			} else {
				this.x = s.interpolate(this.x,v.x,f);
				this.y = s.interpolate(this.y,v.y,f);
				this.z = s.interpolate(this.z,v.z,f);
			}
			return this;
		},

		invert: function(){
			this.x *= -1;
			this.y *= -1;
			this.z *= -1;
			return this;
		},

		isInAABB: function(box_or_origin, boxExtent){
			if(boxExtent) {
				var w = boxExtent.x;
				if(this.x < box_or_origin.x - w || this.x > box_or_origin.x + w){
					return false;
				}
				w = boxExtent.y;
				if(this.y < box_or_origin.y - w || this.y > box_or_origin.y + w){
					return false;
				}
				w = boxExtent.y;
				if(this.z < box_or_origin.z - w || this.y > box_or_origin.z + w){
					return false;
				}
			} else {
				var min = box_or_origin.getMin(),
					max = box_or_origin.getMax();
				if (this.x < min.x || this.x > max.x) {
					return false;
				}
				if (this.y < min.y || this.y > max.y) {
					return false;
				}
				if (this.z < min.z || this.z > max.z) {
					return false;
				}
			}
			return true;
		},

		isMajorAxis: function(tol){
			var ax = mathUtils.abs(this.x);
			var ay = mathUtils.abs(this.y);
			var az = mathUtils.abs(this.z);
			var itol = 1 - tol;
			if (ax > itol) {
				if (ay < tol) {
					return (az < tol);
				}
			} else if (ay > itol) {
				if (ax < tol) {
					return (az < tol);
				}
			} else if (az > itol) {
				if (ax < tol) {
					return (ay < tol);
				}
			}
			return false;
		},

		isZeroVector: function(){
			return Math.abs(this.x) < mathUtils.EPS && Math.abs(this.y) < mathUtils.EPS && mathUtils.abs(this.z) < mathUtils.EPS;
		},

		/**
		 * Add random jitter to the vector in the range -j ... +j using the default
		 * {@link Random} generator of {@link MathUtils}.
		 *
		 * @param j
		 *				the j
		 *
		 * @return the vec3 d
		 */
		jitter: function(a,b,c){
			if(b === undefined || c === undefined){
				b = c = a;
			}
			this.x += mathUtils.normalizedRandom()*a;
			this.y += mathUtils.normalizedRandom()*b;
			this.z += mathUtils.normalizedRandom()*c;
			return this;
		},

		limit: function(lim){
			if(this.magSquared() > lim * lim){
				return this.normalize().scaleSelf(lim);
			}
			return this;
		},

		magnitude: function(){
			return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
		},

		magSquared: function(){
			return this.x*this.x+this.y*this.y+this.z*this.z;
		},

		maxSelf: function(vec){
			this.x = Math.max(this.x,vec.x);
			this.y = Math.max(this.y,vec.y);
			this.z = Math.max(this.z,vec.z);
			return this;
		},

		minSelf: function(vec){
			this.x = Math.min(this.x,vec.x);
			this.y = Math.min(this.y,vec.y);
			this.z = Math.min(this.z,vec.z);
			return this;
		},

		modSelf: function(basex,basey,basez){
			if(basey === undefined || basez === undefined){
				basey = basez = basex;
			}
			this.x %= basex;
			this.y %= basey;
			this.z %= basez;
			return this;
		},

		normalize: function(){
			var mag = Math.sqrt(this.x*this.x + this.y * this.y + this.z * this.z);
			if(mag > 0) {
				mag = 1.0 / mag;
				this.x *= mag;
				this.y *= mag;
				this.z *= mag;
			}
			return this;
		},

		normalizeTo: function(length){
			var mag = Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);
			if(mag>0){
				mag = length / mag;
				this.x *= mag;
				this.y *= mag;
				this.z *= mag;
			}
			return this;
		},

		reciprocal: function(){
			this.x = 1.0 / this.x;
			this.y = 1.0 / this.y;
			this.z = 1.0 / this.z;
			return this;
		},

		reflect: function(normal){
			return this.set(normal.scale(this.dot(normal)*2).subSelf(this));
		},
		/**
		 * Rotates the vector around the giving axis.
		 *
		 * @param axis
		 *				rotation axis vector
		 * @param theta
		 *				rotation angle (in radians)
		 *
		 * @return itself
		 */
		rotateAroundAxis: function(vec_axis,theta){
			var ax = vec_axis.x,
				ay = vec_axis.y,
				az = vec_axis.z,
				ux = ax * this.x,
				uy = ax * this.y,
				uz = ax * this.z,
				vx = ay * this.x,
				vy = ay * this.y,
				vz = ay * this.z,
				wx = az * this.x,
				wy = az * this.y,
				wz = az * this.z,
				si = Math.sin(theta),
				co = Math.cos(theta);
			var xx = (ax * (ux + vy + wz) + (this.x * (ay * ay + az * az) - ax * (vy + wz)) * co + (-wy + vz) * si);
			var yy = (ay * (ux + vy + wz) + (this.y * (ax * ax + az * az) - ay * (ux + wz)) * co + (wx - uz) * si);
			var zz = (az * (ux + vy + wz) + (this.z * (ax * ax + ay * ay) - az * (ux + vy)) * co + (-vx + uy) * si);
			this.x = xx;
			this.y = yy;
			this.z = zz;
			return this;
		},
		/**
		 * Rotates the vector by the given angle around the X axis.
		 *
		 * @param theta
		 *				the theta
		 *
		 * @return itself
		 */
		rotateX: function(theta){
			var co = Math.cos(theta);
			var si = Math.sin(theta);
			var zz = co *this.z - si * this.y;
			this.y = si * this.z + co * this.y;
			this.z = zz;
			return this;
		},
		/**
		 * Rotates the vector by the given angle around the Y axis.
		 *
		 * @param theta
		 *				the theta
		 *
		 * @return itself
		 */
		rotateY:function(theta) {
			var co = Math.cos(theta);
			var si = Math.sin(theta);
			var xx = co * this.x - si * this.z;
			this.z = si * this.x + co * this.z;
			this.x = xx;
			return this;
		},

		/**
		 * Rotates the vector by the given angle around the Z axis.
		 *
		 * @param theta
		 *				the theta
		 *
		 * @return itself
		 */
		rotateZ:function(theta) {
			var co = Math.cos(theta);
			var si = Math.sin(theta);
			var xx = co * this.x - si * this.y;
			this.y = si * this.x + co * this.y;
			this.x = xx;
			return this;
		},

		/**
		 * Rounds the vector to the closest major axis. Assumes the vector is
		 * normalized.
		 *
		 * @return itself
		 */
		roundToAxis:function() {
			if (Math.abs(this.x) < 0.5) {
				this.x = 0;
			} else {
				this.x = this.x < 0 ? -1 : 1;
				this.y = this.z = 0;
			}
			if (Math.abs(this.y) < 0.5) {
				this.y = 0;
			} else {
				this.y = this.y < 0 ? -1 : 1;
				this.x = this.z = 0;
			}
			if (Math.abs(this.z) < 0.5) {
				this.z = 0;
			} else {
				this.z = this.z < 0 ? -1 : 1;
				this.x = this.y = 0;
			}
			return this;
		},

		scale:function(a,b,c) {
			if( has.XYZ( a ) ) { //if it was a vec3d that was passed
				return new Vec3D(this.x * a.x, this.y * a.y, this.z * a.z);
			}
			else if(b === undefined || c === undefined) { //if only one float was passed
				b = c = a;
			}
			return new Vec3D(this.x * a, this.y * b, this.z * c);
		},

		scaleSelf: function(a,b,c) {
			if( has.XYZ( a ) ){
				this.x *= a.x;
				this.y *= a.y;
				this.z *= a.z;
				return this;
			} else if(b === undefined || c === undefined) {
				b = c = a;
			}
			this.x *= a;
			this.y *= b;
			this.z *= c;
			return this;
		},

		set: function(a,b,c){
			if( has.XYZ( a ) )
			{
				this.x = a.x;
				this.y = a.y;
				this.z = a.z;
				return this;
			} else if(b === undefined || c === undefined) {
				b = c = a;
			}
			this.x = a;
			this.y = b;
			this.z = c;
			return this;
		},

		setXY: function(v){
			this.x = v.x;
			this.y = v.y;
			return this;
		},

		shuffle:function(nIterations){
			var t;
			for(var i=0;i<nIterations;i++) {
				switch(Math.floor(Math.random()*3)){
					case 0:
					t = this.x;
					this.x = this.y;
					this.z = t;
					break;

					case 1:
					t = this.x;
					this.x = this.z;
					this.z = t;
					break;

					case 2:
					t = this.y;
					this.y = this.z;
					this.z = t;
					break;
				}
			}
			return this;
		},
		/**
		 * Replaces all vector components with the signum of their original values.
		 * In other words if a components value was negative its new value will be
		 * -1, if zero => 0, if positive => +1
		 *
		 * @return itself
		 */
		signum: function(){
			this.x = (this.x < 0 ? -1 : this.x === 0 ? 0 : 1);
			this.y = (this.y < 0 ? -1 : this.y === 0 ? 0 : 1);
			this.z = (this.z < 0 ? -1 : this.z === 0 ? 0 : 1);
			return this;
		},

		sub: function(a,b,c){
			if( has.XYZ( a ) ){
				return	new Vec3D(this.x - a.x, this.y - a.y, this.z - a.z);
			} else if(b === undefined || c === undefined) {
				b = c = a;
			}
			return new Vec3D(this.x - a, this.y - b, this.z - c);
		},

		subSelf: function(a,b,c){
			if( has.XYZ( a ) ){
				this.x -= a.x;
				this.y -= a.y;
				this.z -= a.z;
				return this;
			}
			else if(b === undefined || c === undefined){
				b = c= a;
			}
			this.x -= a;
			this.y -= b;
			this.z -= c;
			return this;
		},

		to2DXY: function(){
			return new Vec2D(this.x,this.y);
		},

		to2DXZ: function(){
			return new Vec2D(this.x,this.z);
		},

		to2DYZ: function(){
			return new Vec2D(this.y,this.z);
		},

		toArray: function(){
			return [this.x,this.y,this.z];
		},

		toArray4:function(w){
			var ta = this.toArray();
			ta[3] = w;
			return ta;
		},

		toCartesian: function(){
			var a = (this.x * Math.cos(this.z));
			var xx = (a * Math.cos(this.y));
			var yy = (this.x * Math.sin(this.z));
			var zz = (a * Math.sin(this.y));
			this.x = xx;
			this.y = yy;
			this.z = zz;
			return this;
		},

		toSpherical: function(){
			var xx = Math.abs(this.x) <= mathUtils.EPS ? mathUtils.EPS : this.x;
			var zz = this.z;

			var radius = Math.sqrt((xx * xx) + (this.y * this.y) + (zz * zz));
			this.z = Math.asin(this.y / radius);
			this.y = Math.atan(zz / xx) + (xx < 0.0 ? Math.PI : 0);
			this.x = radius;
			return this;
		},

		toString: function(){
			return "[ x: "+this.x+ ", y: "+this.y+ ", z: "+this.z+"]";
		}
	};
	/**
	 * Defines vector with all coords set to Float.MIN_VALUE. Useful for
	 * bounding box operations.
	*/
	Vec3D.MIN_VALUE = new Vec3D(Number.MIN_VALUE,Number.MIN_VALUE,Number.MIN_VALUE);
	/**
	 * Defines vector with all coords set to Float.MAX_VALUE. Useful for
	 * bounding box operations.
	*/
	Vec3D.MAX_VALUE = new Vec3D(Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE);
	/**
	 * Creates a new vector from the given angle in the XY plane. The Z
	 * component of the vector will be zero.
	 *
	 * The resulting vector for theta=0 is equal to the positive X axis.
	 *
	 * @param theta
	 *				the theta
	 *
	 * @return new vector in the XY plane
	 */
	Vec3D.fromXYTheta = function(theta) {
		return new Vec3D(Math.cos(theta),Math.sin(theta),0);
	};
	/**
	 * Creates a new vector from the given angle in the XZ plane. The Y
	 * component of the vector will be zero.
	 *
	 * The resulting vector for theta=0 is equal to the positive X axis.
	 *
	 * @param theta
	 *				the theta
	 *
	 * @return new vector in the XZ plane
	 */
	Vec3D.fromXZTheta = function(theta) {
			return new Vec3D(Math.cos(theta), 0, Math.sin(theta));
	};

	/**
	 * Creates a new vector from the given angle in the YZ plane. The X
	 * component of the vector will be zero.
	 *
	 * The resulting vector for theta=0 is equal to the positive Y axis.
	 *
	 * @param theta
	 *				the theta
	 *
	 * @return new vector in the YZ plane
	 */
	Vec3D.fromYZTheta = function(theta) {
		return new Vec3D(0, Math.cos(theta), Math.sin(theta));
	};

	/**
	 * Constructs a new vector consisting of the largest components of both
	 * vectors.
	 *
	 * @param b
	 *				the b
	 * @param a
	 *				the a
	 *
	 * @return result as new vector
	 */
	Vec3D.max = function(a, b) {
		return new Vec3D(Math.max(a.x, b.x), Math.max(a.y,b.y), Math.max(a.z, b.z));
	};

	/**
	 * Constructs a new vector consisting of the smallest components of both
	 * vectors.
	 *
	 * @param b
	 *				comparing vector
	 * @param a
	 *				the a
	 *
	 * @return result as new vector
	 */
	Vec3D.min = function(a,b) {
		return new Vec3D(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
	};


	/**
	 * Static factory method. Creates a new random unit vector using the Random
	 * implementation set as default for the {@link MathUtils} class.
	 *
	 * @return a new random normalized unit vector.
	 */

	Vec3D.randomVector = function() {
		var v = new Vec3D(Math.random()*2 - 1, Math.random() * 2 -1, Math.random()* 2 - 1);
		return v.normalize();
	};
	Vec3D.ZERO = new Vec3D(0,0,0);
	Vec3D.X_AXIS = new Vec3D(1,0,0);
	Vec3D.Y_AXIS = new Vec3D(0,1,0);
	Vec3D.Z_AXIS = new Vec3D(0,0,1);
	Vec3D.Axis = {
		X: {
			getVector: function(){
				return Vec3D.X_AXIS;
			},
			toString: function(){
				return "Vec3D.Axis.X";
			}
		},
		Y: {
			getVector: function(){
				return Vec3D.Y_AXIS;
			},
			toString: function(){
				return "Vec3D.Axis.Y";
			}
		},
		Z: {
			getVector: function(){
				return Vec3D.Z_AXIS;
			},
			toString: function(){
				return "Vec3D.Axis.Z";
			}
		}
	};

	exports.Vec2D = Vec2D;
	exports.Vec3D = Vec3D;


},{"../internals/has":37,"../internals/is":38,"../math/mathUtils":45}],30:[function(require,module,exports){

/**
 * @namespace contains helper functions used internally
 * THESE MODULES ARE NOT ALLOWED TO HAVE DEPENDENCIES OUTSIDE
 * THE `internals` PACKAGE
 */

//do type-tests to detect properties on objects
exports.is = require('./internals/is');
//test if objects have properties
exports.has = require('./internals/has');
//extend the prototype of a class
exports.extend = require('./internals/extend');
exports.each = require('./internals/each');
exports.bind = require('./internals/bind');
exports.keys = require('./internals/keys');
exports.values = require('./internals/values');
exports.filter = require('./internals/filter');
//receives an object of properties to set on source object
exports.mixin = require('./internals/mixin');
//imitates java-style Iterator
exports.Iterator = require('./internals/Iterator');
//used for keeping HashMap-like collections
exports.LinkedMap = require('./internals/LinkedMap');
//simport sort comparator for numbers
exports.numberComparator = require('./internals/numberComparator');
exports.removeItemFrom = require('./internals/removeItemFrom');



},{"./internals/Iterator":31,"./internals/LinkedMap":32,"./internals/bind":33,"./internals/each":34,"./internals/extend":35,"./internals/filter":36,"./internals/has":37,"./internals/is":38,"./internals/keys":39,"./internals/mixin":40,"./internals/numberComparator":41,"./internals/removeItemFrom":42,"./internals/values":43}],31:[function(require,module,exports){
var is = require('./is');
	//imitate the basic functionality of a Java Iterator
    var ArrayIterator = function(collection){
        this.__it = collection.slice(0);
    };
    ArrayIterator.prototype = {
        hasNext: function(){
            return this.__it.length > 0;
        },
        next: function(){
            return this.__it.shift();
        }
    };
    var ObjectIterator = function(object){
        this.__obj = {};
        this.__keys = [];
        for(var prop in object){
            this.__obj[prop] = object[prop];
            this.__keys.push(prop);
        }
        this.__it = new ArrayIterator(this.__keys);
    };
    ObjectIterator.prototype = {
        hasNext: function(){
            return this.__it.hasNext();
        },
        next: function(){
            var key = this.__it.next();
            return this.__obj[key];
        }
    };

    var Iterator = function(collection){
        if(is.array(collection)){
            return new ArrayIterator(collection);
        }
        return new ObjectIterator(collection);
    };

    module.exports = Iterator;


},{"./is":38}],32:[function(require,module,exports){
var each = require('./each');
    // {Function} keyGeneratorFunction - key to use to return the identifier
    var LinkedMap = function( keyGeneratorFunction ){
        this.__list = [];
        this.__map = {};
        if( typeof keyGeneratorFunction === 'function' ){
            this.generateKey = keyGeneratorFunction;
        }
    };



    LinkedMap.prototype = {
        each: function( fn ){
            each(this.__map, fn);
        },
        get: function( id_or_val ){
            var result = this.__map[id_or_val];

            if( result === undefined ){
                id_or_val = this.generateKey( id_or_val );
                result = this.__map[id_or_val];
            }
            return result;
        },
        generateKey: function( key ){ return key.toString(); },
        getArray: function(){
            return this.__list;
        },
        has: function( id_or_val ){
            var self = this;
            var _has = function( id ){
                return ( self.__map[ id ] !== undefined );
            };
            if( _has( id_or_val ) ){
                return true;
            }

            if(this.__map[id]){
                return true;
            }

            return this.__map[this.generateKey( id_or_val )];
        },
        put: function( id, val ){
            id = this.generateKey( id );
            this.__map[id] = val;
            this.__list.push( val );
        },
        remove: function( val ){
            val = this.get( val );
            var id = this.generateKey(val);
            delete this.__map[id];
            return this.__list.splice( this.__list.indexOf(val), 1)[0];
        },
        size: function(){
            return this.__list.length;
        },
        values: function(){
            return this.__list.slice(0);
        }
    };

    module.exports = LinkedMap;


},{"./each":34}],33:[function(require,module,exports){

    //bind a function to a scope
    var ctor = {};
    module.exports = function(func, context) {
        var args, bound;
        var FP = Function.prototype;
        var slice = Array.prototype.slice;
        if (func.bind === FP.bind && FP.bind) return FP.bind.apply(func, slice.call(arguments, 1));
        args = slice.call(arguments, 2);
        return bound = function() {
            if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
            ctor.prototype = func.prototype;
            var self = new ctor();
            ctor.prototype = null;
            var result = func.apply(self, args.concat(slice.call(arguments)));
            if (Object(result) === result) return result;
            return self;
        };
    };


},{}],34:[function(require,module,exports){

    //from Underscore.js
    //(c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
    //basic forEach, use native implementation is available
    var breaker = {};
    module.exports = function(obj, iterator, context) {
        if (obj == null) return;
        if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
            }
        } else {
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) return;
                }
            }
        }
    };


},{}],35:[function(require,module,exports){

    module.exports = function(childClass,superClass){
        if(typeof childClass !== 'function'){
            throw Error("childClass was not function, possible circular: ", childClass);
        } else if( typeof superClass !== 'function'){
            throw Error("superClass was not function, possible circular: ", superClass);
        }
        childClass.prototype = Object.create( superClass.prototype );//new superClass();
        childClass.constructor = childClass;
        childClass.prototype.parent = superClass.prototype;
    };


},{}],36:[function(require,module,exports){

    module.exports = function(obj, iterator, context) {
        var results = [];
        if (obj == null) return results;
        if (Array.prototype.filter && obj.filter === Array.prototype.filter) return obj.filter(iterator, context);
        exports.each(obj, function(value, index, list) {
            if (iterator.call(context, value, index, list)) results[results.length] = value;
        });
        return results;
    };


},{}],37:[function(require,module,exports){


    var all = function(subject,properties){
        if(subject === undefined || typeof subject != 'object'){
            return false;
        }
        var i = 0,
            len = properties.length,
            prop;
        for(i = 0; i < len; i++){
            prop = properties[i];
            if(!(prop in subject)){
                return false;
            }
        }
        return true;
    };

    exports.property = function(obj, key) {
        return hasOwnProperty.call(obj, key);
    };
    exports.all = all;
    exports.typedArrays = function(){
        return typeof Int32Array !== 'undefined' && typeof Float32Array !== 'undefined' && typeof Uint8Array !== 'undefined';
    };
    exports.XY = function( a ){ return a && typeof a.x === 'number' && typeof a.y === 'number'; };
	exports.XYZ = function( a ){ return a && typeof a.x === 'number' && typeof a.y === 'number' && typeof a.z === 'number'; };
	exports.XYWidthHeight = function( a ){
        return a && typeof a.x === 'number' && typeof a.y === 'number' && typeof a.width === 'number' && typeof a.height === 'number';
    };


},{}],38:[function(require,module,exports){
var has = require('./has');

    var apply = function(properties){
        return function( o ){
            return has.all(o, properties);
        };
    };

    exports.Array = Array.isArray || function(a){
        return a.toString() == '[object Array]';
    };
    exports.Object = function(a){
        return typeof a === 'object';
    };
    exports.undef = function(a){
        return a === void 0;
    };
    //determines if a value is undefined or null
    exports.existy = function(a){
        return a != null;
    };
    exports.String = function(a){
        return typeof a === 'string';
    };
    exports.Number = function(a){
        return typeof a === 'number';
    };
    exports.Function = function(a){
        return typeof a === 'function';
    };
	exports.AABB = apply(['setExtent','getNormalForPoint']);
    exports.ColorGradient = apply(['gradient','interpolator','maxDither','addColorAt','calcGradient']);
    exports.ColorList = apply(['add','addAll','adjustBrightness','adjustSaturation']);
    exports.ColorRange = apply(['add', 'addAlphaRange','addBrightnessRange','addHueRange']);
    exports.Circle = apply(['getCircumference','getRadius','intersectsCircle']);
    exports.FloatRange = apply(['min','max','adjustCurrentBy','getMedian']);
    exports.Hue = apply(['getHue','isPrimary']);
	exports.Line2D = apply(['closestPointTo','intersectLine','getLength']);
	exports.Matrix4x4 = apply(['identity', 'invert', 'setFrustrum']);
	exports.Rect = apply(['x','y','width','height','getArea','getCentroid','getDimensions']);
	exports.Sphere = apply(['x','y','z','radius','toMesh']);
    exports.ScaleMap = apply(['mapFunction','setInputRange','setOutputRange','getMappedValueFor']);
	exports.TColor = apply(['rgb','cmyk','hsv']);
	exports.ParticleBehavior = apply(['applyBehavior','configure']);
	exports.VerletParticle2D = apply(['x','y','weight']);


},{"./has":37}],39:[function(require,module,exports){

    module.exports = Object.keys || function(obj) {
        if (obj !== Object(obj)) throw new TypeError('Invalid object');
        var keys = [];
        for (var key in obj) if (exports.has(obj, key)) keys.push(key);
        return keys;
    };


},{}],40:[function(require,module,exports){
var each = require('./each');
    //basic mixin function, copy over object properties to provided object
    module.exports = function(destination,source){
        each(source,function(val,key){
            destination[key] = val;
        });
        return destination;
    };


},{"./each":34}],41:[function(require,module,exports){

    module.exports = function(f1,f2){
        if(f1 == f2) return 0;
        if(f1 < f2) return -1;
        if(f1 > f2) return 1;
    };


},{}],42:[function(require,module,exports){

    module.exports = function(item,array){
        var index = array.indexOf(item);
        if(index > -1){
            return array.splice(index,1);
        }
        return undefined;
    };


},{}],43:[function(require,module,exports){
var has = require('./has');
    module.exports = function(obj) {
        var values = [];
        for (var key in obj) if (has.property(obj, key)) values.push(obj[key]);
        return values;
    };


},{"./has":37}],44:[function(require,module,exports){
var internals = require('../internals');

    /**
    * @class Implementations of 2D interpolation functions (currently only bilinear).
    * @member toxi
    * @static
    */
    var Interpolation2D = {};
    /**
    * @param {Number} x
    *            x coord of point to filter (or Vec2D p)
    * @param {Number} y
    *            y coord of point to filter (or Vec2D p1)
    * @param {Number} x1
    *            x coord of top-left corner (or Vec2D p2)
    * @param {Number} y1
    *            y coord of top-left corner
    * @param {Number} x2
    *            x coord of bottom-right corner
    * @param {Number} y2
    *            y coord of bottom-right corner
    * @param {Number} tl
    *            top-left value
    * @param {Number} tr
    *            top-right value (do not use if first 3 are Vec2D)
    * @param {Number} bl
    *            bottom-left value (do not use if first 3 are Vec2D)
    * @param {Number} br
    *            bottom-right value (do not use if first 3 are Vec2D)
    * @return {Number} interpolated value
    */
    Interpolation2D.bilinear = function(_x, _y, _x1,_y1, _x2, _y2, _tl, _tr, _bl, _br) {
        var x,y,x1,y1,x2,y2,tl,tr,bl,br;
        if( internals.has.XY( _x ) ) //if the first 3 params are passed in as Vec2Ds
        {
            x = _x.x;
            y = _x.y;

            x1 = _y.x;
            y1 = _y.y;

            x2 = _x1.x;
            y2 = _x1.y;

            tl = _y1;
            tr = _x2;
            bl = _y2;
            br = _tl;
        } else {
            x = _x;
            y = _y;
            x1 = _x1;
            y1 = _y1;
            x2 = _x2;
            y2 = _y2;
            tl = _tl;
            tr = _tr;
            bl = _bl;
            br = _br;
        }
        var denom = 1.0 / ((x2 - x1) * (y2 - y1));
        var dx1 = (x - x1) * denom;
        var dx2 = (x2 - x) * denom;
        var dy1 = y - y1;
        var dy2 = y2 - y;
        return (tl * dx2 * dy2 + tr * dx1 * dy2 + bl * dx2 * dy1 + br* dx1 * dy1);
    };

    module.exports = Interpolation2D;


},{"../internals":30}],45:[function(require,module,exports){

    /**
    * @class
    * @static
    * @member toxi
    * @description math utilities
    */
    var MathUtils = {};
    MathUtils.SQRT2 = Math.sqrt(2);
    MathUtils.SQRT3 = Math.sqrt(3);
    MathUtils.LOG2 = Math.log(2);
    MathUtils.PI = 3.14159265358979323846;

    /**
    * The reciprocal of PI: (1/PI)
    */
    MathUtils.INV_PI = 1.0 / MathUtils.PI;
    MathUtils.HALF_PI = MathUtils.PI / 2;
    MathUtils.THIRD_PI = MathUtils.PI / 3;
    MathUtils.QUARTER_PI = MathUtils.PI / 4;
    MathUtils.TWO_PI = MathUtils.PI * 2;
    MathUtils.THREE_HALVES_PI = MathUtils.TWO_PI - MathUtils.HALF_PI;
    MathUtils.PI_SQUARED = MathUtils.PI * MathUtils.PI;

    /**
    * Epsilon value
    */
    MathUtils.EPS = 1.1920928955078125E-7;

    /**
    * Degrees to radians conversion factor
    */
    MathUtils.DEG2RAD = MathUtils.PI / 180;

    /**
    * Radians to degrees conversion factor
    */
    MathUtils.RAD2DEG = 180 / MathUtils.PI;
    MathUtils.SHIFT23 = 1 << 23;
    MathUtils.INV_SHIFT23 = 1.0 / MathUtils.SHIFT23;
    MathUtils.SIN_A = -4.0 / (MathUtils.PI * MathUtils.PI);
    MathUtils.SIN_B = 4.0 / MathUtils.PI;
    MathUtils.SIN_P = 9.0 / 40;
    MathUtils.abs = Math.abs;
    /**
    * Rounds up the value to the nearest higher power^2 value.
    *
    * @param x
    * @return power^2 value
    */
    MathUtils.ceilPowerOf2 = function(x) {
        var pow2 = 1;
        while (pow2 < x) {
            pow2 <<= 1;
        }
        return pow2;
    };

    MathUtils.clip = function(a, _min, _max) {
        return a < _min ? _min : (a > _max ? _max : a);
    };
    /**
    * Clips the value to the 0.0 .. 1.0 interval.
    *
    * @param a
    * @return clipped value
    * @since 0012
    */
    MathUtils.clipNormalized = function(a) {
        if (a < 0) {
            return 0;
        } else if (a > 1) {
            return 1;
        }
        return a;
    };

    MathUtils.cos = Math.cos;

    MathUtils.degrees = function(radians) {
        return radians * MathUtils.RAD2DEG;
    };

    /**
    * Fast cosine approximation.
    *
    * @param x
    *            angle in -PI/2 .. +PI/2 interval
    * @return cosine
    */
    MathUtils.fastCos = function(x) {
        return MathUtils.fastSin(x + ((x > MathUtils.HALF_PI) ? -MathUtils.THREE_HALVES_PI : MathUtils.HALF_PI));
    };

    /**
    * Fast sine approximation.
    *
    * @param x
    *            angle in -PI/2 .. +PI/2 interval
    * @return sine
    */
    MathUtils.fastSin = function(x) {
        x = MathUtils.SIN_B * x + MathUtils.SIN_A * x * Math.abs(x);
        return MathUtils.SIN_P * (x * Math.abs(x) - x) + x;
    };

    MathUtils.flipCoin = function(rnd) {
        return Math.random() < 0.5;
    };

    /**
    * This method is a *lot* faster than using (int)Math.floor(x).
    *
    * @param x
    *            value to be floored
    * @return floored value as integer
    */

    MathUtils.floor = function(x) {
        var y = ~~(x);
        if (x < 0 && x != y) {
            y--;
        }
        return y;
    };

    /**
    * Rounds down the value to the nearest lower power^2 value.
    *
    * @param x
    * @return power^2 value
    */
    MathUtils.floorPowerOf2 = function(x) {
        return ~~( Math.pow(2, parseInt((Math.log(x) / MathUtils.LOG2),10)) );
    };

    MathUtils.max =  function(a, b, c) {
        if(c===undefined){
            return Math.max(a,b);
        }
        return (a > b) ? ((a > c) ? a : c) : ((b > c) ? b : c);
    };

    MathUtils.min = function(a, b, c) {
        if(c===undefined){
            return Math.min(a,b);
        }
        return (a < b) ? ((a < c) ? a : c) : ((b < c) ? b : c);
    };

    /**
    * Returns a random number in the interval -1 .. +1.
    *
    * @return random float
    */
    MathUtils.normalizedRandom = function() {
        return Math.random() * 2 - 1;
    };

    MathUtils.radians = function(degrees) {
        return degrees * MathUtils.DEG2RAD;
    };

    MathUtils.random = function(rand,min,max) {
        //one param
        if( arguments.length === 1 ){
            return Math.random() * arguments[0];
        } else if(arguments.length == 2) {
            //min and max
            max = min;
            min = rand;
            rand = Math.random;
        }
        if(!min && !max) {
            return Math.random();
        } else if(!max){
            //if only one is provided, then thats actually the max
            max = min;
            return rand()*max;
        }
        return rand() * (max - min) + min;
    };

    MathUtils.reduceAngle = function(theta) {
        theta %= MathUtils.TWO_PI;
        if (Math.abs(theta) > MathUtils.PI) {
            theta = theta - MathUtils.TWO_PI;
        }
        if (Math.abs(theta) > MathUtils.HALF_PI) {
            theta = MathUtils.PI - theta;
        }
        return theta;
    };

    MathUtils.sign = function(x) {
        return x < 0 ? -1 : (x > 0 ? 1 : 0);
    };

    MathUtils.sin = function(theta) {
        theta = MathUtils.reduceAngle(theta);
        if (Math.abs(theta) <= MathUtils.QUARTER_PI) {
            return MathUtils.fastSin(theta);
        }
        return MathUtils.fastCos(MathUtils.HALF_PI - theta);
    };

    module.exports = MathUtils;




},{}],46:[function(require,module,exports){


var VerletParticle2D = require('./VerletParticle2D'),
	VerletSpring2D = require('./VerletSpring2D');

/**
* Utility builder/grouping/management class to connect a set of particles into
* a physical string/thread. Custom spring types can be used by subclassing this
* class and overwriting the
* {@link #createSpring(VerletParticle2D, VerletParticle2D, float, float)}
method.
*/

 /**
  Construct a ParticleString2D,
  parameter options:
  1 - options object
  3 - VerletPhysics2D physics, Array<VerletParticle2D> plist, Number strength
  6 - VerletPhysics2D physic, Vec2D pos, Vec2D step, Number num, Number mass, Number strength
  */

var	ParticleString2D = function(){
	var opts = {
		physics: undefined,
		plist: undefined,
		pos: undefined,
		step: undefined,
		num: undefined,
		mass: undefined,
		strength: undefined
	},
	is6ParamConstructor = false;
	if(arguments.length === 0){
		throw new Error("Incorrect Parameters");
	} else if(arguments.length == 1){ //options object
		var arg = arguments[0];
		for(var prop in arg){
			opts[prop] = arg[prop];
		}
	} else {
		opts.physics = arguments[0];
		if(arguments.length == 6){
			opts.pos = arguments[1];
			opts.step = arguments[2];
			opts.num = arguments[3];
			opts.mass = arguments[4];
			opts.strength = arguments[5];
		} else {
			opts.plist = arguments[1];
			opts.strength = arguments[2];
		}
	}
	if(opts.num !== undefined && opts.pos !== undefined && opts.step !== undefined && opts.mass !== undefined){
		is6ParamConstructor = true;
	}
	if(!is6ParamConstructor && opts.plist === undefined){
		throw new Error("Incorrect Parameters, please supply plist or num, pos, step & mass");
	}


	this.physics = opts.physics;
	this.links = [];

	var prev,
		p,
		s,
		strength,
		i = 0;


	if(is6ParamConstructor){
		var pos = opts.pos.copy(),
			step = opts.step,
			mass = opts.mass,
			len = step.magnitude();
		this.particles = [];
		strength = opts.strength;

		for(i = 0; i < opts.num; i++){
			p = new VerletParticle2D(pos.copy(),mass);
			this.particles.push(p);
			this.physics.particles.push(p);
			if(prev !== undefined){
				s = this.createSpring(prev,p,len,strength);
				this.links.push(s);
				this.physics.addSpring(s);
			}
			prev = p;
			pos.addSelf(step);
		}
	} else {
		strength = opts.strength;
		this.particles = opts.plist || [];


		for(i = 0; i < this.particles.length; i++){
			p = this.particles[i];
			this.physics.addParticle(p);
			if(prev !== undefined){
				s = this.createSpring(prev,p,prev.distanceTo(p),strength);
				this.links.push(s);
				this.physics.addSpring(s);
			}
			prev = p;
		}
	}
 };
ParticleString2D.prototype = {
	clear: function(){
		for(var i = 0, len = this.links.length; i < len; i++){
			this.physics.removeSpringElements(this.links[i]);
		}
		this.particles = [];
		this.links = [];
	},
	createSpring: function(a,b,len,strength){
		return new VerletSpring2D(a,b,len,strength);
	},

	getHead: function(){
		return this.particles[0];
	},

	getNumParticles: function(){
		return this.particles.length;
	},

	getTail: function(){
		return this.particles[this.particles.length-1];
	}
};

module.exports = ParticleString2D;


},{"./VerletParticle2D":48,"./VerletSpring2D":50}],47:[function(require,module,exports){


var internals = require('../internals'),
    VerletSpring2D = require('./VerletSpring2D');

var VerletConstrainedSpring2D = function(particleA, particleB, len, str, limit){
	VerletSpring2D.call(this,particleA,particleB,len,str);
	this.limit = (limit === undefined) ? Number.MAX_VALUE : limit;
};

internals.extend(VerletConstrainedSpring2D,VerletSpring2D);

VerletConstrainedSpring2D.update = function(applyConstraints){
	var delta = this.b.sub(this.a);
    // add minute offset to avoid div-by-zero errors
    var dist = delta.magnitude() + VerletSpring2D.EPS;
    var normDistStrength = (dist - this.restLength) / (dist * (this.a.invWeight + this.b.invWeight))* this.strength;
    if (!this.a.isLocked && !this.isALocked) {
        this.a.addSelf(delta.scale(normDistStrength * this.a.invWeight).limit(this.limit));
        if (applyConstraints) {
            this.a.applyConstraints();
        }
    }
    if (!this.b.isLocked && !this.isBLocked) {
        this.b.subSelf(delta.scale(normDistStrength * this.b.invWeight).limit(this.limit));
        if (applyConstraints) {
            this.b.applyConstraints();
        }
    }
};

module.exports = VerletConstrainedSpring2D;


},{"../internals":30,"./VerletSpring2D":50}],48:[function(require,module,exports){


var internals = require('../internals'),
	Vec2D = require('../geom/Vec2D');

var	VerletParticle2D = function(x,y,w){
	this.force = new Vec2D();
	if( internals.has.XY( x ) ){
		if( internals.is.VerletParticle2D( x ) ){

			y = x.y;
			w = x.weight;
			x = x.x;
			this.isLocked = x.isLocked;

		} else if(y === undefined){
			y = x.y;
			w = 1;
			x = x.x;
		} else {
			w = y;
			y = x.y;
			x = x.x;
		}
	}
	Vec2D.call(this, x,y);
	this.isLocked = false;
	this.prev = new Vec2D(this);
	this.temp = new Vec2D();
	w = w || 1;
	this.setWeight(w);
};

internals.extend(VerletParticle2D,Vec2D);

VerletParticle2D.prototype.addBehavior = function(behavior,timeStep){
	if(this.behaviors === undefined){
		this.behaviors = [];
	}
	if(behavior === undefined){
		throw new Error("behavior was undefined");
	}
	timeStep = (timeStep === undefined)? 1 : timeStep;
	behavior.configure(timeStep);
	this.behaviors.push(behavior);
	return this;
};

VerletParticle2D.prototype.addConstraint = function(c){
	if(this.constraints === undefined){
		this.constraints = [];
	}
	this.constraints.push(c);
	return this;
};

VerletParticle2D.prototype.addForce = function(f){
	this.force.addSelf(f);
	return this;
};

VerletParticle2D.prototype.addVelocity = function(v){
	this.prev.subSelf(v);
	return this;
};

VerletParticle2D.prototype.applyBehaviors = function(){
	if(this.behaviors !== undefined){
		var i = 0, len = this.behaviors.length;
		for(i = 0;i<len;i++){
			this.behaviors[i].applyBehavior(this);
		}
	}
};

VerletParticle2D.prototype.applyConstraints = function(){
	if(this.constraints !== undefined){
		var i = 0, len = this.constraints.length;
		for(i =0;i<len;i++){
			this.constraints[i].applyConstraint(this);
		}
	}
};


VerletParticle2D.prototype.clearForce = function(){
	this.force.clear();
	return this;
};

VerletParticle2D.prototype.clearVelocity = function(){
	this.prev.set(this);
	return this;
};

VerletParticle2D.prototype.getInvWeight = function(){
	return this.invWeight;
};

VerletParticle2D.prototype.getPreviousPosition = function(){
	return this.prev;
};

VerletParticle2D.prototype.getVelocity = function(){
	return this.sub(this.prev);
};

VerletParticle2D.prototype.getWeight = function(){
	return this.weight;
};

VerletParticle2D.prototype.lock = function(){
	this.isLocked = true;
	return this;
};

VerletParticle2D.prototype.removeAllBehaviors = function(){
	this.behaviors = [];
	return this;
};

VerletParticle2D.prototype.removeAllConstraints = function(){
	this.constraints = [];
	return this;
};

VerletParticle2D.prototype.removeBehavior = function(b){
	return internals.removeItemFrom(b,this.behaviors);
};

VerletParticle2D.prototype.removeConstraint = function(c){
	return internals.removeItemFrom(c,this.constraints);
};

VerletParticle2D.prototype.scaleVelocity = function(scl){
	this.prev.interpolateToSelf(this,1 - scl);
	return this;
};

VerletParticle2D.prototype.setPreviousPosition = function(p){
	this.prev.set(p);
	return this;
};

VerletParticle2D.prototype.setWeight = function(w){
	this.weight = w;
	this.invWeight = (w !== 0) ? 1 / w : 0; //avoid divide by zero
};

VerletParticle2D.prototype.unlock = function() {
	this.clearVelocity();
	this.isLocked = false;
	return this;
};

VerletParticle2D.prototype.update = function(){

	if(!this.isLocked){
		this.applyBehaviors();
		//applyForce() - inline
        this.temp.set(this);
        this.addSelf(this.sub(this.prev).addSelf(this.force.scale(this.weight)));
        this.prev.set(this.temp);
        this.force.clear();
        //
		this.applyConstraints();
	}
};

module.exports = VerletParticle2D;


},{"../geom/Vec2D":19,"../internals":30}],49:[function(require,module,exports){


    var internals = require('../internals'),
        GravityBehavior = require('./behaviors/GravityBehavior'),
        Rect = require('../geom/Rect'),
        Vec2D = require('../geom/Vec2D'),
        id = 0;

    var VerletPhysics2D = function(gravity, numIterations, drag, timeStep) {
        var opts = {
            numIterations: 50,
            drag: 0,
            timeStep: 1
        };
        var a;
        if( arguments.length == 1 && (arguments[0].gravity || arguments[0].numIterations || arguments[0].timeStep || arguments[0].drag) ){ //options object literal
            a = arguments[0];
            opts.gravity = a.gravity;
            opts.numIterations = a.numIterations || opts.numIterations;
            opts.drag = a.drag || opts.drag;
            opts.timeStep = a.timeStep || opts.timeStep;
        } else if( arguments.length == 1){
            opts.gravity = gravity; //might be Vec2D, will get handled below
        } else if( arguments.length == 4 ){
            opts.gravity = gravity;
            opts.numIterations = numIterations;
            opts.drag = drag;
            opts.timeStep = timeStep;
        }

        this.behaviors = [];
        this.particles = [];
        this.springs = [];
        this.numIterations = opts.numIterations;
        this.timeStep = opts.timeStep;
        this.setDrag(opts.drag);
        if( opts.gravity ){
            if( internals.has.XY( opts.gravity ) ){
                opts.gravity = new GravityBehavior( new Vec2D(opts.gravity) );
            }
            this.addBehavior( opts.gravity );
        }
        this.id = id++;
    };

    VerletPhysics2D.addConstraintToAll = function(c, list){
        for(var i=0;i<list.length;i++){
            list[i].addConstraint(c);
        }
    };

    VerletPhysics2D.removeConstraintFromAll = function(c,list){
        for(var i=0;i<list.length;i++){
            list[i].removeConstraint(c);
        }
    };

    VerletPhysics2D.prototype = {

        addBehavior: function(behavior){
            behavior.configure(this.timeStep);
            this.behaviors.push(behavior);
        },

        addParticle: function(p){
            this.particles.push(p);
            return this;
        },

        addSpring: function(s){
            if(this.getSpring(s.a,s.b) === undefined){
                this.springs.push(s);
            }
            return this;
        },

        clear: function(){
            this.particles = [];
            this.springs = [];
            return this;
        },

        constrainToBounds: function(){ //protected
            var p,
                i = 0,
                len = this.particles.length;
            for(i=0; i<len; i++){
                p = this.particles[i];
                if(p.bounds !== undefined){
                    p.constrain(p.bounds);
                }
            }
            if(this.worldBounds !== undefined){
                for(i=0; i<len; i++){
                    p = this.particles[i];
                    p.constrain(this.worldBounds);
                }
            }
        },

        getCurrentBounds: function(){
            var min = new Vec2D(Number.MAX_VALUE, Number.MAX_VALUE);
            var max = new Vec2D(Number.MIN_VALUE, Number.MIN_VALUE);
            var i = 0,
                pLen = this.particles.length,
                p;
            for(; i<pLen; i++){
                p = this.particles[i];
                min.minSelf(p);
                max.maxSelf(p);
            }
            return new Rect(min,max);
        },

        getDrag: function() {
            return 1 - this.drag;
        },

        getNumIterations: function(){
            return this.numIterations;
        },

        getSpring: function(a,b){
            var i = 0,
                sLen = this.springs.length;
            for(; i<sLen; i++){
                var s = this.springs[i];
                if((s.a === a && s.b === b) || (s.a === b && s.b === b)){
                    return s;
                }
            }
            return undefined;
        },

        getTimeStep: function(){
            return this.timeStep;
        },

        getWorldBounds: function(){
            return this.worldBounds;
        },

        removeBehavior: function(c){
            return internals.removeItemFrom(c,this.behaviors);
        },

        removeParticle: function(p){
            return internals.removeItemFrom(p,this.particles);
        },

        removeSpring: function(s) {
            return internals.removeItemFrom(s,this.springs);
        },

        removeSpringElements: function(s){
            if(this.removeSpring(s) !== undefined){
                return (this.removeParticle(s.a) && this.removeParticle(s.b));
            }
            return false;
        },

        setDrag: function(drag){
            this.drag = 1 - drag;
        },

        setNumIterations: function(numIterations){
            this.numIterations = numIterations;
        },

        setTimeStep: function(timeStep){
            this.timeStep = timeStep;
            var i =0, l = this.behaviors.length;
            for(; i<l; i++){
                this.behaviors[i].configure(timeStep);
            }
        },

        setWorldBounds: function(world){
            this.worldBounds = world;
            return this;
        },

        update: function(){
            this.updateParticles();
            this.updateSprings();
            this.constrainToBounds();
            return this;
        },

        updateParticles: function(){
            var i = 0,
                j = 0,
                bLen = this.behaviors.length,
                pLen = this.particles.length,
                b,
                p;
            for(; i<bLen; i++){
                b = this.behaviors[i];
                for(j = 0; j<pLen; j++){
                    b.applyBehavior(this.particles[j]);
                }
            }
            for(j = 0; j<pLen; j++){
                p = this.particles[j];
                p.scaleVelocity(this.drag);
                p.update();
            }
        },

        updateSprings: function(){
            var i = this.numIterations,
                sLen = this.springs.length,
                j = 0;
            for(; i > 0; i--){
                for(j = 0; j<sLen; j++){
                    this.springs[j].update(i === 1);
                }
            }
        }
    };

    module.exports = VerletPhysics2D;


},{"../geom/Rect":14,"../geom/Vec2D":19,"../internals":30,"./behaviors/GravityBehavior":52}],50:[function(require,module,exports){

var	VerletSpring2D = function(a,b,len,str){
	this.a = a;
	this.b = b;
	this.restLength = len;
	this.strength = str;
};

VerletSpring2D.EPS = 1e-6;

VerletSpring2D.prototype = {
	getRestLength: function(){
		return this.restLength;
	},

	getStrength: function(){
		return this.strength;
	},

	lockA: function(s){
		this.isALocked = s;
		return this;
	},

	lockB: function(s){
		this.isBLocked = s;
		return this;
	},

	setRestLength: function(len){
		this.restLength = len;
		this.restLengthSquared = len * len;
		return this;
	},

	setStrength: function(strength){
		this.strength = strength;
		return this;
	},

	update: function(applyConstraints){ //protected
		var delta = this.b.sub(this.a);
		//add minute offset to avoid div-by-zero errors
		var dist = delta.magnitude() + VerletSpring2D.EPS;
		var normDistStrength = (dist - this.restLength) / (dist * (this.a.invWeight + this.b.invWeight)) * this.strength;
		if(!this.a.isLocked && !this.isALocked){
			this.a.addSelf(
				delta.scale(normDistStrength * this.a.invWeight)
			);
			if(applyConstraints){
				this.a.applyConstraints();
			}
		}
		if(!this.b.isLocked && !this.isBLocked){
			this.b.addSelf(
				delta.scale(-normDistStrength * this.b.invWeight)
			);
			if(applyConstraints){
				this.b.applyConstraints();
			}
		}
	}
};

module.exports = VerletSpring2D;


},{}],51:[function(require,module,exports){


    var Vec2D = require('../../geom/Vec2D');

    var	ConstantForceBehavior = function(force){
        this.force = force;
        this.scaledForce = new Vec2D();
        this.timeStep = 0;
    };

    ConstantForceBehavior.prototype = {
        applyBehavior: function(p){ //apply() is reserved, so this is now applyBehavior
            p.addForce(this.scaledForce);
        },

        configure: function(timeStep){
            this.timeStep = timeStep;
            this.setForce(this.force);
        },

        getForce: function(){
            return this.force;
        },

        setForce: function(forceVec){
            this.force = forceVec;
            this.scaledForce = this.force.scale(this.timeStep);
        },

        toString: function(){
            return "behavior force: "+ this.force+ " scaledForce: "+this.scaledForce+ " timeStep: "+this.timeStep;
        }
    };

    module.exports = ConstantForceBehavior;


},{"../../geom/Vec2D":19}],52:[function(require,module,exports){


    var internals = require('../../internals'),
        ConstantForceBehavior = require('./ConstantForceBehavior');

    var	GravityBehavior = function(gravityVec){
        ConstantForceBehavior.call(this,gravityVec);
    };

    internals.extend(GravityBehavior,ConstantForceBehavior);

    GravityBehavior.prototype.configure = function(timeStep){
        this.timeStep = timeStep;
        this.scaledForce = this.force.scale(timeStep * timeStep);
    };

    module.exports = GravityBehavior;


},{"../../internals":30,"./ConstantForceBehavior":51}]},{},[1])(1)
});
