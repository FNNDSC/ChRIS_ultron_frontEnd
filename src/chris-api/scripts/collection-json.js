(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/lib/client.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var http;

  http = require("./http");

  module.exports = function(href, options, done) {
    if (typeof options === 'function') {
      done = options;
      options = {};
    }
    return http.get(href, options, function(error, collection) {
      if (error) {
        return done(error);
      }
      return module.exports.parse(collection, done);
    });
  };

  module.exports.parse = function(collection, done) {
    var collectionObj, error, _error;
    if (!(done != null)) {
      throw new Error("Callback must be passed to parse");
    }
    if (!(collection != null)) {
      return done();
    }
    if (typeof collection === "string") {
      try {
        collection = JSON.parse(collection);
      } catch (e) {
        e.body = collection;
        console.log(e.body);
        done(e);
      }
    }
    collectionObj = null;
    try {
      collectionObj = new module.exports.Collection(collection);
    } catch (e) {
      e.body = JSON.stringify(collection);
      return done(e);
    }
    error = null;
    if (_error = collectionObj.error) {
      error = new Error;
      error.title = _error.title;
      error.message = _error.message;
      error.code = _error.code;
      error.body = JSON.stringify(collection);
    }
    return done(error, collectionObj);
  };

  module.exports.Collection = require("./attributes/collection");

}).call(this);

});

require.define("/lib/http.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var defaults, performCache;

  module.exports = defaults = {
    _get: function(href, options, done) {
      if (done == null) {
        done = function() {};
      }
      return done(new Error("'GET' not implemented"));
    },
    _post: function(href, options, done) {
      if (done == null) {
        done = function() {};
      }
      return done(new Error("'POST' not implemented"));
    },
    _put: function(href, options, done) {
      if (done == null) {
        done = function() {};
      }
      return done(new Error("'PUT' not implemented"));
    },
    _del: function(href, options, done) {
      if (done == null) {
        done = function() {};
      }
      return done(new Error("'DELETE' not implemented"));
    },
    cache: {
      put: function(key, value, time, done) {
        if (done == null) {
          done = function() {};
        }
        if (typeof time === 'function') {
          done = time;
          time = null;
        }
        return done();
      },
      del: function(key, done) {
        if (done == null) {
          done = function() {};
        }
        return done();
      },
      clear: function(done) {
        if (done == null) {
          done = function() {};
        }
        return done();
      },
      get: function(key, done) {
        if (done == null) {
          done = function() {};
        }
        return done();
      },
      size: function(done) {
        if (done == null) {
          done = function() {};
        }
        return done(0);
      },
      memsize: function(done) {
        if (done == null) {
          done = function() {};
        }
        return done(0);
      },
      debug: function() {
        return true;
      }
    }
  };

  module.exports["content-type"] = "application/vnd.collection+json";

  module.exports.get = function(href, options, done) {
    return defaults.cache.get(href, function(error, collection) {
      if (error || collection) {
        return done(error, collection);
      }
      options.headers || (options.headers = {});
      options.headers["accept"] = module.exports["content-type"];
      module.exports.setOptions(href, options);
      return defaults._get(href, options, function(error, collection, headers) {
        if (error) {
          return done(error);
        }
        performCache(collection, headers);
        return done(error, collection);
      });
    });
  };

  module.exports.post = function(href, options, done) {
    if (options == null) {
      options = {};
    }
    options.headers || (options.headers = {});
    options.headers["accept"] = module.exports["content-type"];
    options.headers["content-type"] = module.exports["content-type"];
    module.exports.setOptions(href, options);
    return defaults._post(href, options, function(error, collection, headers) {
      return done(error, collection);
    });
  };

  module.exports.setOptions = function(href, options) {};

  performCache = function(collection, headers) {};

}).call(this);

});

require.define("/lib/attributes/collection.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Collection, http, _;

  _ = require("../underscore");

  http = require("../http");

  Function.prototype.define = function(prop, desc) {
    return Object.defineProperty(this.prototype, prop, desc);
  };

  module.exports = Collection = (function() {

    function Collection(collection) {
      var _ref;
      if ((collection != null ? (_ref = collection.collection) != null ? _ref.version : void 0 : void 0) !== "1.0") {
        throw new Error("Collection does not conform to Collection+JSON 1.0 Spec");
      }
      this._collection = collection.collection;
      this._links = null;
      this._queries = null;
      this._items = null;
      this._template = null;
      this.error = this._collection.error;
    }

    Collection.define("href", {
      get: function() {
        return this._collection.href;
      }
    });

    Collection.define("version", {
      get: function() {
        return this._collection.version;
      }
    });

    Collection.define("links", {
      get: function() {
        var Link, links;
        if (this._links) {
          return this._links;
        }
        this._links = links = [];
        Link = require("./link");
        _.each(this._collection.links, function(link) {
          return links.push(new Link(link));
        });
        return this._links;
      }
    });

    Collection.prototype.link = function(rel) {
      return _.find(this.links, function(link) {
        return link.rel === rel;
      });
    };

    Collection.define("items", {
      get: function() {
        var Item, items;
        if (this._items) {
          return this._items;
        }
        this._items = items = [];
        Item = require("./item");
        _.each(this._collection.items, function(item) {
          return items.push(new Item(item));
        });
        return this._items;
      }
    });

    Collection.prototype.item = function(href) {
      return _.find(this.items, function(item) {
        return item.href === href;
      });
    };

    Collection.define("queries", {
      get: function() {
        var Query, queries;
        queries = [];
        Query = require("./query");
        _.each(this._collection.queries || [], function(query) {
          return queries.push(new Query(query));
        });
        return queries;
      }
    });

    Collection.prototype.query = function(rel) {
      var Query, query;
      query = _.find(this._collection.queries || [], function(query) {
        return query.rel === rel;
      });
      if (!query) {
        return null;
      }
      Query = require("./query");
      return new Query(query);
    };

    Collection.prototype.template = function(name) {
      var Template;
      Template = require("./template");
      return new Template(this._collection.href, this._collection.template);
    };

    return Collection;

  })();

}).call(this);

});

require.define("/lib/underscore.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {

  module.exports = process.browser ? window._ : require("underscore");

}).call(this);

});

require.define("/lib/attributes/link.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Collection, Link, client, http;

  http = require("../http");

  client = require("../client");

  Collection = require("./collection");

  module.exports = Link = (function() {

    function Link(_link) {
      this._link = _link;
    }

    Link.define("href", {
      get: function() {
        return this._link.href;
      }
    });

    Link.define("rel", {
      get: function() {
        return this._link.rel;
      }
    });

    Link.define("prompt", {
      get: function() {
        return this._link.prompt;
      }
    });

    Link.prototype.follow = function(done) {
      var options;
      if (done == null) {
        done = function() {};
      }
      options = {};
      return http.get(this._link.href, options, function(error, collection) {
        if (error) {
          return done(error);
        }
        return client.parse(collection, done);
      });
    };

    return Link;

  })();

}).call(this);

});

require.define("/lib/attributes/item.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Collection, Item, Link, Template, client, http, _;

  _ = require("../underscore");

  http = require("../http");

  client = require("../client");

  Collection = require("./collection");

  Link = require("./link");

  Template = require("./template");

  module.exports = Item = (function() {

    function Item(_item, _template) {
      this._item = _item;
      this._template = _template;
      this._links = {};
      this._data = null;
    }

    Item.define("href", {
      get: function() {
        return this._item.href;
      }
    });

    Item.prototype.datum = function(key) {
      var datum;
      datum = _.find(this._item.data, function(item) {
        return item.name === key;
      });
      return _.clone(datum);
    };

    Item.prototype.get = function(key) {
      var _ref;
      return (_ref = this.datum(key)) != null ? _ref.value : void 0;
    };

    Item.prototype.promptFor = function(key) {
      var _ref;
      return (_ref = this.datum(key)) != null ? _ref.prompt : void 0;
    };

    Item.prototype.load = function(done) {
      var options;
      options = {};
      return http.get(this._item.href, options, function(error, collection) {
        if (error) {
          return done(error);
        }
        return client.parse(collection, done);
      });
    };

    Item.prototype.links = function() {
      return this._item.links;
    };

    Item.prototype.link = function(rel) {
      var link;
      link = _.find(this._item.links || [], function(link) {
        return link.rel === rel;
      });
      if (!link) {
        return null;
      }
      Link = require("./link");
      if (link) {
        this._links[rel] = new Link(link);
      }
      return this._links[rel];
    };

    Item.prototype.edit = function() {
      var template;
      if (!this._template) {
        throw new Error("Item does not support editing");
      }
      template = _.clone(this._template);
      template.href = this._item.href;
      return new Template(template, this.data());
    };

    Item.prototype.remove = function(done) {
      var options;
      options = {};
      return http.del(this._item.href, options, function(error, collection) {
        if (error) {
          return done(error);
        }
        return client.parse(collection, done);
      });
    };

    return Item;

  })();

}).call(this);

});

require.define("/lib/attributes/template.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Collection, Template, client, http, _;

  _ = require("../underscore");

  http = require("../http");

  client = require("../client");

  Collection = require("./collection");

  module.exports = Template = (function() {

    function Template(href, _template, form) {
      var _form;
      this.href = href;
      this._template = _template;
      this.form = form != null ? form : {};
      _template = this._template;
      _form = this.form;
      _.each((_template != null ? _template.data : void 0) || [], function(datum) {
        if (!(_form[datum.name] != null)) {
          return _form[datum.name] = datum.value;
        }
      });
    }

    Template.prototype.datum = function(key) {
      var datum, _ref;
      datum = _.find(((_ref = this._template) != null ? _ref.data : void 0) || [], function(datum) {
        return datum.name === key;
      });
      return _.clone(datum);
    };

    Template.prototype.get = function(key) {
      return this.form[key];
    };

    Template.prototype.set = function(key, value) {
      return this.form[key] = value;
    };

    Template.prototype.promptFor = function(key) {
      var _ref;
      return (_ref = this.datum(key)) != null ? _ref.prompt : void 0;
    };

    Template.prototype.submit = function(done) {
      var form, options;
      if (done == null) {
        done = function() {};
      }
      form = _.map(this.form, function(value, name) {
        return {
          name: name,
          value: value
        };
      });
      options = {
        body: {
          template: {
            data: form
          }
        }
      };
      return http.post(this.href, options, function(error, collection) {
        if (error) {
          return done(error);
        }
        return client.parse(collection, done);
      });
    };

    return Template;

  })();

}).call(this);

});

require.define("/lib/attributes/query.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {
  var Collection, Query, client, http, _;

  _ = require("../underscore");

  http = require("../http");

  client = require("../client");

  Collection = require("./collection");

  module.exports = Query = (function() {

    function Query(_query, form) {
      var _form;
      this._query = _query;
      this.form = form != null ? form : {};
      _query = this._query;
      _form = this.form;
      _.each(_query.data, function(datum) {
        if (!(_form[datum.name] != null)) {
          return _form[datum.name] = datum.value;
        }
      });
    }

    Query.prototype.datum = function(key) {
      var datum;
      datum = _.find(this._query.data || [], function(datum) {
        return datum.name === key;
      });
      return _.clone(datum);
    };

    Query.prototype.get = function(key) {
      return this.form[key];
    };

    Query.prototype.set = function(key, value) {
      return this.form[key] = value;
    };

    Query.prototype.promptFor = function(key) {
      var _ref;
      return (_ref = this.datum(key)) != null ? _ref.prompt : void 0;
    };

    Query.define("href", {
      get: function() {
        return this._query.href;
      }
    });

    Query.define("rel", {
      get: function() {
        return this._query.rel;
      }
    });

    Query.define("prompt", {
      get: function() {
        return this._query.prompt;
      }
    });

    Query.prototype.submit = function(done) {
      var options;
      if (done == null) {
        done = function() {};
      }
      options = {
        qs: this.form
      };
      return http.get(this._query.href, options, function(error, collection) {
        if (error) {
          return done(error);
        }
        return client.parse(collection, done);
      });
    };

    return Query;

  })();

}).call(this);

});

require.define("/browser/cj.bare.coffee",function(require,module,exports,__dirname,__filename,process,global){(function() {

  window.CollectionJSON = require("../lib/client");

  window.CollectionJSON.http = require("../lib/http");

}).call(this);

});
require("/browser/cj.bare.coffee");
})();
