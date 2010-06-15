(function()
{
var $wnd = $(window), $holder;
    
function convertBBox(world, obj)
{
    var raphBBox = obj.getBBox();
    var pt = world.offset;
    return {x: raphBBox.x + pt.x, y: raphBBox.y + pt.y, w:raphBBox.width, h: raphBBox.height};
}

function removeThis()
{
    this.remove();
}

function findClosestPointInCandidates(candidates, ptBullet)
{
    //console.debug("candidates = %o, len = %s", candidates, candidates.length);
    var minDistance = Infinity, bestCandidate, bestClosest, candidate;
    for ( var i = 0, len = candidates.length; i < len; i++)
    {
        candidate = candidates[i];
        if (candidate && candidate.type === "line")
        {
            var closest = closestPointOnLineSegment(ptBullet, candidate.pt0, candidate.pt1);
            
            var distance = closest.substract(ptBullet).length();
            if (distance < minDistance)
            {
                minDistance = distance;
                bestCandidate = candidate;
                bestClosest = closest;
            }
        }
    }
    
    return {closest: closest, obj: bestCandidate, distance: minDistance};  
}



//function subExplode( d, millis, sizeStart, sizeEnd, fn)
//{
//    var subAngle = Math.random() * Math.PI * 2;
//    var dist = this.radius * d;
//
//    this.world.paper.circle(this.pos.x + Math.cos(subAngle) * dist,
//            this.pos.y + +Math.sin(subAngle) * dist,
//            this.radius * sizeStart).attr( {
//        "fill" : "#fc8",
//        stroke : "#800",
//        "fill-opacity" : 0.1
//    })
//
//    .animate( {
//        "fill" : "#ffc",
//        "stroke" : "#f00",
//        "r" : this.radius * sizeEnd,
//        "fill-opacity" : 0.8
//    }, millis, d == 0 ? "bounce" : "linear", fn ? function() { removeThis.call(this); fn.call(this);  } : removeThis);
//}

var _indexOf = Array.prototype.indexOf;

function removeFromArray(array,obj)
{
    var idx = -1;
    if (_indexOf)
    {
        idx = _indexOf.call(array,obj);
    }
    else
    {
        for (var i = 0, len = array.length; i < len ; i++)
        {
            if (array[i] === obj)
            {
                idx = i;
                break;
            }
        }
    }
    
    if (idx >= 0)
    {
        array.splice(idx,1);
    }
}

this.World = Class.extend({
init:
   function(id)
   {
        var canvas = document.getElementById(id);
        
        if (!canvas.getContext)
        {
            throw "No canvas";
            
        }
        
        this.$canvas = $(canvas);
        this.ctx = canvas.getContext('2d');  
        
        this.objects = [];
        this.rtree = new RTree(10);
        this.gravity = 0.00981;
   },
addObject:
    function(obj)
    {
        this.objects.push(obj);
    },
removeObject:
    function(obj)
    {
       for (var i = 0, len = obj.canvasObjs.length ; i < len ; i++)
       {
           var obj = obj.canvasObjs[i];
           this.rtree.remove( convertBBox(this.world,obj), obj);
           obj.remove();
       }
       removeFromArray(this.objects, obj);
    },
offset: new Vector2D(0,0),    
step:
    function()
    {
        this.ctx.save();

        var canvasWidth = this.$canvas.width();
        var canvasHeight = this.$canvas.height();
        
        var offset = this.player.pos.substract( canvasWidth / 2, canvasHeight / 2);

        var dx =  newOff.x - this.offset.x;
        var dy =  newOff.y - this.offset.y;
        
        
        this.offset = newOff;
        
        this.ctx.translate( -this.offset.x, -this.offset.y);

        var box = { x: 0, y:0, w: canvasWidth, h: canvasHeight};
        
        var inScreenObjects = this.rtree.search(box);
        
        for ( var i = 0, len = inScreenObjects.length; i < len; i++)
        {
            var obj = inScreenObjects[i];
            if (obj.type !== "line")
            {
                obj.message("move");
                ctx.save();
                obj.message("draw", ctx);
                ctx.restore();
            }
        }
        
        for ( var i = 0, len = this.bullets.length; i < len; i++)
        {
            var bullet = this.bullets[i];
            obj.message("move");
            ctx.save();
            obj.message("draw", ctx);
            ctx.restore();
        }
        
        this.ctx.restore();
    }
});    
    
var GameObject = Class.extend({
init: function(world)
    {     
        this.world = world;
        this.canvasObjs = Array.prototype.slice.call(arguments, 1);
        this.pos = this.pos || new Vector2D(0,0);
        world.addObject(this);
    },
message:
    function(name)
    {
        var args = Array.prototype.slice.call(arguments,1);
        
        var fn = this[name];
        if (fn)
        {
            fn.apply(this,args);
        }
    },
translate:
    function(x,y)
    {
        var pos = this.pos;
        pos.x += x;
        pos.y += y;
    },
registerCanvasObjects:
    function(type)
    {
        var rtree = this.world.rtree;
        var canvasObjs = this.canvasObjs;
        this.type = type;
        for (var i=0, len = canvasObjs.length; i < len ; i++)
        {
            var box = convertBBox(this.world,canvasObjs[i]); 
            rtree.insert(box, this);
        }
    }
});    

this.Polygon = GameObject.extend({
    init: function(world, pathData, attrs)
    {
//        this.points = points;
//        var l=[];
//        
//        l.push("M", points[0].x, ",", points[0].y);
//        for (var i=1, len = points.length; i < len; i++)
//        {
//            var p = points[i];
//            l.push("L", p.x, ",", p.y);
//        }
//        l.push(" Z");
//        var pathData = l.join("");
//        //console.debug(pathData);
        var path = world.paper.path(pathData);
        
        if (attrs)
        {
            path.attr(attrs);
        }
        
        this._super(world,path);
        
        this.pos = new Vector2D(0,0);
        
        this.registerLines();
    },
//move:
//    function() {
//        this.translate(-5,1);
//    },
registerLines:
    function()
    {
        
        // readback converted path Data
        var pathData = this.canvasObjs[0].attr("path");
        
        var subPathStart, last, pt;
        for ( var i = 0, len = pathData.length; i < len; i++)
        {
            var cmd = pathData[i];
            
            if (cmd.length > 1)
            {
                if (cmd[0] == "M")
                {
                    last = new Vector2D(+cmd[1],+cmd[2]);
                    if (!subPathStart)
                    {
                        subPathStart = last;
                    }
                }
                else if (cmd[0] == "L")
                {
                    pt = new Vector2D(+cmd[1],+cmd[2]);
                    this.insertLineBox(last,pt);
                    last = pt;
                }
                else if (cmd[0] == "Z")
                {
                    this.insertLineBox(last,subPathStart);
                    subPathStart = null;
                    last = null;
                }
            }
        }
    },
insertLineBox:
    function(pt0,pt1)
    {
        
        var rtree = this.world.rtree, x,y,w,h;
        //console.debug("pt0 = %d, %d, pt1 = %d, %d", pt0.x, pt0.y, pt1.x, pt1.y)
        
        if (pt0.x < pt1.x)
        {
            x = pt0.x;
            w = pt1.x - pt0.x;
        }
        else
        {
            x = pt1.x;
            w = pt0.x - pt1.x;
        }

        if (pt0.y < pt1.y)
        {
            y = pt0.y;
            h = pt1.y - pt0.y;
        }
        else
        {
            y = pt1.y;
            h = pt0.y - pt1.y;
        }
        
//        var paper = this.world.paper;
//        paper.path("M" + pt0.x + "," + pt0.y + " L" + pt1.x +","+ pt1.y ).attr("stroke","#f0f");
        var box = { "x": x, "y": y, "w": w, "h": h};
        var obj = {"type":"line", "pt0": pt0, "pt1": pt1};
        rtree.insert( box, obj);
    }    
});    
function randomColor()
{
    return "rgb(" + Math.random() * 255 + "," + Math.random() * 255 + "," + Math.random() * 255 + ")";
}

this.Player = GameObject.extend({
init: function(world,initX,initY)
    {    
        this._super(world);
        this.initX = initX;
        this.initY = initY;
        this.reset();
        this.registerCanvasObjects("player");
    },
reset:
    function()
    {
        var paper = this.world.paper;
        this.canvasObjs[0] = paper.circle(0, 0, 10);
        
        this.pos.x = this.initX;
        this.pos.y = this.initY;
        
        this.dx = 0;
        this.dy = 0;
        this.dead = false;
        this.radius = 10;
        this.thrustPower = 40;
        
        this.canvasObjs[0].attr({
            "fill": "#00f", 
            "stroke": "#88f", 
            "r" : this.radius, 
            "cx" : this.pos.x , 
            "cy" : this.pos.y});
        
    },
explode : 
    function()
    {

        var paper = this.world.paper;

        this.canvasObjs[0].remove();
        this.dead = true;

        var player = this;
        subExplode.call(this, 0.9, 400, 0.2, 2.4);
        subExplode.call(this, 1.2, 500, 0.3, 2.1);
        subExplode.call(this, 0.0, 600, 1.0, 2.5, function() {
		player.reset();
	});
    },
move:
    function()
    {
        if (this.dead)
            return;
        
        var point = this.thrustPoint; 
        if (point)
        {
            var deltaX = this.pos.x - point.x;
            var deltaY = this.pos.y - point.y;
            
            var angle = Math.atan2(deltaY, deltaX);
            //console.debug("angle = %d", angle );
            this.dx += Math.cos(angle) * this.thrustPower / 1000;
            this.dy += Math.sin(angle) * this.thrustPower / 1000;
        }
        
        var box = convertBBox(this.world,this.canvasObjs[0]);
        var paper = this.world.paper;
        
        var candidates = this.world.rtree.search(box);
        
//        if (candidates.length > 0)
//        {
//            console.debug("candidates = %o", candidates);
//        }
        
        for ( var i = 0, len = candidates.length; i < len; i++)
        {
            var candidate = candidates[i];
            if (candidate.type === "line")
            {
                if (candidate.pt0 && candidate.pt1)
                {
                    //console.debug("%d,%d - %d, %d  - %d, %d", this.pos.x, this.pos.y, candidate.pt0.x, candidate.pt0.y, candidate.pt1.x, candidate.pt1.y)
                    
                    var ptPlayer = new Vector2D(this.pos.x, this.pos.y);
                    var closest = closestPointOnLineSegment(ptPlayer, candidate.pt0, candidate.pt1);
                    
                    var distance = closest.substract(ptPlayer).length();
                    
                    if (distance < this.radius)
                    {
                        player.explode();
                    }                    
                }
            }
        }
        
        var ptDock = this.world.base.pos.add(25,-3);
        
        //mark(this.world, this.pos, "pOrigin")
        
        var distToBase = ptDock.substract(this.pos.x, this.pos.y ).length();
        
        if ( distToBase > 20)
        {        
            this.dy += this.world.gravity;
        }
        else
        {
            if (!this.thrustPoint)
            {
                this.dx *= 0.8;                
                this.dy *= 0.8;

                if (distToBase > .1)
                {
                    var align = ptDock.substract(this.pos).norm();

                    this.translate(align.x * 0.3, align.y * 0.3);
                }
            }
        }
        
        var paperWidth = this.world.paper.width;
        var paperHeight = this.world.paper.height;
        
        if (this.pos.x - this.radius < 0 || this.pos.x + this.radius > paperWidth)
        {
            this.dx = -this.dx;
        }
        if (this.pos.y - this.radius < 0 || this.pos.y + this.radius > paperHeight )
        {
            this.dy = -this.dy;
        }

        this.translate(this.dx,this.dy);
    },
thrust:
    function(point)
    {
        this.thrustPoint = point;
    },
shoot:
    function(point)
    {
        var angle = point.angleTo(this.pos);
        new Bullet(this.world, this.pos.clone(), angle).translateVisuals(-this.world.offset.x,-this.world.offset.y);
    }
});    
    
this.Bullet = GameObject.extend({
init:
    function(world, pt, angle)
    {
        this.dx = Math.cos(angle) * 4;
        this.dy = Math.sin(angle) * 4;
        this.radius = 4;
        
        var circle = world.paper.circle(pt.x, pt.y, this.radius).attr({"fill":"#fc0"});
        this._super(world, circle);
        this.pos = pt;
        
        
        this.ricochet = 5;
    },
move:
    function()
    {
        var paper = this.world.paper;

        var newPos = this.pos.clone();
        
        newPos.x += this.dx;
        newPos.y += this.dy;
        
        if (!this.ricochet)
        {
            world.removeObject(this);
        }
        else
        {
            var box = convertBBox(this.world,this.canvasObjs[0]);
            var candidate, closest, distance;
            var ptBullet = newPos;
            
            var candidates = this.world.rtree.search(box);

            var best = findClosestPointInCandidates(candidates, ptBullet);
                        
            if (best.distance < this.radius)
            {
                candidate = best.obj;
                distance = best.distance;
                closest = best.closest;
                
                var v = new Vector2D(this.dx,this.dy);
                var vLen = v.length();
                var vNorm = v.multiply( 1 / vLen);

                // calculate angle between direction vector and edge
                // vector from closest to ptBullet, rotated 90 clockwise
                var vD = ptBullet.substract(closest);
                var h = -vD.x;
                vD.x = vD.y;
                vD.y = h;

                var angle = Math.acos(vD.norm().dot(vNorm));
                
                // Intercept theorem
                //
                //    \ v2               v,v1,v2 are vectors from the top of      
                //     \                 the graph to the "V", r is the radius of the circle       
                //     |\                and d the distance to the closest point we found.
                //     | \v 
                //     |  \
                //   r |  |\ 
                //     |  | \ v1
                //     | d|  \
                //     |  |   \
                //     +--+----V--------
                //
                // calculate length of v1 by |v1| = OPPOSITE / sin(angle) 
                
                
                var v1Len = distance / Math.sin(angle) ;
                
                // Intercept theorem says that |v1| / d = (|v1| + |v| - |v2| ) / r, solve for |v2|
                // |v2| = |v1| + |v| - |v1| * r / d
                
                var v2Len = v1Len + vLen - v1Len * this.radius / distance;

                var remainder = vLen - v2Len;

                // move back bullet to tangent point
                var vBack = vNorm.multiply(-remainder);
                newPos.x += vBack.x;
                newPos.y += vBack.y;
                
                var angle = ptBullet.angleTo(closest);
                
                var dirAngle = Math.atan2(this.dy, this.dx);
                
                angle += angle - dirAngle + Math.PI;
                          
                var cos = Math.cos(angle);
                var sin = Math.sin(angle);
                
                this.dx = cos * vLen;
                this.dy = sin * vLen;
                
                this.x += cos * remainder;
                this.y += sin * remainder;
                
                this.ricochet--;
            }
            
            var delta = newPos.substract(this.pos);
            
            this.translate(delta.x, delta.y);
            //this.canvasObjs[0].attr({cx: this.world.offsetX + this.pos.x, cy: this.world.offsetY + this.pos.y});
        }
    }
});

this.Base = GameObject.extend({
init:
    function(world, x, y)
    {
        this.pos = new Vector2D(x,y);
        
        var candidates = world.rtree.search({x: x, y:y, w: 50, h:100});
        var best = findClosestPointInCandidates(candidates, this.pos);
        
        console.debug("best match = %o", best);
        
        this.pos.x = best.closest.x - 25;
        this.pos.y = best.closest.y - 16;
        
        var path = world.paper.path("m 0.17875138,8.5182429 c 0.36277675,2.4126001 -0.49887673,5.5565001 6.67857792,6.6762001 7.1774547,1.1197 29.2087047,1.1387 36.3861647,0.021 7.17746,-1.1177 6.3162,-4.2636 6.678578,-6.6762001 -2.379915,-4.5327641 -8.837707,0.1542247 -14.042513,0.8741 -8.820582,1.1287141 -13.105522,0.9631431 -21.658284,-0.021 C 8.8710975,7.7031978 0.6824529,4.6146483 0.17875138,8.5182429 z")
            .attr({fill:"#080", stroke: "#0c0"}).translate( this.pos.x, this.pos.y);
        
        this._super(world,path);
    }
});

var markers = {};

function mark(world, pt, name, fill, stroke)
{
    if (!name || !markers[name])
    {
        markers[name] = world.paper.circle(pt.x,pt.y, 3).attr({fill: fill || "#f00",stroke: stroke || "#f0f"});
    }
    return markers[name];
}

})();
