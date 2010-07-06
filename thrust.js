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

function parseTransform($elem)
{
    var s = $elem.attr("transform");
    var m = /translate\((.*)\)/.exec(s);
    if (m)
    {
        var n = m[1].split(",");
        
        
        var v = new Vector2D(+n[0], +(n[1] || 0));
        //console.debug("matched %o", v);
        return v;
    }
    
    //console.debug("not matched %s", s);
    return null;
}

$.fn.svgStyle = function(name)
{
    var styles = this.data("svgStyles");
    if (!styles)
    {
        styles = {};
        
        var re = /\s*([a-zA-Z-]+)\s*:\s*([^;]*)\s*(?:;|$)/g;
        var s = this.attr("style");
        while (m = re.exec(s))
        {
            styles[m[1]] = m[2];
        }
        this.data("svgStyles", styles);
    }
    return styles[name];   
}


function readStyle($elem)
{
    var style = {};
    
    style.fillStyle = $elem.svgStyle("fill") || "#f0f";
    style.strokeStyle = $elem.svgStyle("stroke") || "none";

    return style;
}

function readCircleData($elem)
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
}

var $canvas, canvasOffset;

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
    
        var levelURL = getParameter("level") || "cave.svg";
    
        world = new World("teh_canvas");
        $.ajax({
            url: levelURL, 
            dataType: "xml", 
            success:function(data) 
            { 
                var playerX = 0, playerY = 0;
                
                //console.debug(data);
                
                var aliens = {};
                
                $("path,rect", data.documentElement).each(function(){
                    
                    var $elem = $(this);
                    
                    var name = $elem.attr("inkscape:label");
                    console.debug("$elem = %o, name=%s", $elem, name);
                    var worldBBox = new BBox();
                    switch(name)
                    {
                        case "#scene": 
                            var pathData = $elem.attr("d");
                            
                            if ($elem.attr("id") == "path3881")
                            {
                                console.debug("mark");
                            }
                            
                            world.createSubPaths(pathData, readStyle($elem));
                            break;
                        case "#start":
                            playerX = (+$elem.attr("x"));
                            playerY = (+$elem.attr("y"));
                            break;
                        case "#sentinel":
                            var data = readCircleData($elem);
                            new Sentinel(world, data.x, data.y, (data.rx + data.ry) / 2);
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
                        case "#gravpoint":
                            var data = readCircleData($elem);
                            new GravPoint(world, data.x, data.y, (data.rx + data.ry) / 2);
                            break;
                        case "#alien":
                            var data = readCircleData($elem);
                            aliens[$elem[0].id] = new AlienControl(new Ship(world, data.x, data.y));
                            break;
                            
                    }
                });
                
                $("path", data.documentElement).each(function(){
                    
                    var $elem = $(this);
                    
                    var name = $elem.attr("inkscape:label");
                    
                    var m = /^#way-([0-9]+)-(.*)$/.exec(name);
                    if (m)
                    {
                        var data = readCircleData($elem);
                        var idx = +m[1];
                        var id = m[2];
                        aliens[id].setWayPoint(idx, data.x, data.y);
                    }
                });

                //console.debug("base player pt = %d,%d", playerX, playerY);
                world.base = new Base(world, playerX, playerY);
                
                var pt = world.base.pos;
                
                
                playerX = pt.x + 25;
                playerY = pt.y - 25 ;
                //console.debug("World box: %s", world.box);
                
                player = new Ship(world, playerX, playerY);
                world.player = player;
                
                $canvas = $("#teh_canvas");
                var off = $canvas.offset();
                canvasOffset = new Vector2D(off.left, off.top);
                
                console.debug("canvasOffset = %o", canvasOffset);
                
                var topLft = new Vector2D(world.box.x, world.box.y);
                var w = world.box.w;
                var h = world.box.h;
                var botRgt = new Vector2D(world.box.x + w, world.box.y + h);
                
                world.insertLineBox(topLft,topLft.add(w,0));
                world.insertLineBox(topLft,topLft.add(0,h));
                world.insertLineBox(botRgt,botRgt.substract(w,0));
                world.insertLineBox(botRgt,botRgt.substract(0,h));
                
                (function mainLoop()
                {
                    world.step();
                    window.setTimeout(mainLoop, 20);
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
