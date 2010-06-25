(function()
{
var $wnd = $(window), $holder;
    
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

this.BBox = function()
{
    this.x = this.y = 1e9;
    this.w = this.h = -1e9;
};

this.BBox.prototype = {

extend: 
    function()
    {
        for ( var i = 0, len = arguments.length; i < len; i++)
        {
            var vOrBox = arguments[i];
            
            if (vOrBox.x < this.x)
            {
                this.x = vOrBox.x;
            }
            if (vOrBox.y < this.y)
            {
                this.y = vOrBox.y;
            }
            
            var x = vOrBox.x + (vOrBox.w || 0); 
            var y = vOrBox.y + (vOrBox.h || 0); 
            
            if(x > this.x + this.w)
            {
                this.w = x - this.x;
            }
            if(y > this.y + this.h)
            {
                this.h = y - this.y;
            }
        }
    },
toString:
    function()
    {
        return "( x = " + this.x + ", y = " + this.y + " w = " + this.w + ", h = " + this.h + ")";
    }
};

this.World = Class.extend({
init:
   function(id)
   {
        var canvas = document.getElementById(id);
        
        if (!canvas.getContext)
        {
            throw "No canvas";
            
        }
        
        
        
        canvas.width = $wnd.width();
        canvas.height = $wnd.height() - 40;
        
        
        this.$canvas = $(canvas);
        this.ctx = canvas.getContext('2d');  
        
        this.objects = [];
        this.rtree = new RTree(10);
        this.gravity = 0.00981;
        this.box = new BBox();
   },
addObject:
    function(obj)
    {
        this.objects.push(obj);
    },
removeObject:
    function(obj)
    {
        object.message("remove");
        removeFromArray(this.objects, obj);
    },
createSubPaths:
    function(pathData)
    {
        var x=0, y=0, idx = 0;
        var data = pathData.split(/[ ,]/);
        var len = data.length;
        
        var paths=[];
        var points = [];
        var lastCmd = "L";
        
        while (idx < len)
        {
            var cmd = data[idx++];
         
            if (cmd < "A")
            {
                cmd = lastCmd;
                if (cmd == "M")
                {
                    cmd = "L";
                }
                if (cmd == "m")
                {
                    cmd = "l";
                }
                idx--;
            }
            else
            {
                lastCmd = cmd;
            }
            
            var absolute = false;
            if (cmd <= "a")
            {
                absolute = true;
                cmd = String.fromCharCode(cmd.charCodeAt(0) + 32);
            }
            
            switch(cmd)
            {
                case "m":
                    points = [];
                    x=0;
                    y=0;
                case "l":
                    if (absolute)
                    {
                        x = +data[idx++];
                        y = +data[idx++];
                    }
                    else
                    {
                        x += +data[idx++];
                        y += +data[idx++];
                    }
                    points.push(new Vector2D(x,y));
                    break;
                case "z":
                    var poly = new Polygon(this,points);
                    paths.push(poly);
                    
                    this.box.extend(poly.box);
                    points = [];
                    x=0;
                    y=0;
                    break;
            }
        
        }
        
        return paths;
    },    
width: 1000,
height: 1000,
ox:0,oy:0,
step:
    function()
    {
        this.ctx.save();
        
        var canvasWidth = this.$canvas[0].width;
        var canvasHeight = this.$canvas[0].height;
        
        this.ctx.clearRect(0,0,canvasWidth,canvasHeight);
        var offset = this.player.pos.substract( canvasWidth / 2, canvasHeight / 2);
        //console.debug(this.ox)
        this.ctx.translate( -offset.x, -offset.y);
        //this.ctx.scale( 0.5, 0.5);

        this.offset = offset;
        
        var box = { x: offset.x, y: offset.y, w: canvasWidth, h: canvasHeight};
        
        var inScreenObjects = this.rtree.search(box);
        
        for ( var i = 0, len = this.objects.length; i < len; i++)
        {
            var obj = this.objects[i];
            if (obj.type !== "line")
            {
                obj.message("move");
                this.ctx.save();
                obj.message("draw", this.ctx);
                this.ctx.restore();
            }
        }
        
//        for ( var i = 0, len = this.bullets.length; i < len; i++)
//        {
//            var bullet = this.bullets[i];
//            obj.message("move");
//            ctx.save();
//            obj.message("draw", ctx);
//            ctx.restore();
//        }
        
        this.ctx.restore();
    }
});    
    
var GameObject = Class.extend({
init: function(world)
    {     
        this.world = world;
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
            return fn.apply(this,args);
        }
        return undefined;
    },
translate:
    function(x,y)
    {
        var pos = this.pos;
        pos.x += x;
        pos.y += y;
    }
});    

this.Polygon = GameObject.extend({
    init: function(world, points)
    {
        this._super(world);
        
        this.pos = new Vector2D(0,0);
        this.points = points;
        this.registerLines();
    },
draw:
    function(ctx)
    {
        //console.debug("draw polygon: %o", this.points);
        var pt0, pts = this.points;
        ctx.fillStyle = "#444";
        ctx.strokeStyle = "#eee";
        pt0 = pts[0];
        ctx.beginPath();
        ctx.moveTo(pt0.x, pt0.y);
        //console.debug("ctx.moveTo( %d, %d);",pt0.x, pt0.y);
        for ( var i = 1, len = pts.length; i < len; i++)
        {
            var pt = pts[i];
            ctx.lineTo(pt.x,pt.y);
            //console.debug("ctx.lineTo(%d,%d);",pt.x,pt.y);
        }
        ctx.lineTo(pt0.x,pt0.y);
        ctx.closePath();
        ctx.fill();
    },
//move:
//    function() {
//        this.translate(-5,1);
//    },
registerLines:
    function()
    {
        var pts = this.points;
        var box = new BBox();
        for ( var i = 0, len = pts.length - 1; i < len; i++)
        {
            var pt0 = pts[i];
            var pt1 = pts[i + 1];
            
            this.insertLineBox(pt0, pt1);
            box.extend(pt0,pt1);
        }
        var ptLast = pts[ pts.length - 1 ];
        this.insertLineBox( ptLast, pts[0]);
        box.extend( ptLast);
        this.box = box;
        this.world.rtree.insert(box, this);
    },
getBBox:
    function()
    {
        return this.box;
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
    },
reset:
    function()
    {
        //var paper = this.world.paper;
        //this.canvasObjs[0] = paper.circle(0, 0, 10);
        
        this.pos.x = this.initX;
        this.pos.y = this.initY;
        
        this.dx = 0;
        this.dy = 0;
        this.dead = false;
        this.radius = 10;
        this.thrustPower = 40;
        
//        this.canvasObjs[0].attr({
//            "fill": "#00f", 
//            "stroke": "#88f", 
//            "r" : this.radius, 
//            "cx" : this.pos.x , 
//            "cy" : this.pos.y});
        
    },
explode : 
    function()
    {

        //var paper = this.world.paper;

        //this.canvasObjs[0].remove();
        this.dead = true;

        var player = this;
        subExplode.call(this, 0.9, 400, 0.2, 2.4);
        subExplode.call(this, 1.2, 500, 0.3, 2.1);
        subExplode.call(this, 0.0, 600, 1.0, 2.5, function() {
		player.reset();
	});
    },
draw:
    function(ctx)
    {
    ctx.beginPath();
    ctx.fillStyle="#00f"
        ctx.arc(this.pos.x, this.pos.y, 15, 0, Math.PI*2, false);
    ctx.fill();
    },    
getBBox:
    function()
    {
        var box = this.pos.substract(15,15);
        box.w = 30; 
        box.h = 30;
        return box;
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
        
        var box = this.message("getBBox");
        if (!box)
            return;
        
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
        
        var worldWidth = this.world.width;
        var worldHeight = this.world.height;
        var worldBox = this.world.box;
        
        if (this.pos.x - this.radius < worldBox.x || this.pos.x + this.radius > worldBox.x + worldBox.w )
        {
            this.dx = -this.dx;
        }
        if (this.pos.y - this.radius < this.world.box.y || this.pos.y + this.radius > worldBox.y + worldBox.h )
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
        new Bullet(this.world, this.pos.clone(), angle);
    }
});    
    
this.Bullet = GameObject.extend({
init:
    function(world, pt, angle)
    {
        this.dx = Math.cos(angle) * 4;
        this.dy = Math.sin(angle) * 4;
        this.radius = 2;
        
        this._super(world);
        this.pos = pt;
        
        
        this.ricochet = 5;
    },
draw:
    function(ctx)
    {
        ctx.beginPath();
        ctx.fillStyle="#fee";
        ctx.strokeStyle="#fcc";
        ctx.arc(this.pos.x, this.pos.y, 2, 0, Math.PI*2, false);
        ctx.fill();
        ctx.stroke();
    },    
getBBox:
    function()
    {
        var box = this.pos.substract(2,2);
        box.w = 4; 
        box.h = 4;
        return box;
    },    
move:
    function()
    {
        var newPos = this.pos.clone();
        
        newPos.x += this.dx;
        newPos.y += this.dy;
        
        if (!this.ricochet)
        {
            world.removeObject(this);
        }
        else
        {
            var box = this.message("getBBox");
            if (!box)
                return;
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
        
//        var path = world.paper.path("m 0.17875138,8.5182429 c 0.36277675,2.4126001 -0.49887673,5.5565001 6.67857792,6.6762001 7.1774547,1.1197 29.2087047,1.1387 36.3861647,0.021 7.17746,-1.1177 6.3162,-4.2636 6.678578,-6.6762001 -2.379915,-4.5327641 -8.837707,0.1542247 -14.042513,0.8741 -8.820582,1.1287141 -13.105522,0.9631431 -21.658284,-0.021 C 8.8710975,7.7031978 0.6824529,4.6146483 0.17875138,8.5182429 z")
//            .attr({fill:"#080", stroke: "#0c0"}).translate( this.pos.x, this.pos.y);
        this._super(world);
    },
draw:
    function(ctx)
    {
        ctx.beginPath();
        ctx.moveTo(0.17875138,8.5182429);
        ctx.curveTo()
    }
});

//var markers = {};
//function mark(world, pt, name, fill, stroke)
//{
//    if (!name || !markers[name])
//    {
//        markers[name] = world.paper.circle(pt.x,pt.y, 3).attr({fill: fill || "#f00",stroke: stroke || "#f0f"});
//    }
//    return markers[name];
//}

})();

