self.Shell = (function(){
  var
    styleSheet = {
      h3: 'margin:0;font-size:16px;font-weight:normal;margin-top:8px',
      span: 'display:inline-block;min-width:250px;margin-left:5px'
    },
    func,
    pub,
    container,
    buffer = [],
    $input,
    $watchCtr = 0,
    $history = [],
    $_,
    $watchList = [],

    $thirdParty = {
      underscore: 'https://raw.github.com/documentcloud/underscore/master/underscore-min.js',
      backbone: 'https://raw.github.com/documentcloud/backbone/master/backbone.js',
      mustache: 'https://raw.github.com/janl/mustache.js/master/mustache.js',
      jquery: 'http://code.jquery.com/jquery-1.6.2.min.js',
      db: 'https://raw.github.com/kristopolous/db.js/master/db.min.js',
      mootools: 'http://mootools.net/download/get/mootools-core-1.3.2-full-compat-yc.js'
    },

    // cache of elements
    elCache = {ctr:0},
    history = {
      data: [],
      ptr: 0
    },
    tabList = {},
    data,
    active = false,
    noTime = false,
    epoch = new Date(),
    addEvent = window.attachEvent ? 'attachEvent' : 'addEventListener',
    outCount = 0;

  var _ = {
    isArr: Array.prototype.isArray || function(obj) { return toString.call(obj) === '[object Array]' },
  };

  // each from db.js
  var each = Array.prototype.forEach ?
    function (obj, cb) {
      if (_.isArr(obj)) { 
        obj.forEach(cb);
      } else {
        for( var key in obj ) {
          cb(key, obj[key]);
        }
      }
    } :

    function (obj, cb) {
      if (_.isArr(obj)) {
        for ( var i = 0, len = obj.length; i < len; i++ ) { 
          cb(obj[i], i);
        }
      } else {
        for( var key in obj ) {
          cb(key, obj[key]);
        }
      }
   };

  function uncss(dom, obj) {
    for(var key in obj) {
      dom.style[key] = 'inherit';
    }
  }

  function css(dom, obj) {
    for(var key in obj) {
      dom.style[key] = obj[key];
    }
  }

  function element(type, propMap) {
    var element = document.createElement(type);

    for(var prop in propMap) {
      element[prop] = propMap[prop];
    }

    return element;
  }

  function open(obj) {
    return '<' + obj + ' ' + style(obj) + '>';
  }
  function style(obj) {
    return "style='" + styleSheet[obj] + "'";
  }

  function getTime(){
    var d = new Date();
    return ((d.getTime() - epoch.getTime()) / 1000).toFixed(3);
  }

  function print() {
    var
      argsList = Array.prototype.slice.call(arguments),
      args = argsList.toString(),
      output = "",
      ix;

    if(typeof(argsList[0]) == 'object') {
      for(ix = 0; ix < argsList.length; ix++) {
        if(typeof(argsList[ix]) == 'object') {
          // we dump the object in an object cache
          // so we can still have things that are encapsulated
          // but we can analyze them in the debugger.
          elCache.ctr ++;
          elCache[elCache.ctr] = argsList[ix];

          // we do a reference breadcrumb to the screen
          raw(element('a', {
            onclick: function(){
              extend("",this)
            },
            innerHTML: '_.cache[' + elCache.ctr + ']'
          });

          walk(argsList[ix]);
        } else {
          data.append('<br>' + argsList[ix]);
        }
      }
    } else {
      if(!noTime) {
        output += getTime();
        output += "[" + args.toString() + "]";
      } else {
        output += args.toString();
      }

      if(data) {
        data.innerHTML += "<br>" + output;
      } else {
        buffer.push("<br>" + output);
      }
    }

    outCount++;

    if(outCount % 500 == 0) {
      var par = data.parentNode;
      data = par.removeChild(data);
      var last = data.childNodes.length / 2;

      for(ix = 0; ix < last; ix++) {
        data.removeChild(data.firstChild);
      }

      data = par.insertBefore(data, par.lastChild);
    }
    if(pub.scroll) {
      $data.scrollTop = $data.scrollHeight;
    }

  }
  
  _.scroll = true;
  // After declaration, we create a backreference
  // to the cache to expose it
  _.cache = elCache;
  _.history = history;


  function pre(){
    var old = noTime;
    noTime = true;

    print([
      '<pre>', 
      Array.prototype.slice.call(arguments)
        .toString()
        .replace(/</g, '&lt;') 
        .replace(/>/g, '&gt;'),
      '</pre>'].join(''));

    noTime = old;
  }


  function reset(name){
    if(name in counters) {
      counters[name] = 0;
      print(name + ': (reset)');
    }
  }

  var counters = {};
  function incr(name){
    if(name in counters) {
      counters[name]++;
    } else {
      counters[name] = 1;
    }

    print([
      element('a', {
        onclick: function(){
          reset(name)
        },
        innerHTML: name
      }),
      ': ' + counters[name]
    ]);
  }

  function decr(name) {
    if(name in counters) {
      counters[name]--;
    } else {
      counters[name] = 0;
    }

    print([
      element('a', {
        onclick: function(){
          reset(name)
        },
        innerHTML: name
      }),
      ': ' + counters[name]
    ]);
  }

  function raw(){
    var old = noTime;
    noTime = true;
    print(Array.prototype.slice.call(arguments).toString());
    noTime = old;
  }

  function watch(f, fName, args) {
    raw(f, fName, args.toSource());
    stack(2);
    $watchList[f][0].apply(this, args);
    $data.scrollTop = $data.scrollHeight;
  }

  function stack(count) {
    var _stack;

    try {
      throw new Error();
    } catch(e) {
      _stack = e.stack.split('\n');
      _stack.shift();
      _stack.shift();
      if(count) {
        while(count-- > 0) {
          _stack.shift();
        }
      }
      pre(_stack.join('\n').replace(/\([^\)]*./g, ''));
    }
  }

  var $cmd = {
    clear: function(){
      $data.html("");
    },

    '!': function(tmp) {
      tmp.shift();
      raw(eval(tmp.join(' ')).toSource());
    },

    unwatch: function(tmp) {
      var 
        wp = tmp[1],
        fBody = watchList[wp][0];
        fName = watchList[wp][1];

      eval(fName + ' = ' + fBody);
      raw('watchpoint ' + wp + ' on ' + fName + ' removed.');

      delete watchList[wp];
    },

    load: function(name) {
      if(name.length == 1) {
        walk($thirdParty);
        return(0);
      }

      var url = $thirdParty[name[1]] || name[1];
      raw("Loading " + url + "...");
      var toInject = document.createElement('script');
      toInject.setAttribute('src',url);
      document.body.appendChild(toInject);
    },

    watch: function(tmp) {
      if(tmp.length == 1) {
        var flag = false;

        for(ix in watchList) {
          raw('[' + ix + '] ' + watchList[ix][1]);
          flag = true;
        }

        if(!flag) {
          raw('No watchpoints set');
        }

        return;
      }

      $watchCtr ++;

      var 
        wp = tmp[1], 
        watchArgs,
        wrap,
        code;

      watchArgs = [
        $watchCtr,
        '"' + wp + '"', 
        'Array.prototype.slice.call(arguments)'
      ].join(',');

      code = [
        'var ret = [' + wp + ', "' + wp + '"];',
        wp + ' = function() {',
          'return Gdb.watch(' + watchArgs + ');',
        '};',
        'return ret;'
      ].join('\n');
      
      $watchList[$watchCtr] = Function("", code)();

      raw('watchpoint ' + $watchCtr + ' on ' + wp + ' set.');
    },

    search: function(tmp) {
      tmp.shift();

      var 
        base = tmp[0],
        type,
        stack = [],
        foundCount = 0,
        // prevent recursion
        maxdepth = 4,
        curdepth = 0,
        val,
        term = tmp[1];

      function recurse(eObj) {
        curdepth++;

        if(curdepth > maxdepth) {
          return;
        }

        for(var e in eObj) {
          if(eObj.hasOwnProperty(e)) {
            type = typeof eObj[e];
            val = eObj[e];

            if(((type == 'number') || (type == 'string')) && 
               val.toString().search(term) > -1) {

              foundCount++;
              raw(stack.join('.') + '.' + e + ': ' + eObj[e].toString().substr(0,30));
            } else if(type == 'object') {
              stack.push(e);
              recurse(eObj[e]);
              stack.pop();
            }
          }
        }

        curdepth--;
      }

      stack.push(base);
      recurse(self[base]);

      if(!foundCount) {
        raw(term + ' not found in ' + base);
      }
    },
          
    '?': function(){
      var d = [];

      for(i in $cmd) {
        d.push(i);
      }

      d.sort();
      raw(d.join('<br>'));
    }
  };

  function walk(eObj, noemit, hitIn) {
    if(!$input) {
      return;
    }
    var 
      tmp,
      o = {
        'Objects':[],
        'Functions':[],
        'Values':[]
      },
      map = {
        'object' : 'Objects',
        'function' : 'Functions',
        'boolean' : 'Values',
        'string' : 'Values',
        'number' : 'Values'
      },
      ix,
      len,
      hit = hitIn || {},
      type,
      cat,
      el,
      base = $input.value,
      emit;

    if(eObj instanceof Array) {
      len = eObj.length;

      for(ix = 0; ix < len; ix++) {
        el = eObj[ix];
        o.push(el.toSource());
      }
    } else if(typeof eObj == 'string') {
      return o;
    } else {
      for(e in eObj) {
        if(hit[e]) {
          continue;
        } else {
          hit[e] = true;
        }

        try {
          type = typeof eObj[e];
          tmp = type;
          cat = map[type];

          emit = false;

          if(tmp == 'number') {
            emit = eObj[e];
          } else if(tmp == 'string') {
            emit = eObj[e].substr(0,30).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          } else if(tmp == 'boolean') {
            emit = eObj[e].toString();
          } else if(tmp == 'function' && eObj == self) {
            continue;
          }

          if(emit) {
            emit = '(' + emit + ')';
          } else {
            emit = '';
          }

          o[cat].push(open('span') + '<a onclick=Gdb.extend("' + base + '",this' + (
              (tmp == 'function') ?
                ',"function"' :
                ''
              ) +
            ')>' + e + '</a> ' + emit + '</span>');
        } catch(ex) {
          o[cat].push(open('span') + e + ' (' + ex.toString().substr(0,20) + ')</span>');
        }
      }

      if(eObj.__proto__) {
        try {
          var toMerge = walk(eObj.__proto__, true, hit);

          for(cat in o) {
            o[cat] = Array.concat(o[cat], toMerge[cat]);
          }
        } catch(ex) {
          
        }
      }
    }

    if(noemit) {
      return o;
    } else {
      var fillers = {Values:'<br>', Objects:'', Functions:''};
      for(cat in fillers) {
        if(o[cat].length) {
          raw(open('h3') + cat + '</h3>' +
            o[cat].sort().join(fillers[cat])
          );
        }
      }
    }
  }

  function backup(el) {
    // we take the base value, add a nominal period, then
    // search and replace to remove excess then 1 period,
    // if necessary
    var set = $input.value.split('.');
    set.pop();
    
    $input.value = set.join('.') + '.' + el.innerHTML;
    tabComplete();
  }

  function extend(base,el,type) {
    if(!el) {
      $input.value = base;

      $input.selectionStart = 
        $input.selectionEnd = 
        $input.value.length;
      return;
    } 

    // we take the base value, add a nominal period, then
    // search and replace to remove excess then 1 period,
    // if necessary
    var ap = '',
        combined = [base, el.innerHTML].join('.').replace(/\.+/g, '.');

    if(type == 'function') {
      ap = '()';
    }

    $input.value = (combined + ap).replace(/^\./, '');

    if(!ap.length) {
      tabComplete();
    }

    $input.selectionStart = base.length;
    $input.selectionEnd = $input.value.length;
  }


  function flash(){
    var inv= {
      background: 'black !important',
      color: 'white !important'
    };

    css($data, inv);
    css($input, inv);

    setTimeout(function(){
      uncss($data, inv);
      uncss($input, inv);
    }, 150);
  }

  function enter(el){
    $history.data.push(el.value);
    $history.ptr = $history.data.length;  

    tmp = el.value;
    el.value = "";

    // !! is the last command, like the shell
    tmp = tmp.replace(/!!/g, function(str, p1) {
      return $history.data[$history.data.length - 2];
    });

    // encapsulate code in ` and ` to be eval'd
    tmp = tmp.replace(/`([^`]*)`/g, function(str, p1) {
      return eval(p1);
    });

    tmp = tmp.split(' ');

    if($cmd[tmp[0]]) {
      $cmd[tmp[0]](tmp);
    } else {
      try {
        $_ = (new Function("", "return " + tmp.join(' ')))();

        if($_ !== null) {
          raw(element('a', {
            onclick: function() {
              extend(tmp.join(' ').replace(/;$/,''))
            },
            innerHTML: $_.toString()
          }));
        } else {
          raw('(null)');
        }
      } catch(ex) {
        raw(tmp.join(' ') + ': ' + ex.message);
      }
    }

    $data.scrollTop = $data.scrollHeight;
  }

  // get the maximum prefix between two strings
  function prefixCheck(str1, str2) {
    var 
      len = Math.min(str1.length, str2.length),
      ix;

    for(ix = 0; ix < len; ix++) {
      if(str1.charAt(ix) != str2.charAt(ix)) {
        break;
      }
    }

    return str1.substr(0, ix);
  }

  function tabComplete(){
    var 
      input = $input, 
      toSend = input.value.replace(/\.$/g,''),
      maxPrefix = false;

    if(toSend.length == 0) {
      toSend = 'self';
    }

    try {
      eval(toSend);

      var 
        toWalk = Function("", "return " + toSend)(),
        tmp = input.value;

      if(typeof toWalk == 'undefined') {
        throw(0);
      } else {
        raw(toSend);
        walk(toWalk);

        // add a . if necessary for the next level heirarchy
        if(typeof toWalk == 'object') {
          if(tmp.charAt(tmp.length - 1) != '.') {
            input.value = tmp + '.';
          }
        }
      }
    } catch(ex) {
      // completion
      var 
        splitUp = toSend.split('.'),
        needle = splitUp.pop().toLowerCase(),
        o = [],
        last = false,
        post = '',
        lastType,
        base = splitUp.join('.').replace(/^\./,''),
        baseOrig = base,
        baseStr = base;

      if(base.length == 0) {
        base = 'self';
      }

      try{
        base = Function("", "return " + base)();
      } catch(ex){
        print('Failed to expand: ', baseOrig);
      }

      for(var ix in base) {
        if(ix.toLowerCase().indexOf(needle) ==  0) {
          if(!maxPrefix) {
            maxPrefix = ix;
          } else {
            maxPrefix = prefixCheck(maxPrefix, ix);
          }

          lastType = typeof(base[ix]);

          each([
            '&nbsp;',
            element('a', {
              onclick: function(){
                backup(this);
              },
              innerHTML: ix
            }),
            '(' + lastType + ')'
          ], o.push);

          last = ix;
        }
      }

      if(baseStr.length) {
        last = '["' + last + '"]';
      }

      if(o.length == 1) {
        if (lastType == 'object') {
          post = '.';
        }

        input.value = baseStr + last + post;

      } else if(o.length > 0){
        input.value = baseStr + maxPrefix;
        raw(o.join('<br>'));
      } else {
        flash();
      }
    }

    $data.scrollTop = $data.scrollHeight;

    $input.focus();
  }

  var pub = function(dom) {
    if(container) {
      return;
    }

    history.data = [];
    history.ptr = history.data.length;

    dbg = document.getElementById('dbg');

    if(dbg) {
      pub.container = container = dbg;
      $input = document.getElementsByTagName('input')[0];
      data = dbg.firstChild;
    } else {
      pub.container = container = document.createElement('div');
      css(container, {
        color: '#000',
        fontFamily: 'monospace, monospace',
        padding: '4px'
      });

      container.setAttribute('id', 'dbg');
      container.id = 'dbg';

      $input = document.createElement('input');
      css($input, {
        border: '0',
        width: '100%' 
      });

      data = document.createElement('div');
      css(data, {
        height: '800px',
        'overflow-Y': 'scroll',
        width: '100%' 
      });

      container.appendChild(data);
      container.appendChild($input);

      dom.appendChild(container);
    }

    data[addEvent]('mouseup', function(){
      $input.focus();
    }, true);

    data.innerHTML += buffer.join('');
    buffer = [];
    _.data = data;

    $input[addEvent]('keydown', function(e) {
      var kc;

      if (window.event) kc = window.event.keyCode;
      else if (e) kc = e.which;

      if(kc == 38) {
        if(history.ptr > 0) {
          history.ptr --;
          $input.value = history.data[history.ptr];
        } else {
          flash();
        }
      } else if(kc == 40) {
        if(history.ptr < (history.data.length - 1)) {
          history.ptr ++;
          $input.value = history.data[history.ptr];
        } else {
          history.ptr = history.data.length;
          $input.value = "";
        }
      } else if(kc == 9) {
        e.preventDefault();
        e.stopPropagation();
        tabComplete();
      } else if(kc == 13) {
        enter(this);
      }
    }, true);
  }


  return pub;
})();
