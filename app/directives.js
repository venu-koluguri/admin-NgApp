﻿
(function () {
    'use strict';
    angular.module('myApp.directives', [])
        .factory('httpInterceptor', function () {
            return {};
        })
        .config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push('httpInterceptor');
        }])
        .directive('validNumber', function () {
            return {
                require: '?ngModel',
                link: function (scope, element, attrs, ngModelCtrl) {
                    if (!ngModelCtrl) {
                        return;
                    }

                    ngModelCtrl.$parsers.push(function (val) {
                        var clean = val.replace(/[^0-9]+/g, '');
                        if (val !== clean) {
                            ngModelCtrl.$setViewValue(clean);
                            ngModelCtrl.$render();
                        }
                        return clean;
                    });

                    element.bind('keypress', function (event) {
                        if (event.keyCode === 32) {
                            event.preventDefault();
                        }
                    });
                }
            };
        })
        .directive('ccScrollToTop', ['$window',

            function ($window) {
                var directive = {
                    link: link,
                    template: '<a href="#"><i class="fa fa-chevron-up"></i></a>',
                    restrict: 'A'
                };
                return directive;

                function link(scope, element, attrs) {
                    var $win = $($window);
                    element.addClass('totop');
                    $win.scroll(toggleIcon);

                    element.find('a').click(function (e) {
                        e.preventDefault();

                        $('body').animate({ scrollTop: 0 }, 500);
                    });

                    function toggleIcon() {
                        $win.scrollTop() > 300 ? element.slideDown() : element.slideUp();
                    }
                }
            }
        ])
        .directive('wcOverlay', ['$q', '$timeout', '$window', 'httpInterceptor', function ($q, $timeout, $window, httpInterceptor) {
            return {
                restrict: 'EA',
                transclude: true,
                scope: {
                    wcOverlayDelay: "@"
                },
                template: '<div id="overlay-container" class="overlayContainer">' +
                                '<div id="overlay-background" class="overlayBackground"></div>' +
                                '<div id="overlay-content" class="overlayContent" data-ng-transclude>' +
                                '</div>' +
                            '</div>',
                link: function (scope, element, attrs) {
                    var overlayContainer = null,
                        timerPromise = null,
                        timerPromiseHide = null,
                        queue = [];

                    init();

                    function init() {
                        wireUpHttpInterceptor();
                        if (window.jQuery) wirejQueryInterceptor();
                        overlayContainer = element[0].firstChild; //Get to template
                    }

                    //Hook into httpInterceptor factory request/response/responseError functions                
                    function wireUpHttpInterceptor() {

                        httpInterceptor.request = function (config) {
                            processRequest();
                            return config || $q.when(config);
                        };

                        httpInterceptor.response = function (response) {
                            processResponse();
                            return response || $q.when(response);
                        };

                        httpInterceptor.responseError = function (rejection) {
                            processResponse();
                            return $q.reject(rejection);
                        };
                    }

                    //Monitor jQuery Ajax calls in case it's used in an app
                    function wirejQueryInterceptor() {
                        $(document).ajaxStart(function () {
                            processRequest();
                        });

                        $(document).ajaxComplete(function () {
                            processResponse();
                        });

                        $(document).ajaxError(function () {
                            processResponse();
                        });
                    }

                    function processRequest() {
                        queue.push({});
                        if (queue.length == 1) {
                            timerPromise = $timeout(function () {
                                if (queue.length) showOverlay();
                            }, scope.wcOverlayDelay ? scope.wcOverlayDelay : 500); //Delay showing for 500 millis to avoid flicker
                        }
                    }

                    function processResponse() {
                        queue.pop();
                        if (queue.length == 0) {
                            //Since we don't know if another XHR request will be made, pause before
                            //hiding the overlay. If another XHR request comes in then the overlay
                            //will stay visible which prevents a flicker
                            timerPromiseHide = $timeout(function () {
                                //Make sure queue is still 0 since a new XHR request may have come in
                                //while timer was running
                                if (queue.length == 0) {
                                    hideOverlay();
                                    if (timerPromiseHide) $timeout.cancel(timerPromiseHide);
                                }
                            }, scope.wcOverlayDelay ? scope.wcOverlayDelay : 500);
                        }
                    }

                    function showOverlay() {
                        var w = 0;
                        var h = 0;
                        if (!$window.innerWidth) {
                            if (!(document.documentElement.clientWidth == 0)) {
                                w = document.documentElement.clientWidth;
                                h = document.documentElement.clientHeight;
                            }
                            else {
                                w = document.body.clientWidth;
                                h = document.body.clientHeight;
                            }
                        }
                        else {
                            w = $window.innerWidth;
                            h = $window.innerHeight;
                        }
                        var content = document.getElementById('overlay-content');
                        var contentWidth = parseInt(getComputedStyle(content, 'width').replace('px', ''));
                        var contentHeight = parseInt(getComputedStyle(content, 'height').replace('px', ''));

                        content.style.top = h / 2 - contentHeight / 2 + 'px';
                        content.style.left = w / 2 - contentWidth / 2 + 'px';

                        overlayContainer.style.display = 'block';
                    }

                    function hideOverlay() {
                        if (timerPromise) $timeout.cancel(timerPromise);
                        overlayContainer.style.display = 'none';
                    }

                    var getComputedStyle = function () {
                        var func = null;
                        if (document.defaultView && document.defaultView.getComputedStyle) {
                            func = document.defaultView.getComputedStyle;
                        } else if (typeof (document.body.currentStyle) !== "undefined") {
                            func = function (element, anything) {
                                return element["currentStyle"];
                            };
                        }

                        return function (element, style) {
                            return func(element, null)[style];
                        };
                    }();
                }
            };
        }])
        .directive('checklistModel', ['$parse', '$compile', function($parse, $compile) {
              // contains
              function contains(arr, item) {
                if (angular.isArray(arr)) {
                  for (var i = 0; i < arr.length; i++) {
                    if (angular.equals(arr[i], item)) {
                      return true;
                    }
                  }
                }
                return false;
              }

              // add
              function add(arr, item) {
                arr = angular.isArray(arr) ? arr : [];
                for (var i = 0; i < arr.length; i++) {
                  if (angular.equals(arr[i], item)) {
                    return arr;
                  }
                }    
                arr.push(item);
                return arr;
              }  

              // remove
              function remove(arr, item) {
                if (angular.isArray(arr)) {
                  for (var i = 0; i < arr.length; i++) {
                    if (angular.equals(arr[i], item)) {
                      arr.splice(i, 1);
                      break;
                    }
                  }
                }
                return arr;
              }

              // http://stackoverflow.com/a/19228302/1458162
              function postLinkFn(scope, elem, attrs) {
                // compile with `ng-model` pointing to `checked`
                $compile(elem)(scope);

                // getter / setter for original model
                var getter = $parse(attrs.checklistModel);
                var setter = getter.assign;

                // value added to list
                var value = $parse(attrs.checklistValue)(scope.$parent);

                // watch UI checked change
                scope.$watch('checked', function(newValue, oldValue) {
                  if (newValue === oldValue) { 
                    return;
                  } 
                  var current = getter(scope.$parent);
                  if (newValue === true) {
                    setter(scope.$parent, add(current, value));
                  } else {
                    setter(scope.$parent, remove(current, value));
                  }
                });

                // watch original model change
                scope.$parent.$watch(attrs.checklistModel, function(newArr, oldArr) {
                  scope.checked = contains(newArr, value);
                }, true);
              }

              return {
                restrict: 'A',
                priority: 1000,
                terminal: true,
                scope: true,
                compile: function(tElement, tAttrs) {
                  if (tElement[0].tagName !== 'INPUT' || !tElement.attr('type', 'checkbox')) {
                    throw 'checklist-model should be applied to `input[type="checkbox"]`.';
                  }

                  if (!tAttrs.checklistValue) {
                    throw 'You should provide `checklist-value`.';
                  }

                  // exclude recursion
                  tElement.removeAttr('checklist-model');
                  
                  // local scope var storing individual checkbox model
                  tElement.attr('ng-model', 'checked');

                  return postLinkFn;
                }
              };
        }]);
})();