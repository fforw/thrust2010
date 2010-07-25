/*!
 * Thrust 2010 Copyright (C) 2010 by Sven Helmberger.
 * 
 * This software is licensed under the AGPL license. 
 * project root for LICENSE AND README.
 * 
 */
(function()
{
    
var markers = [];

this.Marker = Class.extend({
init:    
    function(x,y, col)
    {
        this.x = x;
        this.y = y;
        this.col = col || "#f0f";
        
        markers.push(this);
    }
});

var OVERVIEW_SCALE = 0.475;
var INV_OVERVIEW_SCALE = 1 / OVERVIEW_SCALE;

var $wnd = $(window), $holder;

var svgFactories = [];

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



this.SvgFactory = Class.extend({
init:
    function(fn)
    {
        this.create = fn;
        svgFactories.push(this);
    },
getRegistered:
    function()
    {
        return svgFactories;
    },
/*
create:
    function(world, $elem, name)
    {
    },
 */    
readCircleData:    
    function($elem)
    {
        var data = { 
            x: (+$elem.attr("sodipodi:cx")),
            y: (+$elem.attr("sodipodi:cy")),
            rx: (+$elem.attr("sodipodi:rx")),
            ry: (+$elem.attr("sodipodi:ry")) };
        
        var transform = parseTransform($elem);
        if (transform)
        {
            data.x += transform.x;
            data.y += transform.y;
        }
        return data;
    },
svgStyle:
    function($elem, name)
    {
        var styles = $elem.data("svgStyles");
        if (!styles)
        {
            styles = {};
            
            var re = /\s*([a-zA-Z-]+)\s*:\s*([^;]*)\s*(?:;|$)/g;
            var s = $elem.attr("style");
            while (m = re.exec(s))
            {
                styles[m[1]] = m[2];
            }
            $elem.data("svgStyles", styles);
        }
        return styles[name];   
    },
readStyle:    
    function($elem)
    {
        var style = {};
        
        style.fillStyle = this.svgStyle($elem, "fill") || "#f0f";
        style.strokeStyle = this.svgStyle($elem, "stroke") || "none";
    
        return style;
    }
});

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

var lastScrollOffset = new Vector2D(0,0);

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
insertLineBox: 
    function(pt0, pt1)
    {
        var rtree = this.rtree, x, y, w, h;
        // console.debug("pt0 = %d, %d, pt1 = %d, %d", pt0.x, pt0.y, pt1.x,
        // pt1.y)

        if (pt0.x < pt1.x)
        {
            x = pt0.x;
            w = pt1.x - pt0.x;
        } else
        {
            x = pt1.x;
            w = pt0.x - pt1.x;
        }

        if (pt0.y < pt1.y)
        {
            y = pt0.y;
            h = pt1.y - pt0.y;
        } else
        {
            y = pt1.y;
            h = pt0.y - pt1.y;
        }

        var box = {
        "x" : x,
        "y" : y,
        "w" : Math.max(0.001,w),
        "h" : Math.max(0.001,h)
        };
        var obj = {
        "type" : "line",
        "pt0" : pt0,
        "pt1" : pt1
        };
        rtree.insert(box, obj);
    },
fromScreen:
    function(ptScreen)   
    {
       if (!ptScreen)
           return null;
       
       if (this.overview)
       {
           return ptScreen.multiply(INV_OVERVIEW_SCALE);
       }
       else
       {
           return ptScreen.add(this.offset);
       }
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
                var old = obj.pos.clone();
                var did = grav.doGravity(obj);
                if (did)
                {
                    inLocal = true;
                    break;
                }
            }
       }
       if (!inLocal)
       {
           obj.dy += this.gravity;
       }
    },
scoreObjsCount: 0,
addObject:
    function(obj)
    {
        this.objects.push(obj);
        
        if (obj.score)
        {
            this.scoreObjsCount++;
        }
    },
removeObject:
    function(obj)
    {
        var objScore = obj.score;
        if (objScore)
        {
            this.score += (typeof objScore === "number" ? objScore : objScore.call(obj));
            this.scoreObjsCount--;
        }

        obj.message("remove");
                
        removeFromArray(this.objects, obj);
        
        var box = obj.message("getBBox");
        if (box)
        {
            this.rtree.remove(box, obj);
        }
    },
createSubPaths:
    function(pathData,style, xOff, yOff)
    {
        xOff = xOff || 0;
        yOff = yOff || 0;
        
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
                    if (xOff !== 0 || yOff !== 0)
                    {
                        for ( var i = 0, len = points.length; i < len; i++)
                        {
                            var pt = points[i];
                            pt.x += xOff;
                            pt.y += yOff;
                        }
                    }
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
score: 0,
lives: 4,
borrowed: false,
ox:0,oy:0,

step:
    function()
    {
        for ( var i = 0; i < this.objects.length; i++)
        {
            var obj = this.objects[i];
            obj.message("move");
            if (obj.gravityBound)
            {
                var old = obj.pos;
                this.doLocalGravity(obj);
                
                if (obj.feelGravity)
                {
                    var delta = obj.pos.substract(old);
                    obj.feelGravity(delta);
                }
            }
        }
    },
draw:
    function()
    {
        var ctx = this.ctx;
        ctx.save();
        
        var canvasWidth = this.$canvas[0].width;
        var canvasHeight = this.$canvas[0].height;
        
        ctx.clearRect(0,0,canvasWidth,canvasHeight);
        var offset = this.player.pos.substract( canvasWidth / 2, canvasHeight / 2);
        
        var player = world.player;
        var pos = player.thrustPoint || player.thrustHelp; 
        if ( pos )
        {
            var v = offset.substract(lastScrollOffset);
            if (player.thrustPoint)
            {
                player.thrustPoint = player.thrustPoint.add(v);
            }
            else if (player.thrustHelp)
            {
                player.thrustHelp = player.thrustHelp.add(v);
            }
        }
        
        lastScrollOffset = offset;
        //console.debug(this.ox)
        
        if (this.overview)
        {        
            ctx.scale( OVERVIEW_SCALE, OVERVIEW_SCALE);
        }
        else
        {
            ctx.translate( -offset.x, -offset.y);
        }

        this.offset = offset;
        
        var box = this.overview ? this.box : { x: offset.x, y: offset.y, w: canvasWidth, h: canvasHeight};
        
        var inScreenObjects = this.rtree.search(box);
        this.drawScene(inScreenObjects, 0);
        this.drawScene(inScreenObjects, 1);
        this.drawScene(inScreenObjects, 2);
        
        if (markers.length > 0)
        {
            ctx.save();
            for ( var i = 0, len = markers.length; i < len; i++)
            {
                var m = markers[i];
                ctx.fillStyle = m.col;
                ctx.beginPath();
                ctx.arc(m.x, m.y, 4, 0, Math.PI*2, false);
                ctx.fill();
            }
            ctx.restore();
        }
        
        ctx.restore();
        if (!this.overview)
        {
            this.drawOutsideBox(this.ctx, canvasWidth, canvasHeight);
        }
        
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "15px sans-serif bold";
        ctx.fillText("Score: " + this.score, 80, 20);
        
        if (this.lives < 0)
        {
            ctx.fillText("GAME OVER", canvasWidth / 2, canvasHeight / 2);
        }

        ctx.fillStyle = "#008";
        for (var i=0; i < this.lives; i++)
        {
            ctx.beginPath();
            ctx.arc(10 + i * 15, 15, 5, 0, Math.PI*2, false);
            ctx.fill();
        }
        ctx.restore();
    },
drawOutsideBox:
    function(ctx, canvasWidth, canvasHeight)
    {
        ctx.save();
        //ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = this.outsideBoxStyle;
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
    
this.GameObject = Class.extend({
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
    },
onTypeCreation:    
    function()
    {
        var fn = this.fromSvg;
        if (fn)
        {
            new SvgFactory(fn);
            delete this.fromSvg;
        }
    }
});    

this.Polygon = GameObject.extend({
    init: function(world, points, noRegister, style)
    {
        if (typeof points === "string")
        {
            // parse and use first sub path
            points = parseSubPaths(points)[0];
//            console.debug("points = %o", points)
        }
    
        this.world = world;
        this.pos = this.pos || new Vector2D(0,0);
        this.points = points;
        this.zIndex = 1;
        this.type = "scene";
        this.style = style || { "strokeStyle" : "#eee", fillStyle: "#444"};
        
        if (!noRegister)
        {
            this.registerLines();
        }
    },
fromSvg:
    function(world, $elem, name)
    {
        if (name === "#scene")
        {
            var pathData = $elem.attr("d");
            var transform = parseTransform($elem) || new Vector2D(0,0);
            
            var style = this.readStyle($elem);
            if (!world.outsideBoxStyle)
            {
                world.outsideBoxStyle = style.fillStyle;
            }
            world.createSubPaths(pathData, style, transform.x, transform.y);
            return true;
        }
        return false;
    },
draw:
    function(ctx, debug)
    {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        
        var pt0, pts = this.points;
        applyStyle(ctx, this.style);
        
        pt0 = pts[0];
        ctx.beginPath();
        ctx.moveTo(pt0.x, pt0.y);
        for ( var i = 1, len = pts.length; i < len; i++)
        {
            var pt = pts[i];
            ctx.lineTo(pt.x,pt.y);
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
            
            this.world.insertLineBox(pt0, pt1);
            box.extend(pt0,pt1);
        }
        var ptLast = pts[ pts.length - 1 ];
        this.world.insertLineBox( ptLast, pts[0]);
        this.box = box;
        
//        console.debug("register %o for %o", box, this);
        
        this.world.rtree.insert(box, this);
    },
getBBox:
    function()
    {
        return this.box;
    }   
});    

function randomColor()
{
    return "rgb(" + Math.random() * 255 + "," + Math.random() * 255 + "," + Math.random() * 255 + ")";
}

this.Ship = GameObject.extend({
init: function(world,initX,initY)
    {    
        this._super(world);
        this.initX = initX;
        this.initY = initY;        
        this.reset();
        this.type = "player";
        this.zIndex = 2;
        this.radius = 15;
        
        this.tractorMax = 64;
        this.weight= 2300;
        this.gravityBound = true;
        
        this.world.rtree.insert(this.message("getBBox"), this);        
    },
reset:
    function()
    {
        if (this.world.lives >= 0)
        {
            this.pos = new Vector2D( this.initX, this.initY);
            
            this.dx = 0;
            this.dy = 0;
            this.dead = false;
            this.radius = 15;
            this.thrustPower = 92000;
            
            if (this.connected)
            {
                this.connected.connected = false;
                this.connected = null;
            }
            this.thrustPoint = null;
        }
    },
explode: 
    function(pos)
    {
        if (!this.dead)
        {
            this.dead = true;
            var that = this;
            new Explosion(this.world, pos || this.pos.clone(), 15, 
                function() 
                { 
                    if (that === that.world.player)
                    {
                        that.world.lives--;
                        that.world.player.reset();
                    }
                    else
                    {
                        that.world.removeObject(that);
                    }
                });
        }
    },
draw:
    function(ctx)
    {
        if (!this.dead)
        {
            var thrusterActive = this.thrustPoint;
            var pos = thrusterActive ? this.thrustPoint : this.thrustHelp;
            
            if (pos)
            {
                ctx.beginPath();
                
                ctx.fillStyle= thrusterActive ? "#ffc" : "#aa8000";
                ctx.strokeStyle= thrusterActive ? "#c00" : "#400";
    
                var v = this.pos.substract(pos);
                var length = v.length();
                v = v.multiply((this.radius + 1) / length);
                v = this.pos.substract(v);
                
                ctx.arc(v.x, v.y, thrusterActive ? 3 : 2, 0, Math.PI*2, false);
                ctx.fill();
                ctx.stroke();
            }

            ctx.beginPath();
            var isPlayer = this === this.world.player;
            if (isPlayer)
            {
                // player ship style
                ctx.fillStyle = "#008";
            }
            else
            {
                // alien ship style
                ctx.fillStyle="#700";
                ctx.strokeStyle="#f0f";
            }
            
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2, false);
            ctx.fill();
            if (!isPlayer)
            {
                ctx.stroke();
            }
        }
    },    
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius);
    },   
calculateThrustPower:
    function()
    {
        var weight = this.weight;
        var connected = this.connected;
        if (connected)
        {
            weight += connected.weight;
        }
        return this.thrustPower / weight / 1000;
    },
move:
    function()
    {
        if (this.dead)
            return;
        
        var point = this.thrustPoint; 
        if (point)
        {
            var delta = new Vector2D(this.pos.x - point.x, this.pos.y - point.y).norm();
            

            var power = this.calculateThrustPower();
            var ddx = delta.x * power;
            var ddy = delta.y * power;

            var connected = this.connected;
            if (connected)
            {
                // tractor beam from the cargo to the player
                var vTractor = this.pos.substract(connected.pos);
            
                if (vTractor.isSameDirection(ddx,ddy) &&  vTractor.length() > this.tractorMax * 0.98)
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
                else
                {
                    this.atRest = true;
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

    },
thrust:
    function(point, active)
    {
        if (this.dead)
        {
            return;
        }
        
        if (point)
        {
            if (active)
            {
                this.thrustPoint = this.world.fromScreen(point);
                this.thrustHelp = null;
            }
            else
            {
                this.thrustPoint = null;
                this.thrustHelp = this.world.fromScreen(point);
            }
        }
        else
        {
            this.thrustHelp = this.thrustPoint; 
            this.thrustPoint = null;
        }
    },
shoot:
    function(point)
    {
        if (this.dead)
        {
            return;
        }
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
                    case "alien":
                        if (obj.pos.substract(this.pos).length() < obj.radius * 0.95)
                        {
                            obj.explode(this.pos.clone());
                            this.world.removeObject(this);
                            return;
                        }
                        break;
                    case "bullet":
                        if (obj.pos.substract(this.pos).length() < obj.radius)
                        {
                            if (obj !== this)
                            {
                                this.world.removeObject(obj);
                                this.world.removeObject(this);
                                return;
                            }
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
        
        var candidates = world.rtree.search({x: x - 25, y: y - 50, w: 50, h:100});
        var best = findClosestPointInCandidates(candidates, this.pos);

        if (!best.closest)
        {
            throw new Error("No ground below base");
        }
        
        //new Marker(best.closest.x, best.closest.y);
        
        this.pos.x = best.closest.x - 25;
        this.pos.y = best.closest.y - 4;
        this.type = "base";
        
        var pathData = "M 0 0 m 3.16270845,-5.0606 7.2862375,-3.1782 6.488,3.1407 7.960945,1.0325 7.436151,-1.0371 7.012796,-3.1361 6.340311,3.1723 4.108634,5.0665 0,3.707 -2,3.7071 -45.795783,0 -1.99999995,-3.7071 0,-3.707 z";
        this._super(world, pathData, true);        
        this.zIndex = 0;
        this.style = { "strokeStyle" : "none", fillStyle: "#5a6"};
        
        this.world.rtree.insert(this.message("getBBox"), this);        
    },
fromSvg:
    function(world, $elem, name)
    {
        if (name.indexOf("#start") === 0)
        {
//            console.debug("is #start");
            return function() {
//                console.debug("create base");
                var base = new Base(world, (+$elem.attr("x")), (+$elem.attr("y")));
                world.base = base; 
            };
        }
        return false;
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
score: 200,    
init:
    function(world,x,y,r)
    {
//    console.debug("create Sentinel( world, %d, %d, %d)", x, y, r);
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
fromSvg:
    function(world, $elem, name)
    {
        if (name === "#sentinel")
        {
            var data = this.readCircleData($elem);
            new Sentinel(world, data.x, data.y, (data.rx + data.ry) / 2);
            return true;
        }
        return false;
    },
explode: 
    function(pos)
    {
        if (!this.dead)
        {
            this.dead = true;
            var that = this;
            new Explosion(this.world, pos || this.pos.clone(), 15, 
                function() 
                { 
                    that.world.removeObject(that); 
                });
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
    function(world, pos, r, fn)
    {
        this.pos = pos;
        this._super(world);
        this.radius = r;
        this.callback = fn;
        this.count = 3;
        this.zIndex = 2;
        this.type="explosion";
        
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
    },
move:
    function()
    {
        if (this.count-- <= 0)
        {
            this.world.removeObject(this);
            if (this.callback)
            {
                this.callback.call(this);
            }
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
score:
    function()
    {
        return this.atBase === 0 ? 1000 : 0; 
    },
fromSvg:
    function(world, $elem, name)
    {
        if (name === "#cargo")
        {
            var x = (+$elem.attr("sodipodi:cx"));
            var y = (+$elem.attr("sodipodi:cy"));

            var transform = parseTransform($elem);
            
            if (transform)
            {
                x += transform.x;
                y += transform.y;
            }
            new Cargo(world, x,y);
            return true;
        }
        return false;
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
            if (dist < this.radius * 2)
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
        
        if (this.atBase > 0)
        {
            if (--this.atBase == 0)
            {
                this.world.removeObject(this);
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
        }
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI*2, false);       
        ctx.fill();
    }
});

this.GravPoint = GameObject.extend({
init:
    function(world, x, y, r, force)
    {
//        console.debug("gravpoint force = %d", force);
    
        this.pos = new Vector2D(x,y);
        this.radius = r;
        this.force = force || 600;
        this.type="gravpoint";
        world.addGravSource(this);
    },
getBBox:
    function()
    {
        return outerBox(this.pos, this.radius)
    },
fromSvg:
    function(world, $elem, name)
    {
        if (name === "#gravpoint")
        {
            var force = +$elem.attr("force");
            var data = this.readCircleData($elem);
            
            var data = svgJSON($elem);
            new GravPoint(world, data.x, data.y, (data.rx + data.ry) / 2, data.force);
            return true;
        }
        return false;
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
            return true;
        }
        return false;
   }
});

this.GravBox = GameObject.extend({
init:
    function(world, pt0, pt1, h, clockwisity, force)
    {
    
        this.world = world;
        this.pt0 = pt0;
        this.pt1 = pt1;
        this.height = h;
        this.clockwisity = clockwisity;
        this.force = force || 50;
        
        this.type = "gravbox";

        this.box = new BBox();
        
        var v = pt1.substract(pt0).norm().multiply(h);

//        console.debug("gravbox v = %o", v);
        
        var ext0 = pt0.substract(v);
        var ext1 = pt1.add(v);
        
        var vRot = this.clockwisity ? new Vector2D(-v.y, v.x) : new Vector2D(v.y, -v.x) ; 
        
        var ext2 = ext0.add(vRot);
        var ext3 = ext1.add(vRot);
        
//        new Marker(ext0.x,ext0.y);
//        new Marker(ext1.x,ext1.y);
//        new Marker(ext2.x,ext2.y);
//        new Marker(ext3.x,ext3.y);
        
        this.box.extend(ext0,ext1,ext2,ext3);
        
        world.addGravSource(this);
    },
getBBox:
    function()
    {
        return this.box;
    },
fromSvg:
    function(world, $elem, name)
    {
        if (name === "#gravbox")
        {
            var pathData = $elem.attr("d");
            
            // points from first sub path
            var pts = parseSubPaths(pathData)[0];
            
            var pt0 = pts[0];
            var pt1 = pts[1];
            var clockwisity;
            
            var max = 0;
            for ( var i = 2, len = pts.length; i < len; i++)
            {
                var pt = pts[i];
                
                var dist = closestPointOnLine(pt, pt0, pt1).substract(pt).length();
                if (dist > max)
                {
                    max = dist;
                    if (clockwisity === undefined)
                    {
                        clockwisity = clockwise(pt0, pt1, pt);
                    }
                }
            }
            
            var data = svgJSON($elem);
            new GravBox(world, pt0, pt1, max, clockwisity, data.force);
            
            return true;
        }
        return false;
    },
doGravity:
    function(obj)
    {
        var vLine = closestPointOnLineSegment(obj.pos, this.pt0, this.pt1).substract(obj.pos);
        var distance = vLine.length();
        
        if (distance < this.height && clockwise(this.pt0, this.pt1, obj.pos) == this.clockwisity)
        {
            var vNorm = vLine.multiply(1/distance);
            var dSquared = distance * distance;
            obj.dx += vNorm.x * this.force  / dSquared; 
            obj.dy += vNorm.y * this.force / dSquared; 
            return true;
        }
        return false;
    }
});


})(window,jQuery);

