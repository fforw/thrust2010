(function()
{
    
function convertBBox(obj)
{
    var raphBBox = obj.getBBox();
    return {x: raphBBox.x, y: raphBBox.y, w:raphBBox.width, h: raphBBox.height};
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
    
    return array.splice(idx,1);
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
       this.objects = removeFromArray(this.objects, obj);
       
       for (var i = 0, len = obj.canvasObjs.length ; i < len ; i++)
       {
           var obj = obj.canvasObjs[i];
           this.rtree.remove( convertBBox(obj), obj);
       }
    }
});    
    
var GameObject = Class.extend({
init: function(world)
    {     
        this.world = world;
        this.canvasObjs = Array.prototype.slice.call(arguments, 1);
        this.x = 0;
        this.y = 0;
        world.addObject(this);
    },
translate:
    function(x,y)
    {
        this.x += x;
        this.y += y;
        
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
        for (var i=0, len = canvasObjs.length; i < len ; i++)
        {
            var box = convertBBox(canvasObjs[i]); 
            rtree.insert(box, {"type": type, "gameObject": this, "canvasObj": canvasObjs[i]});
        }
    }
});    

this.Polygon = GameObject.extend({
    init: function(world, points, attrs)
    {
        this.points = points;
        var l=[];
        
        l.push("M", points[0].x, ",", points[0].y);
        for (var i=1, len = points.length; i < len; i++)
        {
            var p = points[i];
            l.push("L", p.x, ",", p.y);
        }
        l.push(" Z");
        var pathData = l.join("");
        //console.debug(pathData);
        var path = world.paper.path(pathData);
        
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
        var offX = paper.width / 2;
        var offY = paper.height / 2;
        
        var box = { "x": x, "y": y, "w": w, "h": h};
        var obj = {"type":"line", "pt0": pt0, "pt1": pt1 , "bboxRect": this.world.paper.rect(x + offX,y + offY,w,h).attr("stroke", "#080").hide()};
        //console.debug("box: %d, %d - %d x %d", box.x + offX,box.y + offY,box.w,box.h );
        rtree.insert( box, obj);
    }    
});    
function randomColor()
{
    return "rgb(" + Math.random() * 255 + "," + Math.random() * 255 + "," + Math.random() * 255 + ")";
}

var playerBBox, lastCandidates;

this.Player = GameObject.extend({
init: function(world)
    {    
        this.radius = 10;
        var circle = world.paper.circle(0, 0, 10).attr({"fill": "#00f", stroke: "#88f"});
        this.dx = 0;
        this.dy = 0;
        this.thrustPower = 40;
        
        this._super(world,circle);
        //this.registerCanvasObjects("player");
    },
explode:
    function()
    {
        this.dead = true;
        this.canvasObjs[0].animate({"fill": "#fcc", "stroke": "#f00", "r": this.radius * 3, "stroke-width": 10, "stroke-opacity": 0.3}, 500, "bounce", function()
        {
            this.hide();
        })
    },
move:
    function()
    {
        if (this.dead)
            return;
        
        this.translate(this.dx,this.dy);
        
        var point = this.thrustPoint; 
        if (point)
        {
            var deltaX = this.x - point.x;
            var deltaY = this.y - point.y;
            
            
            var angle = Math.atan2(deltaY, deltaX);
            //console.debug("angle = %d", angle );
            this.dx += Math.cos(angle) * this.thrustPower / 1000;
            this.dy += Math.sin(angle) * this.thrustPower / 1000;
        }
        
        var box = convertBBox(this.canvasObjs[0]);
        var paper = this.world.paper;
        var offX = paper.width / 2;
        var offY = paper.height / 2;
        
        box.x -= offX;
        box.y -= offY;
        var candidates = this.world.rtree.search(box);
        
//        if (candidates.length > 0)
//        {
//            console.debug("candidates = %o", candidates);
//        }
        
//        if (!playerBBox)
//        {
//            playerBBox = paper.rect(box.x + offX,box.y,box.w,box.h).attr("stroke", "#800");
//        }
//        else
//        {
//            playerBBox.attr({"x": box.x + offX, "y": box.y + offY});
//        }

        if (lastCandidates != null)
        {
            for ( var i = 0, len = lastCandidates.length; i < len; i++)
            {
                var candidate = lastCandidates[i];
                if (candidate.bboxRect)
                {
                    candidate.bboxRect.hide();
                }
            }
        }
        
        for ( var i = 0, len = candidates.length; i < len; i++)
        {
            var candidate = candidates[i];
            if (candidate.bboxRect)
            {
                candidate.bboxRect.show();
                
                if (candidate.pt0 && candidate.pt1)
                {
                    //console.debug("%d,%d - %d, %d  - %d, %d", this.x, this.y, candidate.pt0.x, candidate.pt0.y, candidate.pt1.x, candidate.pt1.y)
                    
                    var ptPlayer = new Vector2D(this.x - offX, this.y - offY);
                    var closest = closestPointOnLineSegment(ptPlayer, candidate.pt0, candidate.pt1);
                    
                    var distance = closest.substract(ptPlayer).length();
                    
                    if (distance < this.radius)
                    {
                        player.explode();
                    }                    
                }
            }
        }
        
        lastCandidates = candidates;
        
        this.dy += this.world.gravity;
        
        if (this.x - this.radius < 0 || this.x + this.radius > this.world.paper.width)
        {
            this.dx = -this.dx;
        }
        if (this.y - this.radius < 0 || this.y + this.radius > this.world.paper.height )
        {
            this.dy = -this.dy;
        }
        
    },
thrust:
    function(point)
    {
        this.thrustPoint = point;
    }
});    
    
})();