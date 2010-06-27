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
    
    var m = /^translate\(\s*([0-9-]+)\s*,\s*([0-9-]+)\s*\)$/g.exec(s);
    if (m)
    {
        return new Vector2D(+m[1], +m[2]);
    }
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
                    console.debug("name = %s", name);
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
                            
                            console.debug("base player pt = %s", pt);
                            
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
                    }
                });
                
                console.debug("World box: %s", world.box);
                
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
            if (ev.button == 2)
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
        });

    }
};
    
$(Thrust.init);
    
})(jQuery,window);
