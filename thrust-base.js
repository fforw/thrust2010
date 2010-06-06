(function()
{
    
function bbox(obj)
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
           this.rtree.remove( bbox(obj), obj);
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
     
        for (var i=0, len = this.canvasObjs.length; i < len ; i++)
        {
            var bbox = bbox(canvasObjs[i]); 
            world.rtree
        }
        return bboxes;
        
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
    },
getBoundingBoxes:
    function()
    {
    }
});    

this.Player = GameObject.extend({
init: function(world)
    {    
        this.radius = 10;
        var circle = world.paper.circle(0, 0, 10).attr({"fill": "#00f", stroke: "#88f"});
        this._super(world,circle);
        this.dx = 0;
        this.dy = 0;
        this.thrustPower = 40;
    },
move:
    function()
    {
        this.translate(this.dx,this.dy);
        
        var point = this.thrustPoint; 
        if (point)
        {
            var deltaX =  this.x - point.x;
            var deltaY =  this.y - point.y;
            
            //console.debug("%o", [deltaX, deltaY] )
            
            var angle = Math.atan2(deltaY, deltaX);
            this.dx += Math.cos(angle) * this.thrustPower / 1000;
            this.dy += Math.sin(angle) * this.thrustPower / 1000;
        }
        
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