/*!
 * Thrust 2010 Copyright (C) 2010 by Sven Helmberger.
 * 
 * This software is licensed under the AGPL license. 
 * project root for LICENSE AND README.
 * 
 */
this.Vector2D = function(x,y)
{
    this.x = x;
    this.y = y;
};

this.Vector2D.prototype = {
init: 
    function(x,y)
    {
    },
add:
    function(x,y)
    {
        if (typeof x === "number")
        {
            return new Vector2D(this.x + x, this.y + y);
        }
        else
        { 
            return new Vector2D(this.x + x.x, this.y + x.y);
        }
    },
length:
    function()
    {
        return Math.sqrt( this.x * this.x + this.y * this.y);
    },
substract:
    function(x,y)
    {
        if (typeof x === "number")
        {
            return new Vector2D(this.x - x, this.y - y);
        }
        else
        { 
            return new Vector2D(this.x - x.x, this.y - x.y);
        }
    },
multiply:
    function(n)
    {
        return new Vector2D(this.x * n, this.y * n);
    },
dot:
    function(v)
    {
        return this.x * v.x + this.y * v.y;
    },
norm:
    function()
    {
        var invLen = 1 / this.length();
        return this.multiply(invLen);
    },
projectOnto:
    function(b)
    {
        var dp = this.dot(b);
        return new Vector2D( ( dp / (b.x*b.x + b.y*b.y) ) * b.x , ( dp / (b.x*b.x + b.y*b.y) ) * b.y );        
    },
angleTo:
    function(v)
    {
        var deltaX = this.x - v.x;
        var deltaY = this.y - v.y;
        return Math.atan2(deltaY, deltaX);
    },
clone:
    function()
    {
        return new Vector2D(this.x, this.y);
    },
isSameDirection:
    function(x,y)
    {
        if (typeof x === "object")
        {
            y = x.y;
            x = x.x;
        }
        
        return (this.x < 0 ? -1 : 1) === (x < 0 ? -1 : 1) &&
               (this.y < 0 ? -1 : 1) === (y < 0 ? -1 : 1); 
    },
toString:
    function()
    {
        return "( " + this.x + ", " + this.y + ")";
    }
};

//use the sign of the vector cross product's Z component to figure out if our points are clockwise or counter-clockwise
function clockwise(v0,v1,v2)
{
    return ((v2.x - v0.x) * (v1.y - v0.y) - (v2.y - v0.y) * (v1.x - v0.x)) <= 0;    
}

function isInside(pt, triPts)
{
 // Compute vectors        
    var v0 = triPts[2].substract(triPts[0]);
    var v1 = triPts[1].substract(triPts[0]);
    var v2 = pt.substract(triPts[0]);

    // Compute dot products
    var dot00 = v0.dot(v0);
    var dot01 = v0.dot(v1);
    var dot02 = v0.dot(v2);
    var dot11 = v1.dot(v1);
    var dot12 = v1.dot(v2);

    // Compute barycentric coordinates
    var invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    // Check if point is in triangle
    return (u > 0) && (v > 0) && (u + v < 1)
}

function checkVector(v)
{
    for ( var i = 0, len = arguments.length; i < len; i++)
    {
        var arg = arguments[i];
        if (!arg || typeof arg.projectOnto !== "function")
        {
            console.info("%o is no vector", arg);
        }
    }

}

//a is the first point on the line segment
//b is the second point on the line segment
//Point is the point your trying to find
function closestPointOnLineSegment(pt, a, b)
{
    var c = pt.substract(a);
    
    var a2b = b.substract(a);
    
    var d = a2b.length();

    var v = a2b.multiply(1 / d);
    
    var t = v.dot(c);
    
    //console.debug("t = %d, d = %d", t, d);
    
    if (t < 0)
    {
        return a;
    }
    if (t > d)
    {
        return b;
    }
    return a.add(v.multiply(t));
}

//a is the first point on the line segment
//b is the second point on the line segment
//Point is the point your trying to find
function closestPointOnLine(pt, a, b)
{
  var c = pt.substract(a);
  
  var a2b = b.substract(a);
  
  var d = a2b.length();

  var v = a2b.multiply(1 / d);
  
  var t = v.dot(c);
  
  return a.add(v.multiply(t));
}
