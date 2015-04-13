/*! roads - v0.0.1 - 2015-04-08 */var Ro = (function () {

  var Roads = {

    init: function (callback) {

        Ro.Session = Ro.Session = {};
        var writeImports = function(e) {

            var loader = document.querySelector ('ro-loader');
            if (loader) {
                loader.show();
            }

            var imports = document.querySelectorAll ('link[rel="import"]');
            var RoApp   = document.querySelector ('ro-app ro-scroll');


            for (var i = 0; i < imports.length; i++) {
                var view  = imports[i].import.body.querySelector ('ro-view');
                var clone = view.cloneNode(true);

                RoApp.appendChild (clone);
            };

            var stageToScroll = document.querySelector('ro-stage[scroll]');

            if (stageToScroll) {
                Ro.Globals.roAppScroll = new IScroll(stageToScroll, {
                    probeType:  3,
                    mouseWheel: true,
                    bounce: true,
                    keyBindings: true,
                    invertWheelDirection: false,
                    momentum: true,
                    fadeScrollbars: false,
                    scrollbars: false,
                    interactiveScrollbars: false,
                    resizeScrollbars: false,
                    shrinkScrollbars: false,
                    click: false,
                    preventDefaultException: { tagName:/.*/ }
                });
            }

            setTimeout (callback, 100);

        }

        window.addEventListener ('HTMLImportsLoaded', writeImports.bind (this));

        document.addEventListener ("deviceready", function (){

            var RoApp = document.querySelector ('ro-app');

            RoApp.style.webkitTransition = '10ms';
            RoApp.style.height = window.innerHeight + 'px';

            document.addEventListener ("showkeyboard", function () {

              setTimeout (function (){

                var activeElementTop = document.activeElement.getBoundingClientRect().top + 50;
                var innerHeight = window.innerHeight;

                if (activeElementTop > innerHeight) {
                    var x = document.querySelector ('ro-view#' + RoApp.activeView);
                    x.style.webkitTransition = '1s';
                    x.style.webkitTransform = 'translateY(-200px)';
                }

              },  100);

            }, false);

            document.addEventListener ("hidekeyboard", function () {

                var x = document.querySelector ('ro-view#' + RoApp.activeView);
                x.style.webkitTransition = '10ms';
                x.style.webkitTransform = 'translateY(0)';

            }, false);

            document.addEventListener ("backbutton", function () {
                Ro.Globals.backButtonFunction ();
            }, false);

        }, false);

    },

    styleGenerator : function (styles) {

      var style = '';

      for (key in styles) {
        style += key + ': ' + styles[key] + '; ';
      }

      return style;

    },

    templateEngine : function (tpl, data) {

        var re = /{{([^}}]+)?}}/g;
        var filter, key, filterParameter, hasFilter = 0, keyToFind = '';

        if (tpl) {
            while(match = tpl.match(re)) {

                hasFilter = match[0].indexOf('|');

                if (hasFilter > 0) {
                  filter = match[0].split('|')[1].replace('}}','').trim();
                  if (filter.indexOf(':') > 0) {
                    filterParameter = filter.split(':')[1];
                    filter = filter.split(':')[0];
                  }
                  key = match[0].split('|')[0].replace('{{','').trim();
                } else {
                  key = match[0].replace('{{', '').replace('}}','').trim();
                }

                if (hasFilter > 0 && Ro.Filter.filters[filter]) {
                  if (data && filter !== 'i18n') {

                    // (data, key, filterParameter)
                    tpl = tpl.replace(match[0], Ro.Filter.filters[filter](this.findByKey (data, key), key, filterParameter));

                  } else {
                    tpl = tpl.replace(match[0], Ro.Filter.filters[filter](key, filterParameter));
                  }
                } else {
                  tpl = tpl.replace(match[0], this.findByKey (data, key));
                }
            }
        }

        return tpl;

    },

    findByKey : function (data, key) {

        var value  = data;
        var keys   = key.split('.');

        for(var x = 0, size = keys.length; x < size; x++){
            if (value) {
                value = value[keys[x]];
            }
        }

        return value || "";

    },

      Http: function () {

        // set defaults
        this.url         = '';
        this.method      = 'get';
        this.async       = true;
        this.data        = null;
        this.contentType = 'application/json';

        //callback for success
        this.success     = null;
        this.timeout     = 30000;
        this.ontimeout   = null;
        this.roSuccess   = null;

        //callback for error
        this.error       = null;

        // do request
        this.send = function() {

            var request = new XMLHttpRequest();

            request.open(this.method, this.url, this.async);
            request.setRequestHeader('Content-Type', this.contentType);
            request.setRequestHeader("Cache-Control", "no-cache");

            request.withCredentials = true;

            //closure
            request.onreadystatechange = this.sendCallback.bind(this);

            request.ontimeout = (function (scope) {
                return function () {
                    if (scope.ontimeout) {
                        scope.ontimeout (this, scope);
                    }
                };
            })(this);

            request.send(this.data);

            this.dropConnection = setTimeout((function(request){
                return function () {
                    request.abort();
                }
            })(request), this.timeout);

        };

        this.sendCallback = function (e) {

            var xhr = e.target;
            var parsedResponse = '';

            if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 201 || xhr.status === 204)) {

                clearInterval (this.dropConnection);

                if (this.success) {

                    if (xhr.responseText && this.contentType === 'application/json') {
                      parsedResponse = JSON.parse (xhr.responseText);
                    } else {
                      parsedResponse = xhr.responseText;
                    }

                    this.success (parsedResponse, xhr);
                }

            } else if (xhr.readyState === 4) {

                if (this.error) {
                    this.error (xhr);
                }

            }

        };

      },

      dateToIEandSafari: function (date) {

        return (date.substring(0, date.lastIndexOf("+") + 4) + 'Z').replace('+', '.');;

      }
  }

  Roads.Controller = function (viewID, methods) {

    var Controller = function () {

        this.view = document.querySelector ('[ro-controller="' + viewID + '"]');

        this.init ();

        if (this.show) {
            this.view.setShowFunction (this.show.bind (this));
        }

    }

    if (methods) {
      for (key in methods) {
        Controller.prototype[key] = methods[key];
      }
    }

    return Controller;

  }

  Roads.Environment = {
    isTouchDevice: !!('ontouchstart' in window),
      platform: {
        androidVersion: (function (){
            var isAndroid = navigator.userAgent.match(/Android([^;]*)/);
            if (isAndroid && isAndroid.length > 1) {
                return parseInt(isAndroid[1], 10);
            }
            return false;
        }()),
        isAndroid: navigator.userAgent.match('Android') === null ? false : true,
        isIPhone: navigator.userAgent.match('iPhone') === null ? false : true,
        isIPad: navigator.userAgent.match('iPad') === null ? false : true,
        isWPhone: navigator.userAgent.match(/Trident/) ? true : false,
        isIOS: (navigator.userAgent.match('iPhone') || navigator.userAgent.match('iPad')) ? true : false,
        isFxOS: (navigator.userAgent.match(/Mozilla\/5.0 \(Mobile;/) || navigator.userAgent.match('iPad')) ? true : false
      }
  }

  Roads.Globals = {
    backButtonFunction: function () {
        alert('No back function defined');
    }
  }

  Roads.Events = {
    click: function () {
        return (Roads.Environment.isTouchDevice) ? 'touchstart' : 'click'
    }
  }

  Roads.Filter = {
    filters: {

        date: function (dateValue, key, dateFormat) {

            if (!dateValue) {
              throw 'Roads.Filter.date: dateValue is mandatory';
            }

            var format = dateFormat || Ro.i18n.defaults.date;
            var date   = new Date (dateValue);
            var year   = date.getUTCFullYear();
            var day    = date.getUTCDate();
            var month  = date.getUTCMonth()+1;

            format = format.replace(/yyyy/g, year);
            format = format.replace(/yy/g, String(year).substr(2,2));
            format = format.replace(/MM/g, (month < 10) ? '0' + month : month);
            format = format.replace(/M/g, month);
            format = format.replace(/dd/g, (day < 10) ? '0' + day : day);
            format = format.replace(/d/g, day);

            return format;

        },

        time: function (timeValue, key, timeFormat) {

            if (!timeValue) {
              throw 'Roads.Filter.date: timeValue is mandatory';
            }

            if (Ro.Environment.platform.isWPhone || Ro.Environment.platform.isIOS) {
                timeValue = Roads.dateToIEandSafari (timeValue);
            }

            var format  = timeFormat || Ro.i18n.defaults.time;
            var time    = new Date (timeValue);
            var hours24 = time.getHours();
            var hours12 = (hours24 + 11) % 12 + 1;
            var minutes = time.getMinutes();
            var seconds = time.getSeconds();
            var a       = (hours24 >= 12) ? 'pm' : 'am'

            format = format.replace(/HH/g, (hours24 < 10) ? "0" + hours24 : hours24);
            format = format.replace(/H/g, hours24);
            format = format.replace(/hh/g, (hours12 < 10) ? "0" + hours12 : hours12);
            format = format.replace(/h/g, hours12);
            format = format.replace(/mm/g, (minutes < 10) ? "0" + minutes : minutes);
            format = format.replace(/ss/g, seconds);
            format = format.replace(/a/g, a);

            return format;
        },

        float: function (value) {
            if (value) {
                return (value+'').replace('.', Ro.i18n.defaults.decimalSymbol) || '';
            }

            return '0';
        },

        i18n: function (i18nKey) {
            return Ro.i18n.translations[i18nKey] || i18nKey;
        }
    },
    register: function (filterName, filterImplementation) {

        if (!filterName) {
          throw 'Roads.Filter.register: filterName is mandatory';
        }

        this.filters[filterName] = filterImplementation;
    }
  }

  Roads.i18n = {
    defaults: {
        currency: "US$",
        date: "MM/dd/yyyy",
        decimalSymbol: ",",
        digitalGrouping: ".",
        language: "en",
        time: "HH:mm",
        systemOfMeasurement: "METRIC" // METRIC | IMPERIAL
    },
    translations: {},
    translateView: function (view) {

        var elements = view.querySelectorAll('[i18n]');
        for (var i = elements.length - 1; i >= 0; i--) {
            this.translateElement (elements[i]);
        };
    },
    translateElement: function (el) {
        var i18n = el.getAttribute('i18n');

        switch (i18n) {
            case '':
                el.innerHTML = Ro.templateEngine(el.getAttribute('i18nKey'));
                break;
            default:
                el.setAttribute(i18n, Ro.templateEngine(el.getAttribute('i18nKey')));
                break;
        }

    },

    getTranslationByKey : function(key){

        var value = Ro.i18n.translations[key];

        if (value){
            return value;
        }

        return key;
    },

    getTranslationByKeyOrAlternative : function (resourceId, alternativeValue){

        var message = Ro.i18n.getTranslationByKey (resourceId);

        if (alternativeValue && message === resourceId) {
            return alternativeValue;
        }

        return message;
    }

  }

  return Roads;

}());
(function (){

  xtag.register ('ro-app', {
    lifecycle: {
      created: function () {

        this.innerHTML = '<ro-scroll></ro-scroll>'

        // Create style to calc correct ro-view heights
        var updateStyle = function () {

          var roadStyles = document.querySelector('style#roViewStyles');

          if (!roadStyles) {
            roadStyles = document.createElement('style');
            roadStyles.id = 'roViewStyles';
            document.head.appendChild (roadStyles);
          }

          roadStyles.innerHTML = 'ro-view { height: ' + window.innerHeight + 'px}';
        }

        document.addEventListener("deviceready", function () {

          setTimeout(updateStyle, 500);

        });

        window.addEventListener('orientationchange', function () {

          setTimeout(updateStyle, 500);

        });

      },

      inserted: function () {

        this.putViewsInFirstPosition ();

        setTimeout(function (){
          var loader  = document.querySelector ('ro-loader');
          loader.hide();
        }, 500);

      },

      removed: function () {
      }
    },
    events: {
      reveal: function () {



      }
    },
    accessors: {
    },
    methods: {

      putViewsInFirstPosition: function () {

        var views = document.querySelectorAll ('ro-view:not([mainPage])');
        var firstView = document.querySelector ('ro-view[mainPage]');

        if (firstView) {

          Ro.i18n.translateView (firstView);

          firstView.style.zIndex = 1;
          firstView.style.webkitTransition = '10ms';
          firstView.style.transition = '10ms';
          firstView.style.webkitTransform = 'translateX(0)';
          firstView.style.transform = 'translateX(0)';

          RoApp.activeView = firstView.id;

        }

        if (views) {
          for (var i = 0, l = views.length; i < l; i++) {

            views[i].style.zIndex = 2;
            views[i].style.webkitTransform = 'translateX(' + window.innerWidth + 'px)';
            views[i].style.transform = 'translateX(' + window.innerWidth + 'px)';
            views[i].style.webkitTransition = '10ms';
            views[i].style.transition = '10ms';

          };
        }

      },

      gotoView: function (fromID, toID) {

        var from, to;

        from = document.getElementById (fromID);
        to   = document.getElementById (toID);

        if (!from) {
          throw 'ro-view: "From" view can not be found';
        }

        if (!to) {
          throw 'ro-view: "To" view can not be found';
        }

        if (to === from) {
          throw 'ro-view: "To" and "From" can not be the same';
        }

          to.show(fromID);

        to.style.transition = '10ms';

        to.style.zIndex = 2;
        to.style.transition = '300ms';
        to.style.transitionTimingFunction = 'linear';
        to.style.webkitTransform = 'translateX(0)';
        to.style.transform = 'translateX(0)';

        from.style.transition = '10ms';
        from.style.zIndex = 3;
        from.style.transition = '300ms';
        from.style.transitionTimingFunction = 'linear';
        from.style.webkitTransform = 'translateX(-' + window.innerWidth + 'px)';
        from.style.transform = 'translateX(-' + window.innerWidth + 'px)';

        Ro.i18n.translateView (to);

        this.activeView = toID;

      },

      backtoView: function (fromID, toID) {

        var from, to;

        from = document.getElementById (fromID);
        to   = document.getElementById (toID);

        if (!from) {
          throw 'ro-view: "From" view can not be found';
        }

        if (!to) {
          throw 'ro-view: "To" view can not be found';
        }

        if (to === from) {
          throw 'ro-view: "To" and "From" can not be the same';
        }

        to.transition = '10ms';
        to.style.zIndex = 3;
        to.transition = '300ms';
        to.style.transitionTimingFunction = 'linear';
        to.style.webkitTransform = 'translateX(0)';
        to.style.transform = 'translateX(0)';


        from.transition = '10ms';
        from.style.zIndex = 2;
        from.transition = '300ms';
        from.style.transitionTimingFunction = 'linear';
        from.style.webkitTransform = 'translateX(' + window.innerWidth + 'px)';
        from.style.transform = 'translateX(' + window.innerWidth + 'px)';

        Ro.i18n.translateView (to);

        this.activeView = toID;

          to.show(fromID);

      }
    }
  });

})();
(function (){

  xtag.register ('ro-back-button', {
    lifecycle: {
      created: function () {
        this.addListeners ();
      },
      inserted: function () {
        if (!Ro.Environment.platform.isIOS && !Ro.Environment.platform.isFxOS) {
          this.style.display = 'none';
        }
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {     
    },
    methods: { 
      addListeners: function () {
        this.addEventListener (Ro.Events.click (), function () {
          Ro.Globals.backButtonFunction ();
        }, true);
      },
      registerBackAction: function (callback) {
        Ro.Globals = Ro.Globals || {};
        Ro.Globals.backButtonFunction = callback;
      }
    }
  });

})();
(function (){

  xtag.register ('ro-button', {
    lifecycle: {
      created: function () {
        this.addListeners ();
      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      },
        'click': function () {
            if (this.clickCallback) {
                this.clickCallback();
            }
        }
    },
      accessors: {
      },
      clickCallback: function (){
      },
      methods: {
          addListeners: function () {
              var action = new Function (this.getAttribute('action'));
              this.addEventListener ('click', action);
          },
          setClickCallback: function (callback) {
              this.clickCallback = callback;
          }
      }
  });

})();
(function (){

  xtag.register ('ro-checkbox', {
    lifecycle: {
      created: function () {

        if (!this.firstElementChild) {
          this.checkInput = document.createElement ('input');
          this.checkInput.addEventListener ('click', function (e) {
            e.preventDefault ();
          });
          this.setAttribute ('checked', false);
          this.addEventListener ('click', this.toggleCheck);
          this.checkInput.type = 'checkbox';
          this.appendChild (this.checkInput);          
        }

      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {     
    },
    methods: { 
      addListeners: function () {
        var action = new Function (this.getAttribute('action'));
        this.addEventListener ('click', action);
      },

      toggleCheck: function () {

        if (this.checkInput.checked) {
          this.uncheck ();
        } else {
          this.check ();
        }

      },

      check: function () {
        this.checkInput.checked = true;
        this.setAttribute ('checked', true);
      },

      uncheck: function () {
        this.checkInput.checked = false;
        this.setAttribute ('checked', false);
      },

      value: function () {
        if (this.checkInput.checked) {
          return true;
        }
        return false;
      }
    }
  });

})();
(function (){

  xtag.register ('ro-float-menu', {
    lifecycle: {

      created: function () {

        this.create ();

      },

      inserted: function () {

        this.insert ();

      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {
    },
    methods: {

      create: function () {

        this.xtag.itemsAreVisible = false;

        this.xtag.overlay = document.createElement('ro-overlay');
        this.xtag.hitArea = document.createElement('ro-hitarea');

        this.parseList ();

      },

      insert: function () {

        this.appendChild(this.xtag.hitArea);
        this.parentElement.appendChild (this.xtag.overlay);

        var clickCallback = function (e) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleMenu ();
        }

        this.xtag.hitArea.onclick = clickCallback.bind(this);

      },

      recreate: function () {
        this.create ();
        this.insert ();
      },

      addItem: function (item) {
      },
      removeItem: function (item) {
      },

      toggleMenu: function () {
        if (this.xtag.itemsAreVisible) {
           this.hideItems ();
        } else {
          this.showItems ();
        }
      },

      hideItems: function () {
        this.setAttribute('state', 'hideItems');
        this.xtag.overlay.setAttribute('state', 'hideItems');

        this.xtag.itemsAreVisible = false;
      },

      showItems: function (items) {
        this.setAttribute('state', 'showItems');
        this.xtag.overlay.setAttribute('state', 'showItems');
        this.xtag.itemsAreVisible = true;
      },

        parseList: function () {
            var items = this.querySelectorAll('ro-item');
            for (var i = 0; i < items.length; i++) {

                var itemActionFunction = new Function (items[i].getAttribute ('action'));
                var action = (function (scope, func){
                    return function () {
                        func ();
                        scope.hideItems ();
                    };
                }(this, itemActionFunction));

                items[i].addEventListener ('click', action);
                items[i].setAttribute ('text', Ro.templateEngine(items[i].getAttribute ('i18nKey')));
            }
        }
    }
  });

})();
(function (){

  xtag.register ('ro-header', {
    lifecycle: {
      created: function () {
        if (Ro.Environment.platform.isIOS) {
          this.style.paddingTop = '20px';
        }
      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
    },
    accessors: {     
    },
    methods: {       
    }
  });

})();
(function () {
    xtag.register('ro-inline-menu',{
        lifecycle: {
            created: function () {
                this.hide();
            },
            inserted: function () {
                this.parseLayout();
            },
            removed: function () {

            },
            attributeChanged: function () {

            }
        },
        events: {
            'click:delegate(ro-item)': function () {
                var action = this.getAttribute('action');
                if (action) {
                    new Function(action)();
                }

            }
        },
        methods: {
            show: function () {
                this.xtag.isVisible = true;
                this.setAttribute('state', 'showItems');
            },
            hide: function () {
                this.xtag.isVisible = false;
                this.setAttribute('state', 'hideItems');
            },
            toggle: function () {
                if (this.xtag.isVisible) {
                    this.hide();
                } else {
                    this.show();
                }
            },
            parseLayout: function () {

                var items = this.querySelectorAll('ro-item');
                var itemsLength = items.length;
                var magicNumber = itemsLength / 0.2;
                var widthItem = parseInt((this.clientWidth - magicNumber) / itemsLength) + 'px';

                for (var i = 0; i < itemsLength; i++) {

                    var item = items[i];
                    item.style.width = widthItem;

                    item.setAttribute('text', Ro.templateEngine(item.getAttribute('i18nKey')));

                }

            }
        }


    });
}());

(function (){

  xtag.register ('ro-input', {
    lifecycle: {
      created: function () {             
        if (!this.innerHTML.trim()) {

          this.xtag.field = document.createElement('input');
          this.xtag.field.type = this.getAttribute('type');
          this.xtag.field.value = this.getAttribute('value');
          this.xtag.field.setAttribute('i18n', this.getAttribute('i18n'));
          this.xtag.field.setAttribute('i18nKey', this.getAttribute('i18nKey'));
          this.xtag.field.placeholder = this.getAttribute('placeholder');
          this.xtag.field.name = this.getAttribute('name');

          this.xtag.icon = document.createElement('ro-icon');
          this.xtag.icon.setAttribute ('iconName', this.getAttribute('icon'));

          this.appendChild (this.xtag.icon);
          this.appendChild (this.xtag.field);

          this.removeAttribute('i18n');
          
        }
      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
    },
    accessors: {     
    },
    methods: {
    }
  });

})();
(function (){

  xtag.register ('ro-layout', {
    lifecycle: {
      created: function () {
        this.template = this.innerHTML;
      },
      inserted: function () {        
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {   
    },
    methods: {
      setData: function (data) {
        this.xtag.data = data;
        this.parseLayout ();
      },
      parseLayout: function () {

        var data = this.xtag.data;

        this.innerHTML = Ro.templateEngine (this.template, data);

      }      
    }
  });

})();
(function (){

  xtag.register ('ro-list', {
    lifecycle: {
      created: function () {
        this.xtag.item = this.querySelector ('ro-item');
        this.xtag.itemTemplate = this.querySelector ('ro-item').innerHTML;

        this.buttons = {};

        //Add default buttons
        this.addButton ({
          name: 'delete',
          action: function () {
            var button = document.createElement ('ro-button');
            button.innerHTML = 'DELETE';
            return button;
          }
        });

        this.addButton ({
          name: 'share',
          action: function () {
            var button = document.createElement ('ro-button');
            button.innerHTML = 'SHARE';
            return button;
          }
        });

        this.xtag.callbacks = {
          didSelectedItem: function (e) {},
          didUnSelectedItem: function (e) {},
          didSwipeItem: function (e) {}
        }

      },
      inserted: function () {

        this.activeButtons = this.getButtonsInfo ();

        var nextElement = this.parentElement.nextElementSibling;

        if (nextElement && nextElement.tagName === "RO-FOOTER") {

          this.style.cssText = Ro.styleGenerator ({
              'height': '-webkit-calc(100% - 100px)',
              'height': '-moz-calc(100% - 100px)',
              'height': 'calc(100% - 100px)'
          });
        }

      },
      removed: function () {
      }
    },
    methods: {
      setData: function (data) {
        this.xtag.data = data;
        this.parseList ();
      },
      getData: function () {
        return this.xtag.data;
      },
      setAction: function (action) {
        this.action = action;
      },
      parseList: function () {

        var data = this.xtag.data;

        this.innerHTML = '';

        this.xtag.itemAction = this.action || this.xtag.item.getAttribute ('action');

        for (var i = 0; i < data.length; i++) {

          var roItem = document.createElement ('ro-item');
          var roContent = document.createElement ('ro-item-content');
          var action = new Function (Ro.templateEngine (this.xtag.itemAction, data[i]));

          roItem.setAttribute ('itemIndex', i);

          roContent.addEventListener ('click', action);
          roContent.innerHTML = Ro.templateEngine (this.xtag.itemTemplate, data[i]);

          if (this.getAttribute ('swipeable')) {
            roItem.appendChild (this.renderSwipeMenu ());
            this.addSwipeMenuActions (roItem, this);
          }

          for (var j = 0; j < this.activeButtons.length; j++) {
            roItem.appendChild (this.activeButtons[j]());
          };

          if (this.getAttribute ('selectable')) {
            roItem.appendChild (this.renderSelectableButton (data[i]));
          }

          roItem.appendChild (roContent);

          this.appendChild (roItem);

        };

      },

      getButtonsInfo: function () {

        var attribute = this.getAttribute ('actionButtons');
        var buttons = false;

        if (attribute) {
          var buttons = attribute.split(',').map(function (item){
             return this.buttons [item.trim()];
          }.bind (this));
        }

        return buttons;

      },

      addButton: function (button) {
        this.buttons[button.name] = button.action;
      },

      renderSelectableButton: function (data) {

        var cbox = document.createElement ('ro-checkbox');
        cbox.appendChild (this.renderes.selectableButton (data));
        cbox.addEventListener ('click', function (e) {
          if (cbox.querySelector ('input[type="checkbox"]').checked) {
            e.target.parentElement.parentElement.setAttribute ('checked', true);
            this.xtag.callbacks.didSelectedItem (e);
          } else {
            e.target.parentElement.parentElement.removeAttribute ('checked');
            this.xtag.callbacks.didUnSelectedItem (e);
          }
        }.bind (this));

        return cbox;
      },

      selectedItems: function () {
        return this.querySelectorAll('ro-item[checked="true"]');
      },

      renderes: {
        selectableButton: function (data) {
          return document.createTextNode ('');
        }
      },

      setCallback: function (callback) {
        this.xtag.callbacks[callback.name] = callback.action;
      },

      setRenderer: function (renderer) {
        this.renderes[renderer.name] = renderer.action;
      },

      renderSwipeMenu: function () {

          var roItemSwipemenu = document.createElement ('ro-item-swipemenu');
          roItemSwipemenu.setAttribute ('swipeMenuLabel', Ro.templateEngine(this.getAttribute ('i18nKey')));

          return roItemSwipemenu;
      },

      addSwipeMenuActions: function (item, scope) {

        var items = this.querySelectorAll('ro-item ro-item-swipemenu');
        var hammertime = new Hammer(item);

        hammertime.on ('panright', function(e) {

          var menu = item.firstElementChild;

          if (menu && e.deltaX > (window.innerWidth / 2)) {

            menu.className = 'goMenu';

          } else if (menu && e.deltaX > 50) {

            menu.className = '';
            menu.style.webkitTransform = 'translateX(' + e.deltaX + 'px)';
            menu.style.transform = 'translateX(' + e.deltaX + 'px)';
          }

        });

        hammertime.on ('panend', function (e) {

          var menu = item.firstElementChild;

          if (e.deltaX < (window.innerWidth / 2) && menu) {
            menu.className = 'backMenu';
          } else {
            scope.xtag.callbacks.didSwipeItem (item);

            setTimeout ((function (item) {
              item.firstElementChild.className = 'backMenu';
            }(item)), 1000);
          }

        });

      }

    }
  });

})();
(function (){

  xtag.register ('ro-loader', {
    lifecycle: {
      created: function () {
      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {     
    },
    methods: { 
      show: function () {

        this.style.cssText = Ro.styleGenerator ({
          'display': 'block',
          'width': '100vw',
          'height': '100vh'
        });

      },
      hide: function () {

        this.style.cssText = Ro.styleGenerator ({
          'display': 'none',
          'width': '0',
          'height': '0'
        });
        
      } 
    }
  });

})();
(function (){

  xtag.register ('ro-map', {
    lifecycle: {
      created: function () {
          Ro.Session.Map = Ro.Session.Map = {};
      },
      inserted: function () {

        if (!this.querySelector ('ro-map-canvas')) {

          this.map = document.createElement ('ro-map-canvas');
          this.appendChild (this.map);

          this.parseLayers ();

          if (this.getAttribute ('layerGroup')) {
            this.createLayerGroup ();
          }

          var initialLatitude = this.getAttribute ('latitude') || "0";
          var initialLongitude = this.getAttribute ('longitude') || "0";
          var initialZoom = this.getAttribute ('zoom') || "1";
          var maxZoom = this.getAttribute ('maxZoom') || "22";
          var minZoom = this.getAttribute ('minZoom') || "1";
          var center = ol.proj.transform ([parseFloat(initialLongitude), parseFloat(initialLatitude)], 'EPSG:4326', 'EPSG:3857')

          this.olMap = new ol.Map({
            layers: this.olLayers,
            target: this.map,
            renderer: 'canvas',
            view: new ol.View({
              center: center,
              zoom: parseInt(initialZoom),
              maxZoom: parseInt(maxZoom),
              minZoom: parseInt(minZoom)
            })
          });
        }

      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {
    },
    methods: {

      parseLayers: function () {

        this.olLayers = [];
        this.roLayers = this.querySelectorAll ('ro-layer');

        for (var i = 0; i < this.roLayers.length; i++) {
          this.olLayers.push (this.layerBuilder (this.roLayers[i]));
        };

      },

      layerBuilder: function (layer) {

        var type       = layer.getAttribute ('source') || 'OSM';
        var imagerySet = layer.getAttribute ('imagerySet') || '';
        var visible    = (layer.getAttribute ('visible')) ? true : false;

        switch (type) {
          case 'OSM':
            return new ol.layer.Tile({
                  source: new ol.source.OSM(),
                  visible: visible
                });
            break;
          case 'Bing':
            return new ol.layer.Tile({
                  source: new ol.source.BingMaps({
                    key: 'Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3',
                    imagerySet: imagerySet,
                    visible: visible
                  })
                });
            break;
          case 'Google':
            return new ol.layer.Tile({
                  source: new ol.source.OSM({
                        url: this.googleURLSwich (imagerySet)
                    })
                });
            break;
          default:
            return new ol.layer.Tile({
                  source: new ol.source.OSM(),
                  visible: visible
                });
        }
      },

      googleURLSwich: function (imagerySet) {
        switch (imagerySet) {
          case 'streets':
            return 'http://mt1.google.com/vt/lyrs=m@146&hl=en&x={x}&y={y}&z={z}';
          case 'traffic':
            return 'http://mt1.googleapis.com/vt?lyrs=m@226070730,traffic&src=apiv3&hl=en-US&x={x}&y={y}&z={z}&apistyle=s.t:49|s.e:g|p.h:#ff0022|p.s:60|p.l:-20,s.t:50|p.h:#2200ff|p.l:-40|p.v:simplified|p.s:30,s.t:51|p.h:#f6ff00|p.s:50|p.g:0.7|p.v:simplified,s.t:6|s.e:g|p.s:40|p.l:40,s.t:49|s.e:l|p.v:on|p.s:98,s.t:19|s.e:l|p.h:#0022ff|p.s:50|p.l:-10|p.g:0.9,s.t:65|s.e:g|p.h:#ff0000|p.v:on|p.l:-70&style=59,37|smartmaps';
          case 'bicycling':
            return 'http://mt1.google.com/vt/lyrs=m@121,bike&hl=en&x={x}&y={y}&z={z}';
          case 'transit':
            return 'http://mt1.google.com/vt/lyrs=m@121,transit|vm:1&hl=en&opts=r&x={x}&y={y}&z={z}';
          case 'aerialLand':
            return 'https://khms0.googleapis.com/kh?v=142&hl=en-US&x={x}&y={y}&z={z}';
          case 'aerielStreets':
            return 'https://mts1.google.com/vt/lyrs=h@245180971&hl=pt-BR&src=app&x={x}&y={y}&z={z}&s=Galileo';
          default:
            return 'http://mt1.google.com/vt/lyrs=m@146&hl=en&x={x}&y={y}&z={z}';
        }
      },

      showLayer: function (index) {

        for (var i = 0; i < this.olLayers.length; i++) {
          this.olLayers[i].setVisible (false);
        };

        this.olLayers[index].setVisible (true);
      },

      createLayerGroup: function () {

        this.layerGroup = document.createElement ('ro-map-layer-group');
        this.layerGroup.setAttribute ('visible', 'false');

        for (var i = 0; i < this.olLayers.length; i++) {
          var layerItem = document.createElement ('ro-item');
          layerItem.innerHTML = this.roLayers[i].getAttribute ('label');
          layerItem.addEventListener ('click', this.showLayer.bind (this, i));
          this.layerGroup.appendChild (layerItem);
        };

        this.layerGroup.addEventListener ('click', this.toggleLayerGroup.bind (this));

        this.appendChild (this.layerGroup);

      },

      toggleLayerGroup: function () {

        if (this.layerGroup.getAttribute ('visible') === 'true') {
          this.hideLayerGroup ();
        } else {
          this.showLayerGroup ();
        }

      },

      showLayerGroup: function () {
        this.layerGroup.setAttribute ('visible', true);
      },

      hideLayerGroup: function () {
        this.layerGroup.setAttribute ('visible', false);
      },

      setCenter: function (position) {

        var view = this.olMap.getView ();
        var latlng = ol.proj.transform (
          [position.longitude, position.latitude], 'EPSG:4326', 'EPSG:3857'
        );
        view.setCenter (latlng);

      },

      setZoom: function (zoom) {

        var view = this.olMap.getView ();
        view.setZoom (zoom);

      },

      addMarker: function (position, markerContent) {

        if (position.longitude && position.latitude) {

          var markerEl = document.createElement('div');
          var ll = ol.proj.transform(
                      [position.longitude, position.latitude],
                      'EPSG:4326',
                      'EPSG:3857'
                    );

          markerEl.className = 'roMarker';

          if (markerContent) {
            markerEl.appendChild (markerContent);
          }

          var marker = new ol.Overlay({
              element: markerEl,
              positioning: 'buttom-left',
              stopEvent: false
          });

          marker.setPosition(ll);

          this.olMap.addOverlay(marker);

        } else {
          console.log ('latitude and longitude are mandatory');
        }

      },

      addMarkers: function () {

      },

      markerFocus: function (position) {

          var focusEl = document.createElement ('div');
          var ll = ol.proj.transform(
              [position.longitude, position.latitude],
              'EPSG:4326',
              'EPSG:3857'
          );
          var marker = new ol.Overlay({
              element: focusEl,
              positioning: 'buttom-left',
              stopEvent: false
          });
          var callbackToTimeout = (function (scope, marker) {
              return function () {
                  scope.olMap.removeOverlay (marker);
              };
          }(this, marker));

          if (Ro.Session.Map.timeOutMarkerFocus) {
              this.olMap.removeOverlay(Ro.Session.Map.previousMarkerFocused);
              clearTimeout(Ro.Session.Map.timeOutMarkerFocus);
              Ro.Session.Map.timeOutMarkerFocus = null;
              Ro.Session.Map.previousMarkerFocused = null;
          }

          focusEl.className = 'focusMaker';
          marker.setPosition(ll);
          this.olMap.addOverlay(marker);
          Ro.Session.Map.previousMarkerFocused= marker;
          Ro.Session.Map.timeOutMarkerFocus = setTimeout (callbackToTimeout, 1000);

      },

      /* Get map features and focuses them */

      fitToBound: function () {

        var o = this.olMap.getOverlays();
        var v = this.olMap.getView();
        var a = o.getArray();
        var p = [];

        for (var i = 0, l = a.length; i < l; i++) {
            if (a[i].getPosition() && !a[i].currentPosition) {
                p.push(a[i].getPosition())
            }
        }

        if (p.length) {
          var l = p[0][1],
              r = p[0][1],
              t = p[0][0],
              b = p[0][0];

          for (var i = 0, pl = p.length; i < pl; i++) {

              if (l < p[i][1]) {
                  l = p[i][1];
              }
              if (r > p[i][1]) {
                  r = p[i][1];
              }
              if (t < p[i][0]) {
                  t = p[i][0]
              }
              if (b > p[i][0]) {
                  b = p[i][0];
              }
          }

          featureMultiLine = new ol.Feature();

          var ml = new ol.geom.LineString([
              [b, l],
              [t, l],
              [t, r],
              [b, r]
          ]);

          v.fitExtent(ml.getExtent(), this.olMap.getSize());
        }

      },

      clear: function () {

        var overlays = this.olMap.getOverlays().getArray();
        var map = this.olMap;

        for (var l = overlays.length; l > 0; l--) {

            if (overlays[l-1] && !overlays[l-1].currentPosition) {
                map.removeOverlay (overlays[l-1]);
            }
        }

      }
    }
  });

})();
(function (){

  xtag.register ('ro-stage', {
    lifecycle: {
      created: function () {
        
      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {     
    },
    methods: { 
      showLoader: function () {
        this.setAttribute('loading', true);
      },
      hideLoader: function () {
        this.setAttribute('loading', false);
      }    
    }
  });

})();

(function (){

  xtag.register ('ro-tabs', {
    lifecycle: {
      created: function () {
        
        var tabsLabels = this.querySelector ('ro-tabs-labels');
        var tabs = this.querySelectorAll ('ro-tab');

        if (!tabsLabels) {

          this.tabsLabelGroup = document.createElement ('ro-tabs-labels');

          for (var i = 0; i < tabs.length; i++) {

            var tabLabel = document.createElement ('ro-tab-label');
            tabLabel.innerHTML = tabs[i].getAttribute ('label');

            tabLabel.setAttribute ('tabIndex', i);
            tabs[i].setAttribute ('tabIndex', i);

            if (tabs[i].getAttribute ('selected')) {
              tabs[i].style.display = 'block';              
              tabLabel.setAttribute ('selected', true);
            } else {
              tabs[i].style.display = 'none';
            }

            this.tabsLabelGroup.appendChild (tabLabel);
          };

          this.insertBefore (this.tabsLabelGroup, tabs[0]);
        }

      },
      inserted: function () {

        var tabLabels = this.querySelectorAll ('ro-tabs-labels ro-tab-label');
        var tabs = this.querySelectorAll ('ro-tab');

        for (var i = 0; i < tabLabels.length; i++) {
          
            tabLabels[i].addEventListener ('click', (function (scope, label, tab){
              return function () {

                scope.setActive (label, tab);

              };
            }(this, tabLabels[i], tabs[i])));

        };
      },
      removed: function () {
      }
    },
    events: {
      reveal: function () {
      }
    },
    accessors: {     
    },
    methods: { 
      setActive: function (tabLabel, tab) {

        this.hideOtherTabs ();

        tabLabel.setAttribute ('selected', true);

        tab.style.display = 'block';

      },
      hideOtherTabs: function () {

        var tabsLabels = this.querySelectorAll ('ro-tab-label');
        var tabs = this.querySelectorAll ('ro-tab');

        for (var i = 0; i < tabsLabels.length; i++) {
            tabsLabels[i].removeAttribute ('selected');
            tabs[i].style.display = 'none';
        };

      }    
    }
  });

})();
(function (){

  xtag.register ('ro-title', {
    lifecycle: {
      created: function () {        
      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
    },
    accessors: {     
    },
    methods: {       
    }
  });

})();
(function (){

  xtag.register ('ro-view', {
    lifecycle: {
      created: function () {        

        if (Ro.Environment.platform.isIOS && !this.className.match(/isIOS/)) {
          this.className += "isIOS ";
        }         

      },
      inserted: function () {
      },
      removed: function () {
      }
    },
    events: {
    },
    accessors: {     
    },
    methods: {
        show: function (fromId) {
            if (this.xtag.showFunction) {
                this.xtag.showFunction (fromId);
            }
        },
        setShowFunction: function (callback) {
            this.xtag.showFunction = callback;
        }
    }
  });

})();