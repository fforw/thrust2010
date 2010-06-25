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

window.Thrust = {
init:
    function()
    {
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
                    if (name === "#scene")
                    {
                        var pathData = $elem.attr("d");
                        world.createSubPaths(pathData);
                        console.debug("world AABB: %o", world.box)
                    }
                    else                        
                    if (name === "#start")
                    {   
                        playerX = (+$elem.attr("x"));
                        playerY = (+$elem.attr("y"));
                        
                        world.base = new Base(world, playerX, playerY);
                        
                        var pt = world.base.pos;
                        
                        console.debug("base player pt = %s", pt);
                        
                        playerX = pt.x + 25;
                        playerY = pt.y - 5;
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
