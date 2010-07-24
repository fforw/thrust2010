/*!
 * Thrust 2010 Copyright (C) 2010 by Sven Helmberger.
 * 
 * This software is licensed under the AGPL license. 
 * project root for LICENSE AND README.
 * 
 */
(function(){
    
this.parseSubPaths=function(pathData, xOff, yOff)
{
    var idx = 0;
    var data = pathData.split(/[ ,]/);
    var len = data.length;
    
    var paths=[];
    var points = [];
    var lastCmd = "L";
    
    while (idx < len)
    {
        var cmd = data[idx++];
     
        if (cmd < "A")
        {
            cmd = lastCmd;
            if (cmd == "M")
            {
                cmd = "L";
            }
            if (cmd == "m")
            {
                cmd = "l";
            }
            idx--;
        }
        else
        {
            lastCmd = cmd;
        }
        
        var absolute = false;
        if (cmd <= "a")
        {
            absolute = true;
            cmd = String.fromCharCode(cmd.charCodeAt(0) + 32);
        }
        
        switch(cmd)
        {
            case "m":
                points = [];
                x=0;
                y=0;
            case "l":
                if (absolute)
                {
                    x = +data[idx++];
                    y = +data[idx++];
                }
                else
                {
                    x += +data[idx++];
                    y += +data[idx++];
                }
                points.push(new Vector2D(x,y));
                break;
            case "z":
                paths.push(points);
                points = [];
                x=0;
                y=0;
                break;
            default:
                idx++;
                console.error("Unknown cmd " + cmd);
        }
    }

    if (points.length)
    {
        paths.push(points);
    }
    
    if (xOff !== undefined || yOff !== undefined)
    {
        x = xOff || 0;
        y = yOff || 0;
        
        //console.debug("path offset x: %d, y: %d", x,y);
        
        for ( var i = 0, len = paths.length; i < len; i++)
        {
            var points = paths[i];
            for ( var j = 0, len2 = points.length; j < len2; j++)
            {
                var pt = points[j];
                pt.x += x;
                pt.y += y;
            }
        }
    }
    
    return paths;
};

this.findClosestPointInCandidates = function(candidates, point)
{
    //console.debug("candidates = %o, len = %s", candidates, candidates.length);
    var minDistance = Infinity, bestCandidate, bestClosest, candidate;
    for ( var i = 0, len = candidates.length; i < len; i++)
    {
        candidate = candidates[i];
        if (candidate && candidate.type === "line")
        {
//            new Marker(candidate.pt0.x, candidate.pt0.y);
//            new Marker(candidate.pt1.x, candidate.pt1.y);
            var closest = closestPointOnLineSegment(point, candidate.pt0, candidate.pt1);
            
            var distance = closest.substract(point).length();
            if (distance < minDistance)
            {
                minDistance = distance;
                bestCandidate = candidate;
                bestClosest = closest;
            }
        }
    }
    
    return {closest: closest, obj: bestCandidate, distance: minDistance};  
};

var _indexOf = Array.prototype.indexOf;

this.removeFromArray = function(array,obj)
{
    var idx = -1;
    if (_indexOf)
    {
        idx = _indexOf.call(array,obj);
    }
    else
    {
        for (var i = 0, len = array.length; i < len ; i++)
        {
            if (array[i] === obj)
            {
                idx = i;
                break;
            }
        }
    }
    
    if (idx >= 0)
    {
        array.splice(idx,1);
    }
};

this.chksum = function(s)
{
    var chk = 0xBAB3CAFE;
    for (var i=0, len = s.length; i < len; i++)
    {
        chk = (chk ^ (s.charCodeAt(i) * 69069)) & 0xffffffff;
    }    
    return chk;
};

this.parseTransform = function($elem)
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
};

this.svgJSON = function($elem)
{
    var $desc = $elem.find("desc");
    if ($desc.length)
    {
        var txt = $desc.text();
        try
        {
            var data = JSON.parse(txt);
            //console.debug("metadata is %o", data);
            return data;
        }
        catch(e)
        {
            console.error("Could not parse svg metadata:", txt);
        }
    }
    return {};
};

})();
