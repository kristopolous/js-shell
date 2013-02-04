(function(){
  var
    // prototypes and short cuts
    slice = Array.prototype.slice,  
    toString = Object.prototype.toString,
    styleSheet = {
      h3: 'margin:0;font-size:1.25em;font-weight:normal;margin-top:8px;color:#000',
      span: 'font-size:0.8em;display:inline-block;width:250px;min-width:250px;margin-left:5px',
      // not a div thanks to ie.
      b: 'font-size:0.8em;font-weight:normal;display:inline-block;width:400px;min-width:400px;margin-left:5px'
    },
    func,
    $buffer = [],
    $elCache = {ctr:0},
    $input,
    $watchCtr = 0,
    $watchList = [],
    $data,
    $history = {
      data: [],
      ptr: 0
    },
    $ = {
      scroll: true,
      cache: $elCache,
      history: $history
    },
    _Shell = {
      $: $
    },

    $thirdParty = {
      underscore: 'https://raw.github.com/documentcloud/underscore/master/underscore-min.js',
      backbone: 'https://raw.github.com/documentcloud/backbone/master/backbone.js',
      mustache: 'https://raw.github.com/janl/mustache.js/master/mustache.js',
      jquery: 'http://code.jquery.com/jquery-1.8.1.min.js',
      db: 'https://raw.github.com/kristopolous/db.js/master/db.min.js',
      mootools: 'http://mootools.net/download/get/mootools-core-1.3.2-full-compat-yc.js'
    },

    counters = {},
    tabList = {},
    active = false,
    addEvent_ = window.attachEvent ? 'attachEvent' : 'addEventListener',
    keyDown_ = window.attachEvent ? 'onkeydown' : 'keydown',
    outCount = 0;

  if (!Object.getOwnPropertyNames) {
    console.log("get a better browser faggot");
  }

  var _ = {
    // from underscore.js {
    isFun: function(obj) { return !!(obj && obj.constructor && obj.call && obj.apply) },
    isStr: function(obj) { return !!(obj === '' || (obj && obj.charCodeAt && obj.substr)) },
    isArr: Array.prototype.isArray || function(obj) { return toString.call(obj) === '[object Array]' },
    isDom: function(obj) { return obj.nodeName },
    uniq: function(obj) {
      var check = {};
      each(obj, function(which) {
        check[which] = 1;
      });
      return Object.keys(check);
    },
    // } end underscore.js
    // from jquery 1.5.2's type
    isObj: function( obj ){
      return obj == null ? 
        String( obj ) == 'object' : 
        toString.call(obj) === '[object Object]' || true ;
    }
  };

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
    return dom;
  }

  function element(type, propMap) {
    var element = document.createElement(type);

    if(propMap) {
      for(var prop in propMap) {

        if(prop == "attrib") {
          for(var attrib in propMap.attrib) {
            element.setAttribute(attrib, propMap.attrib[attrib]);
          }
        }

        element[prop] = propMap[prop];
      }
    }

    return element;
  }

  function _open(obj) {
    return '<' + obj + ' ' + style(obj) + '>';
  }

  function style(obj) {
    return "style='" + styleSheet[obj] + "'";
  }

  function runcode(str) {
    return Function("", "return " + str)();
  }

  function print() {
    var
      argsList = Array.prototype.slice.call(arguments),
      args = argsList.toString(),
      output = "",
      ix;

    if(typeof(argsList[0]) == 'object') {
      each(argsList, function(which) {
        if(_.isDom(which)) {
          $data.appendChild(which);
        } else if(_.isObj(which)) {
          // we dump the object in an object cache
          // so we can still have things that are encapsulated
          // but we can analyze them in the debugger.
          $elCache.ctr ++;
          $elCache[$elCache.ctr] = argsList[ix];

          // we do a reference breadcrumb to the screen
          print(element('a', {

            style: [
              'color:blue',
              'cursor:default'
            ].join(';'),

            onclick: function(){
              _Shell.extend("",this);
            },
            'innerHTML': 'self._Shell.$.cache[' + $elCache.ctr + ']'
          }));

          walk(which);
        } else {
          $data.appendChild(element('<br>'))
          $data.appendChild(argsList[ix]);
        }
      });
    } else {
      output += args.toString();

      if($data) {
        $data.innerHTML += "<br>" + output;
      } else {
        $buffer.push("<br>" + output);
      }
    }

    outCount++;

    if(outCount % 500 == 0) {
      var par = $data.parentNode;
      $data = par.removeChild($data);
      var last = $data.childNodes.length / 2;

      for(ix = 0; ix < last; ix++) {
        $data.removeChild($data.firstChild);
      }

      $data = par.insertBefore($data, par.lastChild);
    }
    if($.scroll) {
      $data.scrollTop = $data.scrollHeight;
    }

  }
  
  print.pre = function(){
    print([
      '<pre>', 
      Array.prototype.slice.call(arguments)
        .toString()
        .replace(/</g, '&lt;') 
        .replace(/>/g, '&gt;'),
      '</pre>'].join(''));
  }

  function reset(name){
    if(name in counters) {
      counters[name] = 0;
      print(name + ': (reset)');
    }
  }

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


  function watch(f, fName, args) {
    print(f, fName, args.toSource());
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
      print.pre(_stack.join('\n').replace(/\([^\)]*./g, ''));
    }
  }

  var $cmd = {
    clear: function(){
      $data.html("");
    },

    '!': function(tmp) {
      tmp.shift();
      print(eval(tmp.join(' ')).toSource());
    },

    unwatch: function(tmp) {
      var 
        wp = tmp[1],
        fBody = watchList[wp][0];
        fName = watchList[wp][1];

      eval(fName + ' = ' + fBody);
      print('watchpoint ' + wp + ' on ' + fName + ' removed.');

      delete watchList[wp];
    },

    load: function(name) {
      if(name.length == 1) {
        walk($thirdParty);
        return(0);
      }

      var url = $thirdParty[name[1]] || name[1];
      print("Loading " + url + "...");
      var toInject = document.createElement('script');
      toInject.setAttribute('src',url);
      document.body.appendChild(toInject);
    },

    watch: function(tmp) {
      if(tmp.length == 1) {
        var flag = false;

        for(ix in watchList) {
          print('[' + ix + '] ' + watchList[ix][1]);
          flag = true;
        }

        if(!flag) {
          print('No watchpoints set');
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
          'return self._Shell.watch(' + watchArgs + ');',
        '};',
        'return ret;'
      ].join('\n');
      
      $watchList[$watchCtr] = Function("", code)();

      print('watchpoint ' + $watchCtr + ' on ' + wp + ' set.');
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
              print(stack.join('.') + '.' + e + ': ' + eObj[e].toString().substr(0,30));
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
        print(term + ' not found in ' + base);
      }
    },
          
    '?': function(){
      var d = [];

      for(i in $cmd) {
        d.push(i);
      }

      d.sort();
      print(d.join('<br>'));
    }
  };

  function walk(eObj, noemit, hitIn) {
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
      thirdparam,
      container,
      el,
      base = $input.value,
      emit;

    if(_.isArr(eObj)) {
      each(eObj, function(which) {
        // type coersion to stringify things
        o.Objects.push('' + which);
      });
    } else if(_.isStr(eObj)) {
      console.log(eObj + "it's a string");
      return o;
    } else {
      each(getMembers(eObj), function(e) {
        if(hit[e]) {
          return;
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
            return;
          }

          if(emit) {
            emit = '(' + emit + ')';
          } else {
            emit = '';
          }

          thirdparam = (tmp == 'function') ? ',"function"' : '';

          // Things are broken up by category to be displayed.
          // But here they are aggregated across the board.

          if(cat == 'Values') {
            container = 'b';
          } else {
            container = 'span';
          }

          o[cat].push(
            _open(container) +
            '<a' +
              ' style=' + [ 'color:blue', 'cursor:pointer', 'cursor:hand' ].join(';') +
              ' onclick=self._Shell.extend("' + base + '",this' + thirdparam + ')' +
             '>' + e + '</a> ' + emit + '</' + container + '>'
          );
        } catch(ex) {
          console.log(ex);
          o[cat].push(_open('span') + e + ' (' + ex.toString().substr(0,20) + ')</span>');
        }
      });

      if(eObj.__proto__) {
        try {
          var toMerge = walk(eObj.__proto__, true, hit);

          for(cat in o) {
            o[cat] = Array.concat(o[cat], toMerge[cat]);
          }
        } catch(ex) {
          console.log(ex);
        }
      }
    }

    if(noemit) {
      return o;
    } else {
      var fillers = {Values:'', Objects:'', Functions:''};
      for(cat in fillers) {
        if(o[cat].length) {
          print(_open('h3') + cat + '</h3>' +
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


  function flash(){
    var inv= {
      background: 'black',
      color: 'white'
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

    var 
      tmp = el.value,
      original = el.value;

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
        $._ = (new Function("", "return " + tmp.join(' ')))();

        if($._ !== null) {
          
          var 
            div = element('div'),
            output = div.appendChild(element('a', {
              onclick: function() {
                _Shell.extend(tmp.join(' ').replace(/;$/,''))
              },
              attrib: {
                title: original,
                onmouseenter: 'with(this.style){textDecoration="underline";cursor="pointer"}',
                onmouseleave: 'with(this.style){textDecoration="none";cursor="default"}'
              },
              innerHTML: $._.toString()
            }));
          print(div);
        } else {
          print('(null)');
        }
      } catch(ex) {
        console.log(ex);
        print(tmp.join(' ') + ': ' + ex.message);
      }
    }

    $data.scrollTop = $data.scrollHeight;
  }

  function getMembers(obj) {
    var ret = [];
    while(!_.isStr(obj) && _.isObj(obj) && obj) {
     console.log(obj);
     ret = ret.concat( Object.getOwnPropertyNames(obj) );
     obj = Object.getPrototypeOf(obj);
    } 
    return _.uniq(ret).sort();
  }
  self.getMembers = getMembers;

  // get the maximum prefix between two strings
  function prefixCheck(str1, str2) {
    for(var 
          ix = 0, 
          len = Math.min(str1.length, str2.length); 

        ( str1.charAt(ix) == str2.charAt(ix) 
          && ix < len
        );

        ix++
       );

    return str1.substr(0, ix);
  }

  function tabComplete(){
    var 
      toWalk,
      tmp,
      // dump the trailing . if relevant for now
      toSend = $input.value.replace(/\.$/g,''),
      maxPrefix = false;

    if(toSend.length == 0) {
      toSend = 'self';
    }

    try {
      // This is for the case of "n = 1" or whatever
      eval(toSend);
      toWalk = runcode(toSend);

      if(typeof toWalk == 'undefined') {
        throw(0);
      } 

      print(toSend);
      walk(toWalk);

      // add a . if necessary for the next level heirarchy
      if(_.isObj(toWalk)) {
        tmp = $input.value;
        if(tmp.charAt(tmp.length - 1) != '.') {
          $input.value = tmp + '.';
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

      try {
        base = runcode(base);
      } catch(ex){
        console.log(ex);
        print('Failed to expand: ', baseOrig);
      }

      each(getMembers(base), function(ix) {
        if(ix.toLowerCase().indexOf(needle) ==  0) {
          if(!maxPrefix) {
            maxPrefix = ix;
          } else {
            maxPrefix = prefixCheck(maxPrefix, ix);
          }

          lastType = typeof(base[ix]);

          o.push([
            '&nbsp;',
            element('a', {
              onclick: function(){
                backup(this);
              },
              innerHTML: ix
            }),
            '(' + lastType + ')'
          ])

          last = ix;
        }
      });

      // we replace the invocation style with the more lenient
      // parenthesized version with quotations
      if(baseStr.length && baseStr.search(/[-\ ]/) > -1) {
        last = '["' + last + '"]';
      } else {
        last = '.' + last;
      }

      // if there are no possible completions,
      if(o.length == 0) {
        // flash the screen to indicate an error
        flash();
      
        // otherwise, if there is only only one possible completion
      } else if(o.length == 1) {
        // and if that type of completion is an object
        if (lastType == 'object') {
          // append a dot to it
          post = '.';
        }

        // and put it in the input
        $input.value = baseStr + last + post;

        // finally, if there are many possible completions
      } else {
        // show all of them
        print(o, 'br');

        // and find the least common prefix among them
        $input.value = baseStr + maxPrefix;
      }
    }

    // This will scroll the window down.
    $data.scrollTop = $data.scrollHeight;

    $input.focus();
  }

  _Shell.init = function(dom) {
    dom = dom || document.body;

    var container = css(element('div'), {
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'block',
      width: '100%',
      background: '#d4d8d3',
      color: '#000',
      fontFamily: 'monospace, monospace',
      padding: '4px'
    });

    $input = css(element('input'), {
      border: '0',
      width: '100%' 
    });

    $data = css(element('div'), {
      'maxHeight': '300px',
      'overflowY': 'scroll',
      width: '100%' 
    });

    container.appendChild($data);
    container.appendChild($input);

    dom.appendChild(container);

    $data[addEvent_]('mouseup', function(){
      $input.focus();
    }, true);

    $data.innerHTML += $buffer.join('');
    $buffer = [];

    $input[addEvent_](keyDown_, function(e) {
      var kc = window.event ? window.event.keyCode : e.which;

      // up
      if(kc == 38) {
        if($history.ptr > 0) {
          $history.ptr --;
          $input.value = $history.data[$history.ptr];
        } else {
          flash();
        }
      // down
      } else if(kc == 40) {
        if($history.ptr < ($history.data.length - 1)) {
          $history.ptr ++;
          $input.value = $history.data[$history.ptr];
        } else {
          $history.ptr = $history.data.length;
          $input.value = "";
        }
      // tab
      } else if(kc == 9) {
        // IE doesn't have prevent/stop so
        // we have to test for it.
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();

        tabComplete();

        // This is how IE stops prop, if this wasn't here
        // things would go off to the address bar.
        return false;

      // enter
      } else if(kc == 13) {
        // The this pointer freaks out IE, so
        // we just use the object we have from above.
        enter($input);
      }
    // This last argument is needed for addEventListener (non-ie)
    // and is ignored for attachEvent (IE)
    }, true);

    $input.focus();
  }

  _Shell.extend = function(base, el, type) {
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
    var 
      ap = '',
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

  self._Shell = _Shell;
})();

_Shell.init();
