// contains alien control logic
(function(){
    
var SLICES = 16;
var CIRCLE_RAD = Math.PI * 2;
var RAD_PER_SLICE = CIRCLE_RAD / SLICES;


function normAngle(angle)
{
    angle = angle % CIRCLE_RAD;
    return angle > 0 ? angle : CIRCLE_RAD + angle;
}

function nextSlot(n)
{
    if (n == SLICES - 1)
    {
        return 0;
    }
    return n + 1;
}

function prevSlot(n)
{
    if (n == 0)
    {
        return SLICES - 1;
    }
    return n - 1;
}

function createHeatMap()
{
    var l = [];
    for ( var i = 0; i < SLICES; i++)
    {
        l.push(0);
    }
    return l;
}   

var aliens = {};

this.Alien = Ship.extend({
init:
    function(world,x,y)
    {
        this._super(world,x,y);

        this.awarenessRadius = 100;
        
        this.way = [ this.pos.clone()];
        this.wayCnt = 0;
    },
draw:
    function(ctx)
    {
//      if (ship.heat)
//      {
//          for ( var i = 0, angle = 0, len = ship.heat.length; i < len; i++, angle += RAD_PER_SLICE)
//          {
//              var v = ship.heat[i];
//              //console.debug("v = %s", v);
//              ctx.fillStyle = v < 0 ? "#00f" : "#f00";
//              
//              ctx.beginPath();                    
//              ctx.arc(
//                      ship.pos.x + Math.cos(angle) * (this.radius + 5 ),
//                      ship.pos.y + Math.sin(angle) * (this.radius + 5 ),
//                      v / 0.475 + 1, 0, Math.PI*2, false);
//              ctx.fill();
//
//              ctx.beginPath();                    
//              ctx.strokeStyle = "#444";                    
//              ctx.arc(
//                      ship.pos.x ,
//                      ship.pos.y ,
//                      ctrl.awarenessRadius, 0, Math.PI*2, false);
//              ctx.stroke();
//          }
//          
//      }
//      if (ship.checked)
//      {
//          for ( var i = 0, len = ship.checked.length; i < len; i++)
//          {
//              var obj = ship.checked[i];
//              if (obj.type === "line")
//              {
//                  ctx.strokeStyle = "#ccc";
//                  ctx.lineWidth = 4;
//                  ctx.beginPath();                    
//                  ctx.moveTo(obj.pt0.x,obj.pt0.y);
//                  ctx.lineTo(obj.pt1.x,obj.pt1.y);
//                  ctx.fill();
//                  ctx.lineWidth = 1;
//              }
//              else
//              {
//                  ctx.beginPath();                    
//                  ctx.fillStyle = "#888";
//                  ctx.arc(
//                          ship.pos.x ,
//                          ship.pos.y ,
//                          4, 0, Math.PI*2, false);
//                  ctx.fill();
//              }
//          }
//      }
//      
//
      
      var pt = ctrl.way[ctrl.wayCnt];
      if (pt)
      {
        ctx.beginPath();                    
        ctx.fillStyle = "#888";
        ctx.arc(pt.x ,
                pt.y ,
                4, 0, Math.PI*2, false);
        ctx.fill();
      }
      
      this._super(ctx);
    },
xxxfromSvg:
    function(world, $elem, name)
    {
        var data = this.readCircleData($elem);
        aliens[$elem[0].id] = new Alien(world, data.x, data.y);
    },
getAlienbyId:
    function(id)
    {
        return aliens[id];
    },
setWayPoint:
    function(idx,x,y)
    {
        //console.debug("add way point #%d = %d,%d", idx, x,y);
        this.way[idx] = new Vector2D(x,y);
    },
move:
    function()
    {
        var pos = this.pos;
        var dx = this.dx; 
        var dy = this.dy; 
        
        
        var box = this.pos.substract(this.awarenessRadius,this.awarenessRadius);
        box.w = box.h = this.awarenessRadius + this.awarenessRadius;
        var objects = this.world.rtree.search(box);
        
        // circular heat map in 1/16th circle units
        var slot, ratio, heat = createHeatMap();

        var addHeat = function(v, moveAngle)
        {
            var dist = v.length();

            if (dist < this.awarenessRadius)
            {
                var angle = normAngle(Math.atan2(v.y,v.x));
                
                var angleDelta = moveAngle - angle;
                
                while (angleDelta < -Math.PI)
                {
                    angleDelta += CIRCLE_RAD;
                }

                while (angleDelta > Math.PI)
                {
                    angleDelta -= CIRCLE_RAD;
                }
                
                
                if (Math.abs(angleDelta) < 2)
                {
                    var slot = Math.floor(angle / RAD_PER_SLICE);
                    var ratio = (angle - slot * RAD_PER_SLICE) / RAD_PER_SLICE;
                    var slot2 = nextSlot(slot);
                    
                    // spread heatmap energy over 2 adjacent cells
                    var energy = 1000 / (dist * dist * 0.5);
                    heat[slot] += ratio * energy;
                    heat[slot2] += (1 - ratio) * energy;
                }
            }
        };
        
        this.checked = [];
        
        var moveAngle = Math.floor(Math.atan2(dy,dx));
        
        for ( var i = 0, len = objects.length; i < len; i++)
        {
            var obj = objects[i];
            if (obj.type === "line")
            {
                var ptClose = closestPointOnLineSegment(pos, obj.pt0, obj.pt1).substract(pos);
                addHeat.call(this,ptClose, moveAngle);
                this.checked.push(obj);
            }
        }

        var max = -Infinity;
        var maxSlot = SLICES / 4;
        for ( var i = 0; i < SLICES; i++)
        {
            var v = heat[i];
            if (v > max)
            {
                max = v;
                maxSlot = i;
            }
        }

        var angle = maxSlot * RAD_PER_SLICE;
        var r = this.radius;
        var vThrust = new Vector2D( Math.cos(angle) * r, Math.sin(angle) * r);

        this.heat = heat;
        
        
        /**/
        function thrustForce(point)
        {
            var angle = Math.atan2(point.y,point.x);
    
            var weight = this.weight;
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);
            
            var ddx = cos * this.thrustPower / weight / 1000;
            var ddy = sin * this.thrustPower / weight / 1000;
    
            return  new Vector2D(ddx,ddy);
        }
        
        function inLimit(pt)
        {
            var len = pt.length();
            if (pt.y > 0)
            {
                return len < 0.5;
            }
            else 
            {
                return len < 1;
            }
        }
        
        if (max > 0.4)
        {
            this.thrustPoint = pos.add(vThrust);
        }
        else
        {
            var vMove = new Vector2D(dx,dy);
            var thrustToWayPoint = vMove.length() < 1.15;
            
            var pt = this.way[this.wayCnt];

            if (!thrustToWayPoint)
            {
                var delta1 = pt.substract(pos);
                var delta2 = delta1.substract(dx,dy);
                
                if (delta2.length() > delta1.length())
                {
                    thrustToWayPoint = true;
                }
            }
            
            if (thrustToWayPoint)
            {
                var vDelta = pt.substract(pos).substract(dx,dy);
                
                if (vDelta.length() > 30)
                {                
                    this.thrustPoint = pos.substract(vDelta);
                }
                else
                {
                    this.wayCnt++;
                    if (this.wayCnt == this.way.length)
                    {
                        this.wayCnt = 0;
                    }
                    console.debug("next way point: %o", this.way[this.wayCnt]);
                }
            }
            else
            {
                this.thrustPoint = null;
            }
        }

        if (dy > 0.7)
        {
            this.thrustPoint = pos.add(0,20);
        }

        this._super();
    }
});

})();
