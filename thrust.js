var paper, paperWidth, paperHeight, world, player;
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

var $wnd = $(window), world;

window.Thrust = {
init:
    function()
    {
        paperWidth = $wnd.width();
        paperHeight = $wnd.height() - 40;
        
        world = new World("teh_canvas");
        $.ajax({
            url: "cave.svg", 
            dataType: "xml", 
            success:function(data) 
            { 
                var playerX = 0, playerY = 0;
                
                $("path,rect", data).each(function(){
                    
                    var $elem = $(this);
                    
                    if ($elem.attr("id") == "scene")
                    {
                        var pathData = $elem.attr("d");
                        console.debug("scene path data = %s", pathData);
                        poly = new Polygon(world, pathData, {stroke:"#ccc", fill:"#888a8e", "stroke-width": 2})
                    }
                    else                        
                    if ($elem.attr("id") == "start")
                    {   
                        playerX = (+$elem.attr("x")) + (+$elem.attr("width")) / 2;
                        playerY = (+$elem.attr("y")) + (+$elem.attr("height")) / 2;
                        
                        world.base = new Base(world, playerX, playerY);
                        
                        var pt = world.base.pos;
                        
                        console.debug("base player pt = %s", pt);
                        
                        playerX = pt.x + 25;
                        playerY = pt.y - 5;
                    }
                    
                });
                
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
            player.thrust( point.substract(world.offset));
            
        }
        
        window.oncontextmenu = function () {
            return false;
         }
        
        var $doc = $(document).mousedown(function(ev)
        {
            if (ev.button == 2)
            {
                player.shoot(new Vector2D(ev.pageX,ev.pageY).substract(world.offset));
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
