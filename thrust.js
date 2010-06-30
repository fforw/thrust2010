var paper, world, player;
(function($,window,undefined)
{


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

function parseTransform($elem)
{
    var s = $elem.attr("transform");
    var m = /translate\((.*)\)/.exec(s);
    if (m)
    {
        var n = m[1].split(",");
        
        
        var v = new Vector2D(+n[0], +(n[1] || 0));
        console.debug("matched %o", v);
        return v;
    }
    
    console.debug("not matched %s", s);
    return null;
}

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
    
    
        world = new World("teh_canvas");
        $.ajax({
            url: "cave.svg", 
            dataType: "xml", 
            success:function(data) 
            { 
                var playerX = 0, playerY = 0;
                
                $("path,rect", data).each(function(){
                    
                    var $elem = $(this);
                    
                    var name = $elem.attr("inkscape:label");
                    //console.debug("name = %s", name);
                    var worldBBox = new BBox();
                    switch(name)
                    {
                        case "#scene": 
                            var pathData = $elem.attr("d");
                            world.createSubPaths(pathData);
                            console.debug("world AABB: %o", world.box)
                            break;
                        case "#start":
                            playerX = (+$elem.attr("x"));
                            playerY = (+$elem.attr("y"));
                            
                            world.base = new Base(world, playerX, playerY);
                            
                            var pt = world.base.pos;
                            
                            //console.debug("base player pt = %s", pt);
                            
                            playerX = pt.x + 25;
                            playerY = pt.y - 25 ;
                            break;
                        case "#sentinel":
                            var x = (+$elem.attr("sodipodi:cx"));
                            var y = (+$elem.attr("sodipodi:cy"));

                            var rx = (+$elem.attr("sodipodi:rx"));
                            var ry = (+$elem.attr("sodipodi:ry"));
                            
                            var transform = parseTransform($elem);
                            
                            if (transform)
                            {
                                x += transform.x;
                                y += transform.y;
                            }
                            new Sentinel(world, x,y,(rx + ry) / 2);
                            break;
                        case "#cargo":
                            var x = (+$elem.attr("sodipodi:cx"));
                            var y = (+$elem.attr("sodipodi:cy"));

                            var transform = parseTransform($elem);
                            
                            if (transform)
                            {
                                console.debug("transform = %s", transform);
                                x += transform.x;
                                y += transform.y;
                            }
                            new Cargo(world, x,y);
                            break;
                    }
                });
                
                //console.debug("World box: %s", world.box);
                
                player = new Player(world, playerX, playerY);
                world.player = player;
                
                (function mainLoop()
                {
                    world.step();
                    window.setTimeout(mainLoop, 20);
                })();                
            }
        });
                
        function thrust(ev) 
        { 
            var point = new Vector2D( ev.pageX , ev.pageY);
            //var pos = new Vector2D(player.x,player.y);
            //console.debug("point = %s, pos = %s", point,pos);
            player.thrust( point.add(world.offset));
            
        }
        
        window.oncontextmenu = function () {
            return false;
         }
        
        var $doc = $(document).mousedown(function(ev)
        {
            if (ev.button == 2 || ev.ctrlKey)
            {
                player.shoot(new Vector2D(ev.pageX,ev.pageY).add(world.offset));
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
    }
};
    
$(Thrust.init);
    
})(jQuery,window);
