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
//        var poly = new Polygon(world, points(
//                -unit,-unit * 0.8,
//                   0, unit * 1.5, 
//                 unit * 0.8, unit, 
//                 unit,-unit), {stroke:"#ccc", fill:"#888", "stroke-width": 2});
//
//        poly.translate(paperWidth / 2, paperHeight / 2);
        
        var poly, paths = [ "M462,99L302,136L292,255L484,404L719,389L777,274L940,229L1059,182L905,80L709,194Z", "M679,668L746,438L991,387L1120,280L1199,133L1298,138L1418,258L1239,491L1017,520L890,694L727,702Z", "M471,459L542,466L572,512L581,649L534,701L384,730L322,691L306,640L253,624L183,568L192,480L266,448L344,475L403,438L433,460Z", "M1530,291L1375,496L1261,585L1244,704L1512,706L1501,521L1584,432Z"];        

        for ( var i = 0, len = paths.length; i < len; i++)
        {
            var pathData = paths[i];
            
            poly = new Polygon(world, pathData, {stroke:"#ccc", fill:"#888a8e", "stroke-width": 2})
        }
        
        player = new Player(world);
        player.translate(paperWidth / 20,paperHeight / 4);

        //console.debug("paper = %o", paper);
        
        function thrust(ev) 
        { 
            var point = new Vector2D( ev.pageX , ev.pageY);
            //var pos = new Vector2D(player.x,player.y);
            //console.debug("point = %s, pos = %s", point,pos);
            player.thrust( point);
            
        }
        
        window.oncontextmenu = function () {
            return false;
         }
        
        var $doc = $(document).mousedown(function(ev)
        {
            if (ev.button == 2)
            {
                player.shoot(new Vector2D(ev.pageX,ev.pageY));
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

        window.setInterval(Thrust.main, 20);
    },
main:
    function()
    {
        world.step();
    }
};
    
$(Thrust.init);
    
})(jQuery,window);
