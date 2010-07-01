(function()
{
var $wnd = $(window), $holder;
    
function removeThis()
{
    this.remove();
}

function applyStyle(ctx, style)
{
    for (var prop in style)
    {
        var v = style[prop]
        if ( v !== "none")
        {                
            ctx[prop] = v;
            //console.debug("Set prop  %s to %o", prop, v);
        }
    }
}

function outerBox(pos,r)
{
    var box = pos.substract(r,r);
    box.w = box.h = r*2;
    return box;
}

function parseSubPaths(pathData)
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
                paths.push(points);
                points = [];
                x=0;
                y=0;
                break;
        }
    
    }
    
    return paths;
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
                this.w += this.x - vOrBox.x; 
                this.x = vOrBox.x;
            }
            if (vOrBox.y < this.y)
            {
                this.h += this.y - vOrBox.y; 
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
        
        this.gravs = [];
   },
addGravSource:
    function(grav)
    {
       this.gravs.push(grav);
    },
doLocalGravity:
    function(obj)
    {
       var inLocal = false;
       for ( var i = 0, len = this.gravs.length; i < len; i++)
       {
            var grav = this.gravs[i];
            var box = grav.getBBox();
            if (obj.pos.x >= box.x && obj.pos.x < box.x + box.w &&  
                obj.pos.y >= box.y && obj.pos.y < box.y + box.h)
            {
                grav.doGravity(obj);
                inLocal = true;
                break;
            }
       }
       if (!inLocal)
       {
           obj.dy += this.gravity;
       }
    },
addObject:
    function(obj)
    {
        this.objects.push(obj);
    },
removeObject:
    function(obj)
    {
        obj.message("remove");
                
        removeFromArray(this.objects, obj);
        
        var box = obj.message("getBBox");
        if (box)
        {
            this.rtree.remove(box, obj);
        }
        
    },
createSubPaths:
    function(pathData,style)
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
                    var poly = new Polygon(this,points, false, style);
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
        var ctx = this.ctx;
        ctx.save();
        
        var canvasWidth = this.$canvas[0].width;
        var canvasHeight = this.$canvas[0].height;
        
        ctx.clearRect(0,0,canvasWidth,canvasHeight);
        var offset = this.player.pos.substract( canvasWidth / 2, canvasHeight / 2);
        //console.debug(this.ox)
        ctx.translate( -offset.x, -offset.y);
        //ctx.scale( 0.5, 0.5);

        this.offset = offset;
        
        var box = { x: offset.x, y: offset.y, w: canvasWidth, h: canvasHeight};
        
        for ( var i = 0; i < this.objects.length; i++)
        {
            var obj = this.objects[i];
            obj.message("move");
            if (obj.gravityBound)
            {
                this.doLocalGravity(obj);
            }
        }
        
        
        var inScreenObjects = this.rtree.search(box);
        this.drawScene(inScreenObjects, 0);
        this.drawScene(inScreenObjects, 1);
        this.drawScene(inScreenObjects, 2);
        
        ctx.restore();
        this.drawOutsideBox(this.ctx, canvasWidth, canvasHeight);
        
    },
drawOutsideBox:
    function(ctx, canvasWidth, canvasHeight)
    {
        ctx.save();
        //ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#444";
        var topLeft = new Vector2D(this.box.x, this.box.y).substract(this.offset);
        
        //console.debug("topLeft = %o", topLeft);
        
        if (topLeft.y > 0)
        {
            ctx.fillRect(0,0,canvasWidth, topLeft.y + 1);
        }
        
        if (topLeft.x > 0)
        {
            ctx.fillRect(0,0, topLeft.x + 1, canvasHeight);
        }

        var botRgt = new Vector2D(this.box.x + this.box. w , this.box.y + this.box.h ).substract(this.offset);
        
        //console.debug("topLeft = %o", topLeft);
        
        if (botRgt.y < canvasHeight)
        {
            ctx.fillRect(0, botRgt.y - 1, canvasWidth, canvasHeight);
        }

        if (botRgt.x < canvasWidth)
        {
            ctx.fillRect(botRgt.x - 1, 0, canvasWidth, canvasHeight);
        }
        
        ctx.restore();
    },
drawScene:
    function(objects, zIndex)
    {
        for ( var i = 0, len = objects.length; i < len; i++)
        {
            var obj = objects[i];
            var ctx = this.ctx;
            if (obj.type !== "line" && obj.zIndex == zIndex)
            {
                ctx.save();
                obj.message("draw", ctx);
                ctx.restore();
            }
        }
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
    init: function(world, points, noRegister, style)
    {
        if (typeof points === "string")
        {
            // parse and use first sub path
            points = parseSubPaths(points)[0];
            console.debug("points = %o", points)
        }
    
        this._super(world);
        
        this.pos = this.pos || new Vector2D(0,0);
        this.points = points;
        this.zIndex = 1;
        this.style = style || { "strokeStyle" : "#eee", fillStyle: "#444"};
        
        if (!noRegister)
        {
            this.registerLines();
        }
    },
draw:
    function(ctx, debug)
    {
        if (debug)
            console.debug("draw polygon: %o", this.points);
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        
        var pt0, pts = this.points;
        applyStyle(ctx, this.style);
        
        pt0 = pts[0];
        ctx.beginPath();
        ctx.moveTo(pt0.x, pt0.y);
        if (debug)
            console.debug("ctx.moveTo( %d, %d);",pt0.x, pt0.y);
        for ( var i = 1, len = pts.length; i < len; i++)
        {
            var pt = pts[i];
            ctx.lineTo(pt.x,pt.y);
            if (debug)
                console.debug("ctx.lineTo(%d,%d);",pt.x,pt.y);
        }
        ctx.lineTo(pt0.x,pt0.y);
        ctx.closePath();
        
        if (this.style.fillStyle !== "none")
        {
            ctx.fill();
        }
        if (this.style.strokeStyle !== "none")
        {
            ctx.stroke();
        }
        ctx.restore();
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
        this.box = box;
        
        console.debug("register %o for %o", box, this);
        
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
        this.type = "player";
        this.zIndex = 2;
        
        this.tractorThreshold = 0.4;
        this.tractorMax = 64;
        this.tractorPow = 3.5;
        this.tractorPull = 0.005;
        this.weight= 2300;
        this.gravityBound = true;
        
        this.world.rtree.insert(this.message("getBBox"), this);        
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
        this.radius = 15;
        this.thrustPower = 92000;
        
//        this.canvasObjs[0].attr({
//            "fill": "#00f", 
//            "stroke": "#88f", 
//            "r" : this.radius, 
//            "cx" : this.pos.x , 
//            "cy" : this.pos.y});
        
    },
explode: 
    function(pos)
    {
        if (!this.dead)
        {
            this.dead = true;
            
            new Explosion(this.world, pos || this.pos.clone(), 15, this.world.player.reset, player);
        }
    },
draw:
    function(ctx)
    {
        if (!this.dead)
        {
            if (this.thrusterPos)
            {
                ctx.beginPath();
                ctx.fillStyle="#ffc";
                ctx.strokeStyle="#c00";
                ctx.arc(this.thrusterPos.x, this.thrusterPos.y, 3, 0, Math.PI*2, false);
                ctx.fill();
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.fillStyle = "#008";
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2, false);
            ctx.fill();
        }
    },    
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius);
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

            var weight = this.weight;
            var connected = this.connected;
            if (connected)
            {
                weight += this.connected.weight;
            }

            var cos = Math.cos(angle);
            var sin = Math.sin(angle);
            
            var ddx = cos * this.thrustPower / weight / 1000;
            var ddy = sin * this.thrustPower / weight / 1000;

            if (connected)
            {
                // tractor beam from the cargo to the player
                var vTractor = this.pos.substract(connected.pos);
            
                if (vTractor.isSameDirection(ddx) &&  vTractor.length() > this.tractorMax * 0.98)
                {
                    var v = new Vector2D(ddx,ddy).projectOnto(vTractor);
                    connected.dx += v.x;
                    connected.dy += v.y;
                }
            }
                
            this.dx += ddx;
            this.dy += ddy;
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
                        this.explode(closest);
                        break;
                    }                    
                }
            }
        }
        
        var ptDock = this.world.base.pos.add(25,-23);
        
        //mark(this.world, this.pos, "pOrigin")
        
        var distToBase = ptDock.substract(this.pos.x, this.pos.y ).length();
        
        if ( distToBase > 20)
        {        
            //this.dy += this.world.gravity;
            this.gravityBound = true;
        }
        else
        {
            this.gravityBound = false;
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
        
        if (this.pos.x - this.radius < worldBox.x || this.pos.x + this.radius > worldBox.x + worldBox.w || 
            this.pos.y - this.radius < this.world.box.y || this.pos.y + this.radius > worldBox.y + worldBox.h )
        {
            this.explode();
        }

        this.translate(this.dx,this.dy);

        var dist = this.radius + 1;
        this.thrusterPos = this.thrustPoint ? this.pos.substract(cos * dist, sin * dist) : null;
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
        new Bullet(this.world, this.pos.add( 
                this.dx + this.radius * Math.cos(angle), 
                this.dy + this.radius * Math.sin(angle)), angle);
    },
translate:
    function(x,y)
    {
        this.world.rtree.remove(this.message("getBBox"), this);
        this._super(x,y);
        this.world.rtree.insert(this.message("getBBox"), this);
    }
});    
    
this.Bullet = GameObject.extend({
init:
    function(world, pt, angle)
    {
        this.dx = Math.cos(angle) * 3;
        this.dy = Math.sin(angle) * 3;
        this.radius = 3;
        
        this._super(world);
        this.pos = pt;
        this.zIndex = 2;
        
        
        this.ricochet = 5;
        this.type = "bullet";
        this.world.rtree.insert(this.message("getBBox"), this);
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
        return outerBox(this.pos, 2);
    },    
move:
    function()
    {
        var newPos = this.pos.clone();

        var worldBox = this.world.box;
        
        if (this.pos.x - this.radius < worldBox.x || this.pos.x + this.radius > worldBox.x + worldBox.w)
        {
            this.dx = -this.dx;
        }
        if ( this.pos.y - this.radius < this.world.box.y || this.pos.y + this.radius > worldBox.y + worldBox.h )
        {
            this.dy = -this.dy;
        }
        
        newPos.x += this.dx;
        newPos.y += this.dy;
        
        if (!this.ricochet)
        {
            this.world.removeObject(this);
        }
        else
        {
            var box = this.message("getBBox");
            if (!box)
                return;
            var candidate, closest, distance;
            var ptBullet = newPos;
            
            var candidates = this.world.rtree.search(box);

            for ( var i = 0, len = candidates.length; i < len; i++)
            {
                var obj = candidates[i];
                switch(obj.type)
                {
                    case "sentinel":
                    case "player":
                        if (obj.pos.substract(this.pos).length() < obj.radius * 0.95)
                        {
                            obj.explode(this.pos.clone());
                        }
                        break;
                }
            }
            
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
    },
translate:
    function(x,y)
    {
        this.world.rtree.remove(this.message("getBBox"), this);
        this._super(x,y);
        this.world.rtree.insert(this.message("getBBox"), this);
    }
});

this.Base = Polygon.extend({
init:
    function(world, x, y)
    {
        this.pos = new Vector2D(x,y);
        this.fillColor = "#5a6";
        
        var candidates = world.rtree.search({x: x, y:y, w: 50, h:150});
        var best = findClosestPointInCandidates(candidates, this.pos);

        console.debug("best match = %o", best);
        
        this.pos.x = best.closest.x - 50;
        this.pos.y = best.closest.y - 4;
        this.type = "base";
        
        var pathData = "m 0 0 3.16270845,-5.0606 7.2862375,-3.1782 6.488,3.1407 7.960945,1.0325 7.436151,-1.0371 7.012796,-3.1361 6.340311,3.1723 4.108634,5.0665 0,3.707 -2,3.7071 -45.795783,0 -1.99999995,-3.7071 0,-3.707 z";
        this._super(world, pathData, true);        
        this.zIndex = 0;
        this.style = { "strokeStyle" : "none", fillStyle: "#5a6"};
        
        this.world.rtree.insert(this.message("getBBox"), this);        
    },
getBBox:
    function()
    {
        var box = this.pos.clone();
        box.w = 50;
        box.h = 16;
        return box;
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

this.Sentinel = GameObject.extend({
init:
    function(world,x,y,r)
    {
    console.debug("create Sentinel( world, %d, %d, %d)", x, y, r);
        this.pos = new Vector2D(x,y);
        this.radius = 10;
        this.observationRadius = r;
        this.reloadTime = 150;
        this.reload = 0;
        this._super(world);
        this.type = "sentinel";
        this.zIndex = 0;
        this.dead = false;
        
        this.world.rtree.insert(this.getBBox(), this);        
    },
explode: 
    function(pos)
    {
        if (!this.dead)
        {
            this.dead = true;
            var that = this;
            new Explosion(this.world, pos || this.pos.clone(), 15, function() { that.world.removeObject(that); } );
        }
    },
move:
    function()
    {
        if (!this.reload && !this.dead)
        {
            var v = this.world.player.pos.substract(this.pos);
            if ( v.length() < this.observationRadius)
            {
                var angle = this.world.player.pos.angleTo(this.pos);
                new Bullet(this.world, this.pos.add(this.radius * Math.cos(angle), this.radius * Math.sin(angle)), angle);
                this.reload = this.reloadTime;
            }
        }
        else
        {
            this.reload--;
        }
    },
draw:
    function(ctx)
    {
        ctx.beginPath();
        ctx.fillStyle="#484850";
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2, false);
        ctx.fill();
        ctx.stroke();
    },
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius);
    }
});

this.Explosion = GameObject.extend({
init:
    function(world, pos, r, fn, ctx)
    {
        this.pos = pos;
        this._super(world);
        this.radius = r;
        this.callback = fn;
        this.ctx = ctx;
        this.count = 3;
        this.zIndex = 2;
        
        this.subs = [];
        
        var angle = 0.0;
        var aMax = Math.PI * 2 / this.count;
        for (var i = this.count - 1; i >= 0; i--)
        {
            var off = this.radius * 1.3 - r * 0.9;
            angle += Math.random() * aMax;
            this.subs.push({
                r: 0, 
                dr: Math.random() * 0.5 + 1, 
                rmax: r * 1.5, x: Math.cos(angle) * off , 
                y: Math.sin(angle) * off});
            r *= 0.9;
        }
        
        this.count = 100;
        this.world.rtree.insert(this.getBBox(), this);        
    },
draw:
    function(ctx)
    {
        for ( var i = 0, len = this.subs.length; i < len; i++)
        {
             var sub = this.subs[i];
             if (sub.r > 0)
             {
                 ctx.beginPath();
                 ctx.fillStyle = "#fc4";
                 ctx.arc(
                     this.pos.x + sub.x,  
                     this.pos.y + sub.y,  
                     sub.r, 0, Math.PI*2, false);
                 ctx.fill();
             }
             
             sub.r += sub.dr;
             
             if (sub.r > sub.rmax)
             {
                 sub.dr = -sub.dr;
             }
        }
        
        if (this.count-- <= 0 && this.callback)
        {
            this.world.removeObject(this);
            this.callback.call(this.ctx || this);
        }
    },
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius);
    }
});

this.Cargo = GameObject.extend({
init:
    function(world, x, y)
    {
        this.pos = new Vector2D(x,y);
        this.connected = false;
        this.resting = true;
        this.atBase = -1;
        this.radius = 8;
        
        this._super(world);
        this.dx = 0;
        this.dy = 0;
        this.type = "cargo";
        this.zIndex = 2;
        this.weight = 100;
        this.world.rtree.insert(this.getBBox(), this);
    },
move:
    function()
    {
        var player = this.world.player;
        if (this.connected)
        {
            var vPlayer = player.pos.substract(this.pos);
            
            var len = vPlayer.length();
            
            var tractorDist = len / player.tractorMax;
            
            
            if (tractorDist >= 1)
            {
                // rotate vector to player by 90 degrees
                var vRot = new Vector2D(vPlayer.y, -vPlayer.x);

                // project movement vector onto perpendicular vPlayer
                var dNew = new Vector2D(this.dx,this.dy).projectOnto(vRot);
                
                this.dx = dNew.x;
                this.dy = dNew.y;
                
                var vPull = vPlayer.multiply( (len - player.tractorMax) / len);

                this.dx += vPull.x;
                this.dy += vPull.y;
                
                
                var massRel = this.weight / (this.weight + player.weight);
                player.dx -= vPull.x * massRel;
                player.dy -= vPull.y * massRel;
            }
        }
        
        if (!this.resting)
        {
            this.world.doLocalGravity(this);
            //this.dy += this.world.gravity;
            this.translate( this.dx, this.dy);
            
            var ptDock = this.world.base.pos.add(25,-12);
            var dist = ptDock.substract(this.pos).length();
            if (dist < this.radius * 1.75)
            {
                this.resting = true;
                this.connected = false;
                this.atBase = 100;
                player.connected = null;
                return;
            }
            
            if (player.pos.substract(this.pos).length() < player.radius + this.radius)
            {
                player.explode();
                this.explode();
                return;
            }
            
            var candidates = this.world.rtree.search(this.getBBox());
                        
            var best = findClosestPointInCandidates(candidates, this.pos);
            var pt = best.closest;
            if (pt && pt.substract(this.pos).length() < this.radius)
            {
                this.explode();
                return;
            }
            
            var worldBox = this.world.box;
            
            if (this.pos.x - this.radius < worldBox.x || this.pos.x + this.radius > worldBox.x + worldBox.w || 
                this.pos.y - this.radius < this.world.box.y || this.pos.y + this.radius > worldBox.y + worldBox.h )
            {
                this.explode();
            }
            
        }
    },
remove:
    function()
    {
        var world = this.world;
        var player = world.player;
        
        if (player.connected === this)
        {
            player.connected = null;
        }
    },
explode:
    function()
    {
        this.world.removeObject(this);
        new Explosion(this.world, this.pos.clone(), this.radius);
    },
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius);
    },
translate:
    function(x,y)
    {
        this.world.rtree.remove(this.getBBox(), this);
        this._super(x,y);
        this.world.rtree.insert(this.getBBox(), this);
    },
draw:
    function(ctx)
    {
        
        if (this.connected)
        {
            var pos= this.world.player.pos;
            
            var delta = pos.substract(this.pos);
            var delta = delta.multiply(this.world.player.radius / delta.length());
            
            pos = pos.substract(delta);
            
            ctx.strokeStyle = "#fff";
            ctx.beginPath();
            ctx.moveTo(player.pos.x, player.pos.y);
            ctx.lineTo(this.pos.x, this.pos.y);
            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.fillStyle = this.connected ? "#c80" : "#080";
        
        if (this.atBase > 0)
        {
            ctx.fillStyle = "#0f0";
            if (--this.atBase == 0)
            {
                this.world.removeObject(this);
            }
        }
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2, false);       
        ctx.fill();
    }
});

this.GravPoint = Class.extend({
init:
    function(world, x, y, r)
    {
        this.pos = new Vector2D(x,y);
        this.radius = r;
        this.force = 600;
        world.addGravSource(this);
    },
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius)
    },
doGravity:
   function(obj)
   {
        var vObject = obj.pos.substract(this.pos);
        var distance = vObject.length();
        if (distance < this.radius)
        {
            var vNorm = vObject.multiply(-1/distance);
            var dSquared = distance * distance;
            obj.dx += vNorm.x * this.force  / dSquared; 
            obj.dy += vNorm.y * this.force / dSquared; 
        }
   }
});

})();

