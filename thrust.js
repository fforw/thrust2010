var paper, world, player;
(function($,window,undefined)
{
    
var FRAMES_PER_SECOND = 24;
var STEPS_PER_SECOND = 25;

var STEP_TIME = 1000 / STEPS_PER_SECOND;
var FRAME_TIME = 1000 / STEPS_PER_SECOND;

function points()
{
    var l = [];
    for (var i=0, len = arguments.length; i < len; i+=2 )
    {
        l.push( new Vector2D( arguments[i], arguments[i+1]));
    }
    return l;
}

var mouseDown;

var world;

function getParameter(name)
{
    var m = new RegExp("(?:&|\\?)" + name + "=([^&]+)(?:&|$)").exec(location.search);
    if (m)
    {
        return m[1];
    }
    else
    {
        return false;
    }
}

var $canvas, canvasOffset, animationTime = null;

window.Thrust = {
init:
    function()
    {
        if (!window.console)
        {
            window.console = {};
            var dummy = function() {};
            var names = "log debug error warn trace".split(" ");
            for ( var i = 0, len = names.length; i < len; i++)
            {
                window.console[names[i]] = dummy;
            } 
        }
    
        var levelURL = getParameter("level") || "levels/cave.svg";
    
        world = new World("teh_canvas");
        world.overview = !!(getParameter("overview") || false);
        
        var delayed = [];
        
        $.ajax({
            url: levelURL, 
            dataType: "xml", 
            success:function(data) 
            { 
                var playerX = 0, playerY = 0;
                
                //console.debug(data);
                
                var svgFactories = SvgFactory.prototype.getRegistered();
                
                console.debug("svgFactories = %o", svgFactories);
                console.debug("polex = %o", Polygon.extend);
                
                $("path,rect", data.documentElement).each(function(){
                    
                    var $elem = $(this);
                    
                    var name = $elem.attr("inkscape:label");
                    var worldBBox = new BBox();
                    
                    var created = false;
                    for ( var i = 0, len = svgFactories.length; i < len; i++)
                    {
                        var factory = svgFactories[i];
                        if (result = factory.create(world, $elem, name))
                        {
                            if (typeof result == "function")
                            {
                                delayed.push(result);
                            }
                            
                            created = true;
                            break;
                        }
                    }
                    
                    if (!created)
                    {
                        console.debug("not object created for $elem = %o, name=%s", $elem, name);
                    }
                });
                
                for ( var i = 0, len = delayed.length; i < len; i++)
                {
                    delayed[i].call(this);
                }
                
                var pt = world.base.pos;
                
                var playerX = pt.x + 25;
                var playerY = pt.y - 25 ;
                //console.debug("World box: %s", world.box);
                
                player = new Ship(world, playerX, playerY);
                world.player = player;
                
                $canvas = $("#teh_canvas");
                var off = $canvas.offset();
                canvasOffset = new Vector2D(off.left, off.top);
                
                console.debug("canvasOffset = %o", canvasOffset);
                
                // register additional lines for level bounds
                var topLft = new Vector2D(world.box.x, world.box.y);
                var w = world.box.w;
                var h = world.box.h;
                var botRgt = new Vector2D(world.box.x + w, world.box.y + h);
                
                world.insertLineBox(topLft,topLft.add(w,0));
                world.insertLineBox(topLft,topLft.add(0,h));
                world.insertLineBox(botRgt,botRgt.substract(w,0));
                world.insertLineBox(botRgt,botRgt.substract(0,h));
                
                animationTime = (new Date()).getTime();
                var lastFrame = animationTime;
                (function mainLoop()
                {
                    var time = (new Date()).getTime();
                    
                    while (animationTime < time)
                    {                    
                        world.step();
                        animationTime += STEP_TIME;
                    }
                    world.step();
                    world.draw();
                    
                    
                    
                    var wait = (lastFrame + FRAME_TIME) - (new Date()).getTime();
                    if (wait < 1)
                    {
                        wait = 1;
                    }
                    window.setTimeout(mainLoop, wait);
                    lastFrame = time;
                })();                
            }
        });
                
        function thrust(ev) 
        { 
            var point = new Vector2D( ev.pageX , ev.pageY).substract(canvasOffset);
            //var pos = new Vector2D(player.x,player.y);
            //console.debug("point = %s, pos = %s", point,pos);
            player.thrust( point);
            
        }
        
        window.oncontextmenu = function () {
            return false;
         }
        
        var $doc = $(document).mousedown(function(ev)
        {
            if (ev.button == 2 || ev.ctrlKey)
            {
                player.shoot(new Vector2D(ev.pageX,ev.pageY).substract(canvasOffset));
                return false;
            }
            else
            {
                mouseDown = true;
                thrust(ev);
            }
        }).mouseup(function(ev)
        {
            player.thrust(null);
            mouseDown = false;
        }).mousemove(function(ev)
        {
            if (mouseDown)
            {
                thrust(ev);                
            }
        }).keydown(function(ev)
        {
            switch(ev.keyCode)
            {
                case 84:    // T
                    var player = world.player;
                    var r = player.tractorMax;
                    var playerPos = player.pos; 
                    var box = playerPos.substract(r,r);
                    box.w = box.h = r + r;
                    var objects = world.rtree.search(box);
                    
                    for ( var i = 0, len = objects.length; i < len; i++)
                    {
                        var obj = objects[i];
                        if (obj.type === "cargo")
                        {
                            var dist = playerPos.substract(obj.pos).length();
                            if (obj.connected)
                            {
                                obj.connected = false;
                                player.connected = null;
                            }
                            else if (dist < r)
                            {
                                obj.connected = true;
                                obj.resting = false;
                                player.connected = obj;
                            }
                        }
                    }
                    break;
                default:
                    console.debug("key = %d", ev.keyCode);
            }
        });
        
        $("#levelSelector").change(function(ev){
            document.location.href = "index.html?level=" + this.value;
        });
    }
};
    
$(Thrust.init);
    
})(jQuery,window);
