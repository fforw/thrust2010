var paper, world, player;
(function($,window,undefined)
{
    
var FRAMES_PER_SECOND = 24;
var STEPS_PER_SECOND = 24;

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

function convert(s)
{
    var m = /^(\d+)\:(-?\d+)$/.exec(s);
    if (m)
    {
        var level = +m[1];
        var chk = +m[2];
        if (chk != chksum(Thrust.levels[level]))
        {
            return 0;
        }
        
        return level;
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
    
        var levelParam = getParameter("level");
        var level = +( convert(levelParam) || 0);
    
        world = new World("teh_canvas");
        world.level = level;
        world.overview = !!(getParameter("overview") || false);

        window.world = world;
        
        if (levelParam)
        {
            var data = JSON.parse($.cookies.get("thrust2010_data") || "{\"score\":0,\"lives\":5}");
            world.score = data.score;
            world.lives = data.lives;
        }
            
        var delayed = [];
        
        $.ajax({
            url: Thrust.levels[level], 
            dataType: "xml", 
            success:function(data) 
            { 
                var playerX = 0, playerY = 0;
                
                //console.debug(data);
                
                var svgFactories = SvgFactory.prototype.getRegistered();
                
                //console.debug("svgFactories = %o", svgFactories);
                
                $("path,rect", data.documentElement).each(function(){
                    
                    var $elem = $(this);
                
                    //console.debug($elem);
                    
                    var name = $elem.attr("inkscape:label");
                    var created = false;
                    if (name)
                    {
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
                
                
                for ( var i = 0, len = world.objects.length; i < len; i++)
                {
                    var obj = world.objects[i];
                    obj.message("prepare");
                }
                
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
                var point = world.fromScreen(new Vector2D(ev.pageX,ev.pageY).substract(canvasOffset));
                player.shoot(point);
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
        
        var opts = ["<option value=\"\">Choose Level</option>"];
        for ( var i = 0, len = Thrust.levels.length; i < len; i++)
        {
            var level = Thrust.levels[i];
            opts.push("<option value=\"", i , ":" , chksum(level), "\">", level, "</option>" );
        }
        
        $("#levelSelector").change(function(ev){
            document.location.href = "index.html?level=" + this.value;
        }).append($(opts.join("")));
    }
};
    
$(Thrust.init);
    
})(jQuery,window);
