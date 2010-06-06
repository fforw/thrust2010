(function($,window,undefined)
{

var paper, paperWidth, paperHeight, world, player;

function points()
{
    var l = [];
    for (var i=0, len = arguments.length; i < len; i+=2 )
    {
        l.push({ x: arguments[i], y: arguments[i+1] });
    }
    return l;
}

var mouseDown;

window.Thrust = {
init:
    function()
    {
        var $wnd = $(window);
        
        paperWidth = $wnd.width() - 8;
        paperHeight = $wnd.height() - 8;
        
        paper = Raphael("holder", paperWidth, paperHeight);
        
        //var path = paper.path().attr({"path":"M0,0L" + paperWidth + "," + paperHeight, "stroke":"#f00"});
        //console.debug("path = %o", path.getBBox());
        
        var unit = -paperWidth / 12;
        
        world = new World(paper);
        var poly = new Polygon(world, points(
                -unit,-unit * 0.8,
                   0, unit * 1.5, 
                 unit * 0.8, unit, 
                 unit,-unit), {stroke:"#ccc", fill:"#888", "stroke-width": 2});

        poly.translate(paperWidth / 2, paperHeight / 2);
        
        var bbox = poly.canvasObjs[0].getBBox();
        paper.rect(bbox.x, bbox.y, bbox.width, bbox.height).attr("stroke","red");
        
        player = new Player(world);
        player.translate(paperWidth / 4,paperHeight / 4);

        //console.debug("paper = %o", paper);
        
        $canvas = $(paper.canvas);
        function thrust(ev) 
        { 
            var offset = $canvas.offset();
            
            player.thrust({x: ev.pageX - offset.left, y: ev.pageY - offset.top});
            mouseDown = true;
        }
        
        var $doc = $(document).mousedown(function(ev)
        {
            thrust(ev);                
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

        window.setInterval(Thrust.main, 20);
    },
main:
    function()
    {
        player.move();
    }
};
    
$(Thrust.init);
    
})(jQuery,window);
