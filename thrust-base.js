(function()
{
    
function convertBBox(obj)
{
    var raphBBox = obj.getBBox();
    return {x: raphBBox.x, y: raphBBox.y, w:raphBBox.width, h: raphBBox.height};
}

function removeThis()
{
    this.remove();
}

function subExplode( d, millis, sizeStart, sizeEnd)
{
    var subAngle = Math.random() * Math.PI * 2;
    var dist = this.radius * d;

    this.world.paper.circle(this.pos.x + Math.cos(subAngle) * dist,
            this.pos.y + +Math.sin(subAngle) * dist,
            this.radius * sizeStart).attr( {
        "fill" : "#fc8",
        stroke : "#800",
        "fill-opacity" : 0.1
    })

    .animate( {
        "fill" : "#ffc",
        "stroke" : "#f00",
        "r" : this.radius * sizeEnd,
        "fill-opacity" : 0.8
    }, millis, d == 0 ? "bounce" : "linear", removeThis);
}

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
   function(paper)
   {
        this.paper = paper;
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
           this.rtree.remove( convertBBox(obj), obj);
           obj.remove();
       }
       removeFromArray(this.objects, obj);
    },
step:
    function()
    {
        for ( var i = 0, len = this.objects.length; i < len; i++)
        {
            var obj = this.objects[i];
            if (typeof obj.move === "function")
            {
                obj.move();
            }
        }
    }
});    
    
var GameObject = Class.extend({
init: function(world)
    {     
        this.world = world;
        this.canvasObjs = Array.prototype.slice.call(arguments, 1);
        this.pos = new Vector2D(0,0);
        world.addObject(this);
    },
translate:
    function(x,y)
    {
        var pos = this.pos;
        pos.x += x;
        pos.y += y;
        
        for (var i = 0, len = this.canvasObjs.length ; i < len ; i++)
        {
            this.canvasObjs[i].translate(x,y);
        }
    },
registerCanvasObjects:
    function(type)
    {
        var rtree = this.world.rtree;
        var canvasObjs = this.canvasObjs;
        this.type = type;
        for (var i=0, len = canvasObjs.length; i < len ; i++)
        {
            var box = convertBBox(canvasObjs[i]); 
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
        
        // readback converted path Data
        var pathData = path.attr("path");
        
        this.points = [];
        
        for ( var i = 0, len = pathData.length; i < len; i++)
        {
            var cmd = pathData[i];
            
            if (cmd.length == 3)
            {
                this.points.push(new Vector2D(+cmd[1],+cmd[2]));
            }
        }
        
        if (attrs)
        {
            path.attr(attrs);
        }
        
        this._super(world,path);
        
        this.registerLines();
    },
registerLines:
    function()
    {
        var bboxes = [];
        for ( var i = 0, len = this.points.length - 1; i < len; i++)
        {
            var pt0 = this.points[i];
            var pt1 = this.points[i+1];
            
            this.insertLineBox(pt0,pt1);
        }
        this.insertLineBox(this.points[this.points.length-1], this.points[0]);
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
        
        var paper = this.world.paper;
        
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
init: function(world)
    {    
        this.radius = 10;
        var circle = world.paper.circle(0, 0, 10).attr({"fill": "#00f", stroke: "#88f"});
        this.dx = 0;
        this.dy = 0;
        this.thrustPower = 40;
        
        this._super(world,circle);
        this.registerCanvasObjects("player");
    },
explode : 
    function()
    {

        var paper = this.world.paper;


        this.canvasObjs[0].hide();
        this.dead = true;

        subExplode.call(this, 0.9, 400, 0.2, 2.4);
        subExplode.call(this, 1.2, 500, 0.3, 2.1);
        subExplode.call(this, 0.0, 600, 1.0, 2.5);
        
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
        
        var box = convertBBox(this.canvasObjs[0]);
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
        
        this.dy += this.world.gravity;
        
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
        
        var scrollX = this.x - paperWidth / 2;
        var scrollY = this.y - paperHeight / 2;
     
        var $wnd = $(window);
        var maxX = paperWidth - $wnd.width();
        var maxY = paperHeight - $wnd.height();
        
        if (scrollX < 0)
        {
            scrollX = 0;
        }
        else if (scrollX > maxX)
        {
            scrollX = max;
        }    
        if (scrollY < 0)
        {
            scrollY = 0;
        }
        else if (scrollY > maxY)
        {
            scrollY = maxY;
        }    
        
        $("#holder").scrollTop(scrollY).scrollLeft(scrollX);
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
        
        new Bullet(world, this.pos.clone(), angle);
    }
});    
    
this.Bullet = GameObject.extend({
init:
    function(world, pt, angle)
    {
        this.dx = Math.cos(angle) * 4;
        this.dy = Math.sin(angle) * 4;
        this.radius = 4;
        
        var circle = world.paper.circle(pt.x, pt.y, this.radius).attr({"fill":"#fffff8", "stroke":"#fc8"});
        this._super(world, circle);
        this.pos = pt;
        
        
        this.ricochet = 5;
    },
move:
    function()
    {
        var paper = this.world.paper;
     
        if (this.pos.x - this.radius < 0 || this.pos.x + this.radius > paper.width)
        {
            this.dx = -this.dx;
            this.ricochet--;
        }
        if (this.pos.y - this.radius < 0 || this.pos.y + this.radius > paper.height )
        {
            this.dy = -this.dy;
            this.ricochet--;
        }
        
        this.pos.x += this.dx;
        this.pos.y += this.dy;
        
        if (!this.ricochet)
        {
            world.removeObject(this);
        }
        else
        {
            var box = convertBBox(this.canvasObjs[0]);
            var candidate;
            
            var candidates = this.world.rtree.search(box);

            //console.debug("candidates = %o, len = %s", candidates, candidates.length);
            var minDistance = Infinity, bestCandidate;
            for ( var i = 0, len = candidates.length; i < len; i++)
            {
                candidate = candidates[i];
                if (candidate && candidate.type === "line")
                {
                    var ptBullet = this.pos;
                    var closest = closestPointOnLineSegment(ptBullet, candidate.pt0, candidate.pt1);
                    
                    var distance = closest.substract(ptBullet).length();
                    if (distance < minDistance)
                    {
                        minDistance = distance;
                        bestCandidate = candidate;
                    }
                }
            }
            
            if (minDistance < this.radius)
            {
                candidate = bestCandidate;
                distance = minDistance;

                
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
                
                //    \ v2   
                //     \   
                //     |\  
                //     | \v 
                //     |  \
                //   r |  |\ 
                //     |  | \ v1
                //     | d|  \
                //     |  |   \
                //     +--+----*--------
                //
                // calculate length of v1 by |v1| = OPPOSITE / sin(angle) 
                
                
                var v1Len = distance / Math.sin(angle) ;
                
                // Intercept theorem says that |v1| / d = (|v1| + |v| - |v2| ) / r, solve for |v2|
                // |v2| = |v1| + |v| - |v1| * r / d
                
                var v2Len = v1Len + vLen - v1Len * this.radius / distance;

                var remainder = vLen - v2Len;

                // move back bullet to tangent point
                var vBack = vNorm.multiply(-remainder);
                this.pos.x += vBack.x;
                this.pos.y += vBack.y;
                
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
            this.canvasObjs[0].attr({cx: this.pos.x, cy: this.pos.y});
        }
    }
});
})();