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

window.Thrust = {
init:
    function()
    {
        var $wnd = $(window);
        
        paperWidth = $wnd.width();
        paperHeight = $wnd.height();
        
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
        
        player = new Player(world);
        player.translate(paperWidth / 4,paperHeight / 4);

        //console.debug("paper = %o", paper);
        
        function thrust(ev) 
        { 
            var point = new Vector2D( ev.pageX , ev.pageY);
            //var pos = new Vector2D(player.x,player.y);
            //console.debug("point = %s, pos = %s", point,pos);
            player.thrust( point);
            
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
