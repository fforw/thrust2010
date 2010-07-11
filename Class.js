// based on the Class pattern by John Resig ( http://ejohn.org/blog/simple-javascript-inheritance/ )
// Inspired by base2 and Prototype
(function(){
  var initializing = false, canDecompile = /xyz/.test(function(){xyz;}), superTest = /\b_super\b/;

  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var proto = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      proto[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && (!canDecompile || superTest.test(prop[name])) ?
        (function(name, fn){
          return function() {
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);       
            this._super = null;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    var Class = function() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = proto;
    
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
   
    // And make this class extendable
    Class.extend = arguments.callee;
   
    if (Class.prototype.onTypeCreation)
    {
        Class.prototype.onTypeCreation();
    }
    return Class;
  };
})();
