(function() {
  var Bacon, Bus, Dispatcher, End, Error, Event, EventStream, Initial, Next, None, Observable, Property, PropertyDispatcher, Some, addPropertyInitValueToStream, assert, assertArray, assertEvent, assertFunction, assertNoArguments, assertString, cloneArray, end, former, indexOf, initial, isFieldKey, isFunction, latter, liftCallback, makeFunction, makeSpawner, methodCall, next, nop, partiallyApplied, sendWrapped, toCombinator, toEvent, toFieldExtractor, toFieldKey, toOption, toSimpleExtractor, _, _ref, _ref1, _ref2,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  if (typeof module !== "undefined" && module !== null) {
    module.exports = Bacon = {};
    Bacon.Bacon = Bacon;
  } else {
    if (typeof require === 'function' && (require.amd != null)) {
      define('bacon', [], function() {
        return Bacon;
      });
    }
    this.Bacon = Bacon = {};
  }

  Bacon.fromBinder = function(binder, eventTransformer) {
    if (eventTransformer == null) {
      eventTransformer = _.id;
    }
    return new EventStream(function(sink) {
      var unbinder;

      return unbinder = binder(function() {
        var args, event, reply, value, _i, _len, _results;

        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        value = eventTransformer.apply(null, args);
        if (!(value instanceof Array && _.last(value) instanceof Event)) {
          value = [value];
        }
        _results = [];
        for (_i = 0, _len = value.length; _i < _len; _i++) {
          event = value[_i];
          reply = sink(event = toEvent(event));
          if (reply === Bacon.noMore || event.isEnd()) {
            if (unbinder != null) {
              _results.push(unbinder());
            } else {
              _results.push(Bacon.scheduler.setTimeout((function() {
                return unbinder();
              }), 0));
            }
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      });
    });
  };

  Bacon.$ = {
    asEventStream: function(eventName, selector, eventTransformer) {
      var _ref,
        _this = this;

      if (isFunction(selector)) {
        _ref = [selector, null], eventTransformer = _ref[0], selector = _ref[1];
      }
      return Bacon.fromBinder(function(handler) {
        _this.on(eventName, selector, handler);
        return function() {
          return _this.off(eventName, selector, handler);
        };
      }, eventTransformer);
    }
  };

  if ((_ref = typeof jQuery !== "undefined" && jQuery !== null ? jQuery : typeof Zepto !== "undefined" && Zepto !== null ? Zepto : null) != null) {
    _ref.fn.asEventStream = Bacon.$.asEventStream;
  }

  Bacon.fromEventTarget = function(target, eventName, eventTransformer) {
    var sub, unsub, _ref1, _ref2, _ref3, _ref4;

    sub = (_ref1 = target.addEventListener) != null ? _ref1 : (_ref2 = target.addListener) != null ? _ref2 : target.bind;
    unsub = (_ref3 = target.removeEventListener) != null ? _ref3 : (_ref4 = target.removeListener) != null ? _ref4 : target.unbind;
    return Bacon.fromBinder(function(handler) {
      sub.call(target, eventName, handler);
      return function() {
        return unsub.call(target, eventName, handler);
      };
    }, eventTransformer);
  };

  Bacon.fromPromise = function(promise) {
    return Bacon.fromBinder(function(handler) {
      promise.then(handler, function(e) {
        return handler(new Error(e));
      });
      return function() {
        return typeof promise.abort === "function" ? promise.abort() : void 0;
      };
    }, function(value) {
      return [value, end()];
    });
  };

  Bacon.noMore = ["<no-more>"];

  Bacon.more = ["<more>"];

  Bacon.later = function(delay, value) {
    return Bacon.sequentially(delay, [value]);
  };

  Bacon.sequentially = function(delay, values) {
    var index;

    index = 0;
    return Bacon.fromPoll(delay, function() {
      var value;

      value = values[index++];
      if (index < values.length) {
        return value;
      } else {
        return [value, end()];
      }
    });
  };

  Bacon.repeatedly = function(delay, values) {
    var index;

    index = 0;
    return Bacon.fromPoll(delay, function() {
      return values[index++ % values.length];
    });
  };

  liftCallback = function(wrapped) {
    return function() {
      var args, f, stream;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      stream = partiallyApplied(wrapped, [
        function(values, callback) {
          return f.apply(null, __slice.call(values).concat([callback]));
        }
      ]);
      return Bacon.combineAsArray(args).flatMap(stream);
    };
  };

  Bacon.fromCallback = liftCallback(function() {
    var args, f;

    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.fromBinder(function(handler) {
      makeFunction(f, args)(handler);
      return nop;
    }, function(value) {
      return [value, end()];
    });
  });

  Bacon.fromNodeCallback = liftCallback(function() {
    var args, f;

    f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.fromBinder(function(handler) {
      makeFunction(f, args)(handler);
      return nop;
    }, function(error, value) {
      if (error) {
        return [new Error(error), end()];
      }
      return [value, end()];
    });
  });

  Bacon.fromPoll = function(delay, poll) {
    return Bacon.fromBinder(function(handler) {
      var id;

      id = Bacon.scheduler.setInterval(handler, delay);
      return function() {
        return Bacon.scheduler.clearInterval(id);
      };
    }, poll);
  };

  Bacon.interval = function(delay, value) {
    if (value == null) {
      value = {};
    }
    return Bacon.fromPoll(delay, function() {
      return next(value);
    });
  };

  Bacon.constant = function(value) {
    return new Property(sendWrapped([value], initial), true);
  };

  Bacon.never = function() {
    return Bacon.fromArray([]);
  };

  Bacon.once = function(value) {
    return Bacon.fromArray([value]);
  };

  Bacon.fromArray = function(values) {
    return new EventStream(sendWrapped(values, toEvent));
  };

  sendWrapped = function(values, wrapper) {
    return function(sink) {
      var value, _i, _len;

      for (_i = 0, _len = values.length; _i < _len; _i++) {
        value = values[_i];
        sink(wrapper(value));
      }
      sink(end());
      return nop;
    };
  };

  Bacon.mergeAll = function(streams) {
    var next, stream, _i, _len, _ref1;

    assertArray(streams);
    stream = _.head(streams);
    _ref1 = _.tail(streams);
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      next = _ref1[_i];
      stream = stream.merge(next);
    }
    return stream;
  };

  Bacon.zipAsArray = function() {
    var more, streams;

    streams = arguments[0], more = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!(streams instanceof Array)) {
      streams = [streams].concat(more);
    }
    return Bacon.zipWith(streams, Array);
  };

  Bacon.zipWith = function(streams, f) {
    return new EventStream(function(sink) {
      var bufs, handle, j, s, unsubAll, unsubs, unsubscribed, zipSink, _i, _len;

      bufs = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = streams.length; _i < _len; _i++) {
          s = streams[_i];
          _results.push([]);
        }
        return _results;
      })();
      unsubscribed = false;
      unsubs = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = streams.length; _i < _len; _i++) {
          s = streams[_i];
          _results.push(nop);
        }
        return _results;
      })();
      unsubAll = (function() {
        var _i, _len;

        for (_i = 0, _len = unsubs.length; _i < _len; _i++) {
          f = unsubs[_i];
          f();
        }
        return unsubscribed = true;
      });
      zipSink = function(e) {
        var reply;

        reply = sink(e);
        if (reply === Bacon.noMore || e.isEnd()) {
          unsubAll();
        }
        return reply;
      };
      handle = function(i) {
        return function(e) {
          var b, reply, vs;

          if (e.isError()) {
            return zipSink(e);
          } else if (e.isInitial()) {
            return Bacon.more;
          } else {
            bufs[i].push(e);
            if (!e.isEnd() && _.all((function() {
              var _i, _len, _results;

              _results = [];
              for (_i = 0, _len = bufs.length; _i < _len; _i++) {
                b = bufs[_i];
                _results.push(b.length);
              }
              return _results;
            })())) {
              vs = (function() {
                var _i, _len, _results;

                _results = [];
                for (_i = 0, _len = bufs.length; _i < _len; _i++) {
                  b = bufs[_i];
                  _results.push(b.shift().value());
                }
                return _results;
              })();
              reply = zipSink(e.apply(_.always(f.apply(null, vs))));
            }
            if (_.any((function() {
              var _i, _len, _results;

              _results = [];
              for (_i = 0, _len = bufs.length; _i < _len; _i++) {
                b = bufs[_i];
                _results.push(b.length && b[0].isEnd());
              }
              return _results;
            })())) {
              reply = zipSink(end());
            }
            return reply || Bacon.more;
          }
        };
      };
      for (j = _i = 0, _len = streams.length; _i < _len; j = ++_i) {
        s = streams[j];
        unsubs[j] = (function(i) {
          if (!unsubscribed) {
            return s.subscribe(handle(i));
          }
        })(j);
      }
      return unsubAll;
    });
  };

  Bacon.combineAsArray = function() {
    var more, s, streams, values,
      _this = this;

    streams = arguments[0], more = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (!(streams instanceof Array)) {
      streams = [streams].concat(more);
    }
    if (streams.length) {
      values = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = streams.length; _i < _len; _i++) {
          s = streams[_i];
          _results.push(None);
        }
        return _results;
      })();
      return new Property(function(sink) {
        var checkEnd, combiningSink, ends, index, initialSent, sinkFor, stream, unsubAll, unsubs, unsubscribed, _i, _len;

        unsubscribed = false;
        unsubs = (function() {
          var _i, _len, _results;

          _results = [];
          for (_i = 0, _len = streams.length; _i < _len; _i++) {
            s = streams[_i];
            _results.push(nop);
          }
          return _results;
        })();
        unsubAll = (function() {
          var f, _i, _len;

          for (_i = 0, _len = unsubs.length; _i < _len; _i++) {
            f = unsubs[_i];
            f();
          }
          return unsubscribed = true;
        });
        ends = (function() {
          var _i, _len, _results;

          _results = [];
          for (_i = 0, _len = streams.length; _i < _len; _i++) {
            s = streams[_i];
            _results.push(false);
          }
          return _results;
        })();
        checkEnd = function() {
          var reply;

          if (_.all(ends)) {
            reply = sink(end());
            if (reply === Bacon.noMore) {
              unsubAll();
            }
            return reply;
          }
        };
        initialSent = false;
        combiningSink = function(markEnd, setValue) {
          return function(event) {
            var reply, valueArrayF;

            if (event.isEnd()) {
              markEnd();
              checkEnd();
              return Bacon.noMore;
            } else if (event.isError()) {
              reply = sink(event);
              if (reply === Bacon.noMore) {
                unsubAll();
              }
              return reply;
            } else {
              setValue(event.value);
              if (_.all(_.map((function(x) {
                return x.isDefined;
              }), values))) {
                if (initialSent && event.isInitial()) {
                  return Bacon.more;
                } else {
                  initialSent = true;
                  valueArrayF = function() {
                    var x, _i, _len, _results;

                    _results = [];
                    for (_i = 0, _len = values.length; _i < _len; _i++) {
                      x = values[_i];
                      _results.push(x.get()());
                    }
                    return _results;
                  };
                  reply = sink(event.apply(valueArrayF));
                  if (reply === Bacon.noMore) {
                    unsubAll();
                  }
                  return reply;
                }
              } else {
                return Bacon.more;
              }
            }
          };
        };
        sinkFor = function(index) {
          return combiningSink((function() {
            return ends[index] = true;
          }), (function(x) {
            return values[index] = new Some(x);
          }));
        };
        for (index = _i = 0, _len = streams.length; _i < _len; index = ++_i) {
          stream = streams[index];
          if (!(stream instanceof Observable)) {
            stream = Bacon.constant(stream);
          }
          if (!unsubscribed) {
            unsubs[index] = stream.subscribe(sinkFor(index));
          }
        }
        return unsubAll;
      });
    } else {
      return Bacon.constant([]);
    }
  };

  Bacon.onValues = function() {
    var f, streams, _i;

    streams = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), f = arguments[_i++];
    return Bacon.combineAsArray(streams).onValues(f);
  };

  Bacon.combineWith = function() {
    var f, streams;

    f = arguments[0], streams = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return Bacon.combineAsArray(streams).map(function(values) {
      return f.apply(null, values);
    });
  };

  Bacon.combineTemplate = function(template) {
    var applyStreamValue, combinator, compile, compileTemplate, constantValue, current, funcs, mkContext, setValue, streams;

    funcs = [];
    streams = [];
    current = function(ctxStack) {
      return ctxStack[ctxStack.length - 1];
    };
    setValue = function(ctxStack, key, value) {
      return current(ctxStack)[key] = value;
    };
    applyStreamValue = function(key, index) {
      return function(ctxStack, values) {
        return setValue(ctxStack, key, values[index]);
      };
    };
    constantValue = function(key, value) {
      return function(ctxStack, values) {
        return setValue(ctxStack, key, value);
      };
    };
    mkContext = function(template) {
      if (template instanceof Array) {
        return [];
      } else {
        return {};
      }
    };
    compile = function(key, value) {
      var popContext, pushContext;

      if (value instanceof Observable) {
        streams.push(value);
        return funcs.push(applyStreamValue(key, streams.length - 1));
      } else if (typeof value === "object") {
        pushContext = function(key) {
          return function(ctxStack, values) {
            var newContext;

            newContext = mkContext(value);
            setValue(ctxStack, key, newContext);
            return ctxStack.push(newContext);
          };
        };
        popContext = function(ctxStack, values) {
          return ctxStack.pop();
        };
        funcs.push(pushContext(key));
        compileTemplate(value);
        return funcs.push(popContext);
      } else {
        return funcs.push(constantValue(key, value));
      }
    };
    compileTemplate = function(template) {
      return _.each(template, compile);
    };
    compileTemplate(template);
    combinator = function(values) {
      var ctxStack, f, rootContext, _i, _len;

      rootContext = mkContext(template);
      ctxStack = [rootContext];
      for (_i = 0, _len = funcs.length; _i < _len; _i++) {
        f = funcs[_i];
        f(ctxStack, values);
      }
      return rootContext;
    };
    return Bacon.combineAsArray(streams).map(combinator);
  };

  Event = (function() {
    function Event() {}

    Event.prototype.isEvent = function() {
      return true;
    };

    Event.prototype.isEnd = function() {
      return false;
    };

    Event.prototype.isInitial = function() {
      return false;
    };

    Event.prototype.isNext = function() {
      return false;
    };

    Event.prototype.isError = function() {
      return false;
    };

    Event.prototype.hasValue = function() {
      return false;
    };

    Event.prototype.filter = function(f) {
      return true;
    };

    Event.prototype.onDone = function(listener) {
      return listener();
    };

    return Event;

  })();

  Next = (function(_super) {
    __extends(Next, _super);

    function Next(valueF, sourceEvent) {
      var _this = this;

      if (isFunction(valueF)) {
        this.value = function() {
          var v;

          v = valueF();
          _this.value = _.always(v);
          return v;
        };
      } else {
        this.value = _.always(valueF);
      }
    }

    Next.prototype.isNext = function() {
      return true;
    };

    Next.prototype.hasValue = function() {
      return true;
    };

    Next.prototype.fmap = function(f) {
      var _this = this;

      return this.apply(function() {
        return f(_this.value());
      });
    };

    Next.prototype.apply = function(value) {
      return new Next(value);
    };

    Next.prototype.filter = function(f) {
      return f(this.value());
    };

    Next.prototype.describe = function() {
      return this.value();
    };

    return Next;

  })(Event);

  Initial = (function(_super) {
    __extends(Initial, _super);

    function Initial() {
      _ref1 = Initial.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    Initial.prototype.isInitial = function() {
      return true;
    };

    Initial.prototype.isNext = function() {
      return false;
    };

    Initial.prototype.apply = function(value) {
      return new Initial(value);
    };

    Initial.prototype.toNext = function() {
      return new Next(this.value);
    };

    return Initial;

  })(Next);

  End = (function(_super) {
    __extends(End, _super);

    function End() {
      _ref2 = End.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    End.prototype.isEnd = function() {
      return true;
    };

    End.prototype.fmap = function() {
      return this;
    };

    End.prototype.apply = function() {
      return this;
    };

    End.prototype.describe = function() {
      return "<end>";
    };

    return End;

  })(Event);

  Error = (function(_super) {
    __extends(Error, _super);

    function Error(error) {
      this.error = error;
    }

    Error.prototype.isError = function() {
      return true;
    };

    Error.prototype.fmap = function() {
      return this;
    };

    Error.prototype.apply = function() {
      return this;
    };

    Error.prototype.describe = function() {
      return "<error> " + this.error;
    };

    return Error;

  })(Event);

  Observable = (function() {
    function Observable() {
      this.combine = __bind(this.combine, this);
      this.flatMapLatest = __bind(this.flatMapLatest, this);
      this.scan = __bind(this.scan, this);
      this.takeUntil = __bind(this.takeUntil, this);      this.assign = this.onValue;
    }

    Observable.prototype.onValue = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.subscribe(function(event) {
        if (event.hasValue()) {
          return f(event.value());
        }
      });
    };

    Observable.prototype.onValues = function(f) {
      return this.onValue(function(args) {
        return f.apply(null, args);
      });
    };

    Observable.prototype.onError = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.subscribe(function(event) {
        if (event.isError()) {
          return f(event.error);
        }
      });
    };

    Observable.prototype.onEnd = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.subscribe(function(event) {
        if (event.isEnd()) {
          return f();
        }
      });
    };

    Observable.prototype.errors = function() {
      return this.filter(function() {
        return false;
      });
    };

    Observable.prototype.filter = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (f instanceof Property) {
        return f.sampledBy(this, function(p, s) {
          return [p, s];
        }).filter(function(_arg) {
          var p, s;

          p = _arg[0], s = _arg[1];
          return p;
        }).map(function(_arg) {
          var p, s;

          p = _arg[0], s = _arg[1];
          return s;
        });
      } else {
        f = makeFunction(f, args);
        return this.withHandler(function(event) {
          if (event.filter(f)) {
            return this.push(event);
          } else {
            return Bacon.more;
          }
        });
      }
    };

    Observable.prototype.takeWhile = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.withHandler(function(event) {
        if (event.filter(f)) {
          return this.push(event);
        } else {
          this.push(end());
          return Bacon.noMore;
        }
      });
    };

    Observable.prototype.endOnError = function() {
      return this.withHandler(function(event) {
        if (event.isError()) {
          this.push(event);
          return this.push(end());
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.take = function(count) {
      if (count <= 0) {
        return Bacon.never();
      }
      return this.withHandler(function(event) {
        if (!event.hasValue()) {
          return this.push(event);
        } else {
          count--;
          if (count > 0) {
            return this.push(event);
          } else {
            this.push(event);
            this.push(end());
            return Bacon.noMore;
          }
        }
      });
    };

    Observable.prototype.map = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.withHandler(function(event) {
        return this.push(event.fmap(f));
      });
    };

    Observable.prototype.mapError = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.withHandler(function(event) {
        if (event.isError()) {
          return this.push(next(f(event.error)));
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.mapEnd = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.withHandler(function(event) {
        if (event.isEnd()) {
          this.push(next(f(event)));
          this.push(end());
          return Bacon.noMore;
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.doAction = function() {
      var args, f;

      f = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      f = makeFunction(f, args);
      return this.withHandler(function(event) {
        if (event.hasValue()) {
          f(event.value());
        }
        return this.push(event);
      });
    };

    Observable.prototype.takeUntil = function(stopper) {
      var src;

      src = this;
      return this.withSubscribe(function(sink) {
        var srcSink, stopperSink, unsubBoth, unsubSrc, unsubStopper, unsubscribed;

        unsubscribed = false;
        unsubSrc = nop;
        unsubStopper = nop;
        unsubBoth = function() {
          unsubSrc();
          unsubStopper();
          return unsubscribed = true;
        };
        srcSink = function(event) {
          if (event.isEnd()) {
            unsubStopper();
            sink(event);
            return Bacon.noMore;
          } else {
            event.onDone(function() {
              var reply;

              if (!unsubscribed) {
                reply = sink(event);
                if (reply === Bacon.noMore) {
                  return unsubBoth();
                }
              }
            });
            return Bacon.more;
          }
        };
        stopperSink = function(event) {
          if (event.isError()) {
            return Bacon.more;
          } else if (event.isEnd()) {
            return Bacon.noMore;
          } else {
            unsubSrc();
            sink(end());
            return Bacon.noMore;
          }
        };
        unsubSrc = src.subscribe(srcSink);
        if (!unsubscribed) {
          unsubStopper = stopper.subscribe(stopperSink);
        }
        return unsubBoth;
      });
    };

    Observable.prototype.skip = function(count) {
      return this.withHandler(function(event) {
        if (!event.hasValue()) {
          return this.push(event);
        } else if (count > 0) {
          count--;
          return Bacon.more;
        } else {
          return this.push(event);
        }
      });
    };

    Observable.prototype.skipDuplicates = function(isEqual) {
      if (isEqual == null) {
        isEqual = function(a, b) {
          return a === b;
        };
      }
      return this.withStateMachine(None, function(prev, event) {
        if (!event.hasValue()) {
          return [prev, [event]];
        } else if (prev === None || !isEqual(prev.get(), event.value())) {
          return [new Some(event.value()), [event]];
        } else {
          return [prev, []];
        }
      });
    };

    Observable.prototype.withStateMachine = function(initState, f) {
      var state;

      state = initState;
      return this.withHandler(function(event) {
        var fromF, newState, output, outputs, reply, _i, _len;

        fromF = f(state, event);
        newState = fromF[0], outputs = fromF[1];
        state = newState;
        reply = Bacon.more;
        for (_i = 0, _len = outputs.length; _i < _len; _i++) {
          output = outputs[_i];
          reply = this.push(output);
          if (reply === Bacon.noMore) {
            return reply;
          }
        }
        return reply;
      });
    };

    Observable.prototype.scan = function(seed, f) {
      var acc, subscribe,
        _this = this;

      f = toCombinator(f);
      acc = toOption(seed);
      subscribe = function(sink) {
        var initSent, reply, sendInit, unsub;

        initSent = false;
        unsub = nop;
        reply = Bacon.more;
        sendInit = function() {
          if (!initSent) {
            initSent = true;
            return acc.forEach(function(value) {
              reply = sink(initial(value));
              if (reply === Bacon.noMore) {
                unsub();
                return unsub = nop;
              }
            });
          }
        };
        unsub = _this.subscribe(function(event) {
          if (event.hasValue()) {
            if (initSent && event.isInitial()) {
              return Bacon.more;
            } else {
              initSent = true;
              acc = new Some(f(acc.getOrElse(void 0), event.value()));
              return sink(event.apply(_.always(acc.get())));
            }
          } else {
            if (event.isEnd()) {
              reply = sendInit();
            }
            if (reply !== Bacon.noMore) {
              return sink(event);
            }
          }
        });
        sendInit();
        return unsub;
      };
      return new Property(subscribe);
    };

    Observable.prototype.zip = function(other, f) {
      if (f == null) {
        f = Array;
      }
      return Bacon.zipWith([this, other], f);
    };

    Observable.prototype.diff = function(start, f) {
      f = toCombinator(f);
      return this.scan([start], function(prevTuple, next) {
        return [next, f(prevTuple[0], next)];
      }).filter(function(tuple) {
        return tuple.length === 2;
      }).map(function(tuple) {
        return tuple[1];
      });
    };

    Observable.prototype.flatMap = function(f) {
      var root;

      f = makeSpawner(f);
      root = this;
      return new EventStream(function(sink) {
        var checkEnd, children, rootEnd, spawner, unbind, unsubRoot;

        children = [];
        rootEnd = false;
        unsubRoot = function() {};
        unbind = function() {
          var unsubChild, _i, _len;

          unsubRoot();
          for (_i = 0, _len = children.length; _i < _len; _i++) {
            unsubChild = children[_i];
            unsubChild();
          }
          return children = [];
        };
        checkEnd = function() {
          if (rootEnd && (children.length === 0)) {
            return sink(end());
          }
        };
        spawner = function(event) {
          var child, childEnded, handler, removeChild, unsubChild;

          if (event.isEnd()) {
            rootEnd = true;
            return checkEnd();
          } else if (event.isError()) {
            return sink(event);
          } else {
            child = f(event.value());
            if (!(child instanceof Observable)) {
              child = Bacon.once(child);
            }
            unsubChild = void 0;
            childEnded = false;
            removeChild = function() {
              if (unsubChild != null) {
                _.remove(unsubChild, children);
              }
              return checkEnd();
            };
            handler = function(event) {
              var reply;

              if (event.isEnd()) {
                removeChild();
                childEnded = true;
                return Bacon.noMore;
              } else {
                if (event instanceof Initial) {
                  event = event.toNext();
                }
                reply = sink(event);
                if (reply === Bacon.noMore) {
                  unbind();
                }
                return reply;
              }
            };
            unsubChild = child.subscribe(handler);
            if (!childEnded) {
              return children.push(unsubChild);
            }
          }
        };
        unsubRoot = root.subscribe(spawner);
        return unbind;
      });
    };

    Observable.prototype.flatMapLatest = function(f) {
      var stream,
        _this = this;

      f = makeSpawner(f);
      stream = this.toEventStream();
      return stream.flatMap(function(value) {
        return f(value).takeUntil(stream);
      });
    };

    Observable.prototype.not = function() {
      return this.map(function(x) {
        return !x;
      });
    };

    Observable.prototype.log = function() {
      var args;

      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.subscribe(function(event) {
        return typeof console !== "undefined" && console !== null ? typeof console.log === "function" ? console.log.apply(console, __slice.call(args).concat([event.describe()])) : void 0 : void 0;
      });
      return this;
    };

    Observable.prototype.slidingWindow = function(n) {
      return this.scan([], function(window, value) {
        return window.concat([value]).slice(-n);
      });
    };

    Observable.prototype.combine = function(other, f) {
      var combinator;

      combinator = toCombinator(f);
      return Bacon.combineAsArray(this, other).map(function(values) {
        return combinator(values[0], values[1]);
      });
    };

    return Observable;

  })();

  EventStream = (function(_super) {
    __extends(EventStream, _super);

    function EventStream(subscribe) {
      var dispatcher;

      EventStream.__super__.constructor.call(this);
      assertFunction(subscribe);
      dispatcher = new Dispatcher(subscribe);
      this.subscribe = dispatcher.subscribe;
      this.hasSubscribers = dispatcher.hasSubscribers;
    }

    EventStream.prototype.map = function() {
      var args, p;

      p = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (p instanceof Property) {
        return p.sampledBy(this, former);
      } else {
        return EventStream.__super__.map.apply(this, [p].concat(__slice.call(args)));
      }
    };

    EventStream.prototype.delay = function(delay) {
      return this.flatMap(function(value) {
        return Bacon.later(delay, value);
      });
    };

    EventStream.prototype.debounce = function(delay) {
      return this.flatMapLatest(function(value) {
        return Bacon.later(delay, value);
      });
    };

    EventStream.prototype.throttle = function(delay) {
      return this.bufferWithTime(delay).map(function(values) {
        return values[values.length - 1];
      });
    };

    EventStream.prototype.bufferWithTime = function(delay) {
      var schedule,
        _this = this;

      schedule = function(buffer) {
        return buffer.schedule();
      };
      return this.buffer(delay, schedule, schedule);
    };

    EventStream.prototype.bufferWithCount = function(count) {
      var flushOnCount;

      flushOnCount = function(buffer) {
        if (buffer.values.length === count) {
          return buffer.flush();
        }
      };
      return this.buffer(0, flushOnCount);
    };

    EventStream.prototype.buffer = function(delay, onInput, onFlush) {
      var buffer, delayMs, reply;

      if (onInput == null) {
        onInput = (function() {});
      }
      if (onFlush == null) {
        onFlush = (function() {});
      }
      buffer = {
        scheduled: false,
        end: null,
        values: [],
        flush: function() {
          var reply;

          this.scheduled = false;
          if (this.values.length > 0) {
            reply = this.push(next(this.values));
            this.values = [];
            if (this.end != null) {
              return this.push(this.end);
            } else if (reply !== Bacon.noMore) {
              return onFlush(this);
            }
          } else {
            if (this.end != null) {
              return this.push(this.end);
            }
          }
        },
        schedule: function() {
          var _this = this;

          if (!this.scheduled) {
            this.scheduled = true;
            return delay(function() {
              return _this.flush();
            });
          }
        }
      };
      reply = Bacon.more;
      if (!isFunction(delay)) {
        delayMs = delay;
        delay = function(f) {
          return Bacon.scheduler.setTimeout(f, delayMs);
        };
      }
      return this.withHandler(function(event) {
        buffer.push = this.push;
        if (event.isError()) {
          reply = this.push(event);
        } else if (event.isEnd()) {
          buffer.end = event;
          if (!buffer.scheduled) {
            buffer.flush();
          }
        } else {
          buffer.values.push(event.value());
          onInput(buffer);
        }
        return reply;
      });
    };

    EventStream.prototype.merge = function(right) {
      var left;

      left = this;
      return new EventStream(function(sink) {
        var ends, smartSink, unsubBoth, unsubLeft, unsubRight, unsubscribed;

        unsubLeft = nop;
        unsubRight = nop;
        unsubscribed = false;
        unsubBoth = function() {
          unsubLeft();
          unsubRight();
          return unsubscribed = true;
        };
        ends = 0;
        smartSink = function(event) {
          var reply;

          if (event.isEnd()) {
            ends++;
            if (ends === 2) {
              return sink(end());
            } else {
              return Bacon.more;
            }
          } else {
            reply = sink(event);
            if (reply === Bacon.noMore) {
              unsubBoth();
            }
            return reply;
          }
        };
        unsubLeft = left.subscribe(smartSink);
        if (!unsubscribed) {
          unsubRight = right.subscribe(smartSink);
        }
        return unsubBoth;
      });
    };

    EventStream.prototype.toProperty = function(initValue) {
      if (arguments.length === 0) {
        initValue = None;
      }
      return this.scan(initValue, latter);
    };

    EventStream.prototype.toEventStream = function() {
      return this;
    };

    EventStream.prototype.concat = function(right) {
      var left;

      left = this;
      return new EventStream(function(sink) {
        var unsub;

        unsub = left.subscribe(function(e) {
          if (e.isEnd()) {
            return unsub = right.subscribe(sink);
          } else {
            return sink(e);
          }
        });
        return function() {
          return unsub();
        };
      });
    };

    EventStream.prototype.awaiting = function(other) {
      return this.map(true).merge(other.map(false)).toProperty(false);
    };

    EventStream.prototype.startWith = function(seed) {
      return Bacon.once(seed).concat(this);
    };

    EventStream.prototype.withHandler = function(handler) {
      var dispatcher;

      dispatcher = new Dispatcher(this.subscribe, handler);
      return new EventStream(dispatcher.subscribe);
    };

    EventStream.prototype.withSubscribe = function(subscribe) {
      return new EventStream(subscribe);
    };

    return EventStream;

  })(Observable);

  Property = (function(_super) {
    __extends(Property, _super);

    function Property(subscribe, handler) {
      this.toEventStream = __bind(this.toEventStream, this);
      this.toProperty = __bind(this.toProperty, this);
      this.changes = __bind(this.changes, this);
      this.sample = __bind(this.sample, this);
      var combine,
        _this = this;

      Property.__super__.constructor.call(this);
      if (handler === true) {
        this.subscribe = subscribe;
      } else {
        this.subscribe = new PropertyDispatcher(subscribe, handler).subscribe;
      }
      combine = function(other, leftSink, rightSink) {
        var myVal, otherVal;

        myVal = None;
        otherVal = None;
        return new Property(function(sink) {
          var checkEnd, combiningSink, initialSent, myEnd, mySink, otherEnd, otherSink, unsubBoth, unsubMe, unsubOther, unsubscribed;

          unsubscribed = false;
          unsubMe = nop;
          unsubOther = nop;
          unsubBoth = function() {
            unsubMe();
            unsubOther();
            return unsubscribed = true;
          };
          myEnd = false;
          otherEnd = false;
          checkEnd = function() {
            var reply;

            if (myEnd && otherEnd) {
              reply = sink(end());
              if (reply === Bacon.noMore) {
                unsubBoth();
              }
              return reply;
            }
          };
          initialSent = false;
          combiningSink = function(markEnd, setValue, thisSink) {
            return function(event) {
              var reply;

              if (event.isEnd()) {
                markEnd();
                checkEnd();
                return Bacon.noMore;
              } else if (event.isError()) {
                reply = sink(event);
                if (reply === Bacon.noMore) {
                  unsubBoth();
                }
                return reply;
              } else {
                setValue(new Some(event.value));
                if (myVal.isDefined && otherVal.isDefined) {
                  if (initialSent && event.isInitial()) {
                    return Bacon.more;
                  } else {
                    initialSent = true;
                    reply = thisSink(sink, event, myVal.value, otherVal.value);
                    if (reply === Bacon.noMore) {
                      unsubBoth();
                    }
                    return reply;
                  }
                } else {
                  return Bacon.more;
                }
              }
            };
          };
          mySink = combiningSink((function() {
            return myEnd = true;
          }), (function(value) {
            return myVal = value;
          }), leftSink);
          otherSink = combiningSink((function() {
            return otherEnd = true;
          }), (function(value) {
            return otherVal = value;
          }), rightSink);
          unsubMe = _this.subscribe(mySink);
          if (!unsubscribed) {
            unsubOther = other.subscribe(otherSink);
          }
          return unsubBoth;
        });
      };
      this.sampledBy = function(sampler, combinator) {
        var pushPropertyValue, values;

        if (combinator == null) {
          combinator = former;
        }
        combinator = toCombinator(combinator);
        pushPropertyValue = function(sink, event, propertyVal, streamVal) {
          return sink(event.apply(function() {
            return combinator(propertyVal(), streamVal());
          }));
        };
        values = combine(sampler, nop, pushPropertyValue);
        if (sampler instanceof EventStream) {
          values = values.changes();
        }
        return values.takeUntil(sampler.filter(false).mapEnd());
      };
    }

    Property.prototype.sample = function(interval) {
      return this.sampledBy(Bacon.interval(interval, {}));
    };

    Property.prototype.changes = function() {
      var _this = this;

      return new EventStream(function(sink) {
        return _this.subscribe(function(event) {
          if (!event.isInitial()) {
            return sink(event);
          }
        });
      });
    };

    Property.prototype.withHandler = function(handler) {
      return new Property(this.subscribe, handler);
    };

    Property.prototype.withSubscribe = function(subscribe) {
      return new Property(subscribe);
    };

    Property.prototype.toProperty = function() {
      assertNoArguments(arguments);
      return this;
    };

    Property.prototype.toEventStream = function() {
      var _this = this;

      return new EventStream(function(sink) {
        return _this.subscribe(function(event) {
          if (event.isInitial()) {
            event = event.toNext();
          }
          return sink(event);
        });
      });
    };

    Property.prototype.and = function(other) {
      return this.combine(other, function(x, y) {
        return x && y;
      });
    };

    Property.prototype.or = function(other) {
      return this.combine(other, function(x, y) {
        return x || y;
      });
    };

    Property.prototype.decode = function(cases) {
      return this.combine(Bacon.combineTemplate(cases), function(key, values) {
        return values[key];
      });
    };

    Property.prototype.delay = function(delay) {
      return this.delayChanges(function(changes) {
        return changes.delay(delay);
      });
    };

    Property.prototype.debounce = function(delay) {
      return this.delayChanges(function(changes) {
        return changes.debounce(delay);
      });
    };

    Property.prototype.throttle = function(delay) {
      return this.delayChanges(function(changes) {
        return changes.throttle(delay);
      });
    };

    Property.prototype.delayChanges = function(f) {
      return addPropertyInitValueToStream(this, f(this.changes()));
    };

    return Property;

  })(Observable);

  addPropertyInitValueToStream = function(property, stream) {
    var getInitValue;

    getInitValue = function(property) {
      var value;

      value = None;
      property.subscribe(function(event) {
        if (event.hasValue()) {
          value = new Some(event.value());
        }
        return Bacon.noMore;
      });
      return value;
    };
    return stream.toProperty(getInitValue(property));
  };

  Dispatcher = (function() {
    function Dispatcher(subscribe, handleEvent) {
      var addWaiter, done, ended, prevError, pushing, queue, removeSub, subscriptions, unsubscribeFromSource, waiters,
        _this = this;

      if (subscribe == null) {
        subscribe = function() {
          return nop;
        };
      }
      subscriptions = [];
      queue = null;
      pushing = false;
      ended = false;
      this.hasSubscribers = function() {
        return subscriptions.length > 0;
      };
      prevError = null;
      unsubscribeFromSource = nop;
      removeSub = function(subscription) {
        return subscriptions = _.without(subscription, subscriptions);
      };
      waiters = null;
      done = function(event) {
        var w, ws, _i, _len;

        if (waiters != null) {
          ws = waiters;
          waiters = null;
          for (_i = 0, _len = ws.length; _i < _len; _i++) {
            w = ws[_i];
            w();
          }
        }
        return event.onDone = Event.prototype.onDone;
      };
      addWaiter = function(listener) {
        return waiters = (waiters || []).concat([listener]);
      };
      this.push = function(event) {
        var reply, sub, success, tmp, _i, _len;

        if (!pushing) {
          if (event === prevError) {
            return;
          }
          if (event.isError()) {
            prevError = event;
          }
          success = false;
          try {
            pushing = true;
            event.onDone = addWaiter;
            tmp = subscriptions;
            for (_i = 0, _len = tmp.length; _i < _len; _i++) {
              sub = tmp[_i];
              reply = sub.sink(event);
              if (reply === Bacon.noMore || event.isEnd()) {
                removeSub(sub);
              }
            }
            success = true;
          } finally {
            pushing = false;
            if (!success) {
              queue = null;
            }
          }
          success = true;
          while (queue != null ? queue.length : void 0) {
            event = _.head(queue);
            queue = _.tail(queue);
            _this.push(event);
          }
          done(event);
          if (_this.hasSubscribers()) {
            return Bacon.more;
          } else {
            return Bacon.noMore;
          }
        } else {
          queue = (queue || []).concat([event]);
          return Bacon.more;
        }
      };
      if (handleEvent == null) {
        handleEvent = function(event) {
          return this.push(event);
        };
      }
      this.handleEvent = function(event) {
        if (event.isEnd()) {
          ended = true;
        }
        return handleEvent.apply(_this, [event]);
      };
      this.subscribe = function(sink) {
        var subscription;

        if (ended) {
          sink(end());
          return nop;
        } else {
          assertFunction(sink);
          subscription = {
            sink: sink
          };
          subscriptions = subscriptions.concat(subscription);
          if (subscriptions.length === 1) {
            unsubscribeFromSource = subscribe(_this.handleEvent);
          }
          assertFunction(unsubscribeFromSource);
          return function() {
            removeSub(subscription);
            if (!_this.hasSubscribers()) {
              return unsubscribeFromSource();
            }
          };
        }
      };
    }

    return Dispatcher;

  })();

  PropertyDispatcher = (function(_super) {
    __extends(PropertyDispatcher, _super);

    function PropertyDispatcher(subscribe, handleEvent) {
      var current, ended, push,
        _this = this;

      PropertyDispatcher.__super__.constructor.call(this, subscribe, handleEvent);
      current = None;
      push = this.push;
      subscribe = this.subscribe;
      ended = false;
      this.push = function(event) {
        if (event.isEnd()) {
          ended = true;
        }
        if (event.hasValue()) {
          current = new Some(event.value());
        }
        return push.apply(_this, [event]);
      };
      this.subscribe = function(sink) {
        var initSent, reply, shouldBounceInitialValue;

        initSent = false;
        shouldBounceInitialValue = function() {
          return _this.hasSubscribers() || ended;
        };
        reply = current.filter(shouldBounceInitialValue).map(function(val) {
          return sink(initial(val));
        });
        if (reply.getOrElse(Bacon.more) === Bacon.noMore) {
          return nop;
        } else if (ended) {
          sink(end());
          return nop;
        } else {
          return subscribe.apply(_this, [sink]);
        }
      };
    }

    return PropertyDispatcher;

  })(Dispatcher);

  Bus = (function(_super) {
    __extends(Bus, _super);

    function Bus() {
      var ended, guardedSink, sink, subscribeAll, subscribeInput, subscriptions, unsubAll, unsubscribeInput,
        _this = this;

      sink = void 0;
      subscriptions = [];
      ended = false;
      guardedSink = function(input) {
        return function(event) {
          if (event.isEnd()) {
            unsubscribeInput(input);
            return Bacon.noMore;
          } else {
            return sink(event);
          }
        };
      };
      unsubAll = function() {
        var sub, _i, _len, _results;

        _results = [];
        for (_i = 0, _len = subscriptions.length; _i < _len; _i++) {
          sub = subscriptions[_i];
          _results.push(typeof sub.unsub === "function" ? sub.unsub() : void 0);
        }
        return _results;
      };
      subscribeInput = function(subscription) {
        return subscription.unsub = subscription.input.subscribe(guardedSink(subscription.input));
      };
      unsubscribeInput = function(input) {
        var i, sub, _i, _len;

        for (i = _i = 0, _len = subscriptions.length; _i < _len; i = ++_i) {
          sub = subscriptions[i];
          if (sub.input === input) {
            if (typeof sub.unsub === "function") {
              sub.unsub();
            }
            subscriptions.splice(i, 1);
            return;
          }
        }
      };
      subscribeAll = function(newSink) {
        var subscription, unsubFuncs, _i, _len, _ref3;

        sink = newSink;
        unsubFuncs = [];
        _ref3 = cloneArray(subscriptions);
        for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
          subscription = _ref3[_i];
          subscribeInput(subscription);
        }
        return unsubAll;
      };
      Bus.__super__.constructor.call(this, subscribeAll);
      this.plug = function(input) {
        var sub;

        if (ended) {
          return;
        }
        sub = {
          input: input
        };
        subscriptions.push(sub);
        if ((sink != null)) {
          subscribeInput(sub);
        }
        return function() {
          return unsubscribeInput(input);
        };
      };
      this.push = function(value) {
        return typeof sink === "function" ? sink(next(value)) : void 0;
      };
      this.error = function(error) {
        return typeof sink === "function" ? sink(new Error(error)) : void 0;
      };
      this.end = function() {
        ended = true;
        unsubAll();
        return typeof sink === "function" ? sink(end()) : void 0;
      };
    }

    return Bus;

  })(EventStream);

  Some = (function() {
    function Some(value) {
      this.value = value;
    }

    Some.prototype.getOrElse = function() {
      return this.value;
    };

    Some.prototype.get = function() {
      return this.value;
    };

    Some.prototype.filter = function(f) {
      if (f(this.value)) {
        return new Some(this.value);
      } else {
        return None;
      }
    };

    Some.prototype.map = function(f) {
      return new Some(f(this.value));
    };

    Some.prototype.forEach = function(f) {
      return f(this.value);
    };

    Some.prototype.isDefined = true;

    Some.prototype.toArray = function() {
      return [this.value];
    };

    return Some;

  })();

  None = {
    getOrElse: function(value) {
      return value;
    },
    filter: function() {
      return None;
    },
    map: function() {
      return None;
    },
    forEach: function() {},
    isDefined: false,
    toArray: function() {
      return [];
    }
  };

  Bacon.EventStream = EventStream;

  Bacon.Property = Property;

  Bacon.Observable = Observable;

  Bacon.Bus = Bus;

  Bacon.Initial = Initial;

  Bacon.Next = Next;

  Bacon.End = End;

  Bacon.Error = Error;

  nop = function() {};

  latter = function(_, x) {
    return x;
  };

  former = function(x, _) {
    return x;
  };

  initial = function(value) {
    return new Initial(_.always(value));
  };

  next = function(value) {
    return new Next(_.always(value));
  };

  end = function() {
    return new End();
  };

  toEvent = function(x) {
    if (x instanceof Event) {
      return x;
    } else {
      return next(x);
    }
  };

  cloneArray = function(xs) {
    return xs.slice(0);
  };

  indexOf = Array.prototype.indexOf ? function(xs, x) {
    return xs.indexOf(x);
  } : function(xs, x) {
    var i, y, _i, _len;

    for (i = _i = 0, _len = xs.length; _i < _len; i = ++_i) {
      y = xs[i];
      if (x === y) {
        return i;
      }
    }
    return -1;
  };

  assert = function(message, condition) {
    if (!condition) {
      throw message;
    }
  };

  assertEvent = function(event) {
    return assert("not an event : " + event, event instanceof Event && event.isEvent());
  };

  assertFunction = function(f) {
    return assert("not a function : " + f, isFunction(f));
  };

  isFunction = function(f) {
    return typeof f === "function";
  };

  assertArray = function(xs) {
    return assert("not an array : " + xs, xs instanceof Array);
  };

  assertNoArguments = function(args) {
    return assert("no arguments supported", args.length === 0);
  };

  assertString = function(x) {
    return assert("not a string : " + x, typeof x === "string");
  };

  methodCall = function(obj, method, args) {
    assertString(method);
    if (args === void 0) {
      args = [];
    }
    return function(value) {
      return obj[method].apply(obj, args.concat([value]));
    };
  };

  partiallyApplied = function(f, applied) {
    return function() {
      var args;

      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return f.apply(null, applied.concat(args));
    };
  };

  makeSpawner = function(f) {
    if (f instanceof Observable) {
      f = _.always(f);
    }
    assertFunction(f);
    return f;
  };

  makeFunction = function(f, args) {
    if (isFunction(f)) {
      if (args.length) {
        return partiallyApplied(f, args);
      } else {
        return f;
      }
    } else if (isFieldKey(f)) {
      return toFieldExtractor(f, args);
    } else if (typeof f === "object" && args.length) {
      return methodCall(f, _.head(args), _.tail(args));
    } else {
      return _.always(f);
    }
  };

  isFieldKey = function(f) {
    return (typeof f === "string") && f.length > 1 && f.charAt(0) === ".";
  };

  Bacon.isFieldKey = isFieldKey;

  toFieldExtractor = function(f, args) {
    var partFuncs, parts;

    parts = f.slice(1).split(".");
    partFuncs = _.map(toSimpleExtractor(args), parts);
    return function(value) {
      var _i, _len;

      for (_i = 0, _len = partFuncs.length; _i < _len; _i++) {
        f = partFuncs[_i];
        value = f(value);
      }
      return value;
    };
  };

  toSimpleExtractor = function(args) {
    return function(key) {
      return function(value) {
        var fieldValue;

        if (value == null) {
          return void 0;
        } else {
          fieldValue = value[key];
          if (isFunction(fieldValue)) {
            return fieldValue.apply(value, args);
          } else {
            return fieldValue;
          }
        }
      };
    };
  };

  toFieldKey = function(f) {
    return f.slice(1);
  };

  toCombinator = function(f) {
    var key;

    if (isFunction(f)) {
      return f;
    } else if (isFieldKey(f)) {
      key = toFieldKey(f);
      return function(left, right) {
        return left[key](right);
      };
    } else {
      return assert("not a function or a field key: " + f, false);
    }
  };

  toOption = function(v) {
    if (v instanceof Some || v === None) {
      return v;
    } else {
      return new Some(v);
    }
  };

  if ((typeof define !== "undefined" && define !== null) && (define.amd != null)) {
    if (typeof define === "function") {
      define(function() {
        return Bacon;
      });
    }
  }

  _ = {
    head: function(xs) {
      return xs[0];
    },
    always: function(x) {
      return function() {
        return x;
      };
    },
    empty: function(xs) {
      return xs.length === 0;
    },
    tail: function(xs) {
      return xs.slice(1, xs.length);
    },
    filter: function(f, xs) {
      var filtered, x, _i, _len;

      filtered = [];
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (f(x)) {
          filtered.push(x);
        }
      }
      return filtered;
    },
    map: function(f, xs) {
      var x, _i, _len, _results;

      _results = [];
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        _results.push(f(x));
      }
      return _results;
    },
    each: function(xs, f) {
      var key, value, _results;

      _results = [];
      for (key in xs) {
        value = xs[key];
        _results.push(f(key, value));
      }
      return _results;
    },
    toArray: function(xs) {
      if (xs instanceof Array) {
        return xs;
      } else {
        return [xs];
      }
    },
    contains: function(xs, x) {
      return indexOf(xs, x) !== -1;
    },
    id: function(x) {
      return x;
    },
    last: function(xs) {
      return xs[xs.length - 1];
    },
    all: function(xs) {
      var x, _i, _len;

      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (!x) {
          return false;
        }
      }
      return true;
    },
    any: function(xs) {
      var x, _i, _len;

      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        if (x) {
          return true;
        }
      }
      return false;
    },
    without: function(x, xs) {
      return _.filter((function(y) {
        return y !== x;
      }), xs);
    },
    remove: function(x, xs) {
      var i;

      i = indexOf(xs, x);
      if (i >= 0) {
        return xs.splice(i, 1);
      }
    }
  };

  Bacon._ = _;

  Bacon.scheduler = {
    setTimeout: function(f, d) {
      return setTimeout(f, d);
    },
    setInterval: function(f, i) {
      return setInterval(f, i);
    },
    clearInterval: function(id) {
      return clearInterval(id);
    },
    now: function() {
      return new Date().getTime();
    }
  };

}).call(this);

(function() {
  var __slice = [].slice;

  window.Vector2 = (function() {
    function Vector2(x, y) {
      this.x = x;
      this.y = y;
    }

    Vector2.prototype.add = function(p2) {
      return new window.Vector2(this.x + p2.x, this.y + p2.y);
    };

    Vector2.prototype.multiply = function(c) {
      return new window.Vector2(this.x * c, this.y * c);
    };

    Vector2.prototype.subtract = function(p2) {
      return this.add(p2.multiply(-1));
    };

    Vector2.prototype.length = function() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    Vector2.prototype.equals = function(p2) {
      return this.x === p2.x && this.y === p2.y;
    };

    Vector2.prototype.toString = function() {
      return "{" + this.x + ", " + this.y + "}";
    };

    return Vector2;

  })();

  window.V2 = function() {
    var args;

    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Vector2, args, function(){});
  };

}).call(this);

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.WD = window.WD || {};

  window.fb = new Firebase('https://we-dreamers.firebaseio.com/LD26');

  WD.Clock = (function() {
    function Clock() {
      var animate,
        _this = this;

      this.tick = new Bacon.Bus();
      animate = function(t) {
        _this.t = t;
        _this.tick.push(t);
        return window.requestAnimationFrame(animate);
      };
      window.requestAnimationFrame(animate);
    }

    Clock.prototype.now = function() {
      return this.t;
    };

    return Clock;

  })();

  WD.GameController = (function() {
    function GameController($el) {
      this.$el = $el;
      this.initTestData = __bind(this.initTestData, this);
      this.$el.append($('<div class="wd-inner"></div>'));
      this.$worldContainer = $('<div class="room-container"></div>').appendTo(this.$el.find('.wd-inner')).css({
        position: 'absolute',
        overflow: 'visible',
        left: -WD.GRID_SIZE / 2,
        top: -WD.GRID_SIZE / 2
      });
      this.$interactiveContainer = $('<div class="wd-interactive"></div>').appendTo(this.$worldContainer);
      this.viewOffset = V2(0, 0);
      this.rooms = {};
      this.doors = {};
      this.chunks = {};
    }

    GameController.prototype.addRoom = function(room) {
      this.rooms[room.hash()] = room;
      return this.$worldContainer.append(room.$el);
    };

    GameController.prototype.addDoor = function(door) {
      if (!(door.hash1() in this.doors)) {
        this.doors[door.hash1()] = [];
      }
      if (!(door.hash2() in this.doors)) {
        this.doors[door.hash2()] = [];
      }
      this.doors[door.hash1()].push(door);
      this.doors[door.hash2()].push(door);
      return this.$worldContainer.append(door.$el);
    };

    GameController.prototype.initTestData = function() {
      this.r1 = new WD.Room(V2(0, 0), 50, 0, 0, 100);
      this.r2 = new WD.Room(V2(1, 0), 30, 20, 0, 100);
      this.r3 = new WD.Room(V2(0, 1), 0, 0, 30, 100);
      this.r4 = new WD.Room(V2(0, -1), 0, 30, 30, 100);
      this.r5 = new WD.Room(V2(-1, 0), 0, 30, 0, 100);
      this.addRoom(this.r1);
      this.addRoom(this.r2);
      this.addRoom(this.r3);
      this.addRoom(this.r4);
      this.addRoom(this.r5);
      this.addDoor(new WD.Door(this.r1, this.r2, 'basic', this.rooms));
      this.addDoor(new WD.Door(this.r1, this.r3, 'basic', this.rooms));
      this.addDoor(new WD.Door(this.r1, this.r4, 'basic', this.rooms));
      return this.addDoor(new WD.Door(this.r1, this.r5, 'basic', this.rooms));
    };

    GameController.prototype.run = function() {
      var _this = this;

      this.players = {};
      return WD.ensureUser(function(username) {
        _this.username = username;
        _this.clock = new WD.Clock();
        _this.initTestData();
        _this.player = new WD.Player(_this.clock, username, _this);
        _this.interactify(_this.player);
        _this.$interactiveContainer.append(_this.player.$el);
        return fb.child('users').on('child_added', function(snapshot) {
          var data;

          data = snapshot.val();
          _this.players[data.username] = new WD.Player(_this.clock, data.username, _this);
          return _this.$interactiveContainer.append(_this.players[data.username].$el);
        });
      });
    };

    GameController.prototype.interactify = function(player) {
      var keyboardToDirection,
        _this = this;

      this.$worldContainer.asEventStream('click', '.wd-room').onValue(function(e) {
        var gridPoint;

        gridPoint = V2($(e.target).data('gridX'), $(e.target).data('gridY'));
        return _this.clickRoom(_this.roomAtPoint(gridPoint));
      });
      keyboardToDirection = function(keyName, vector) {
        return _this.clock.tick.filter(player.isStill).filter(WD.keyboard.isDown(keyName)).onValue(function() {
          var nextRoom;

          nextRoom = _this.adjacentRoom(player.currentRoom, vector);
          if (!nextRoom) {
            return;
          }
          return player.fb.child('position').set(nextRoom.gridPoint);
        });
      };
      keyboardToDirection('left', V2(-1, 0));
      keyboardToDirection('right', V2(1, 0));
      keyboardToDirection('up', V2(0, -1));
      keyboardToDirection('down', V2(0, 1));
      keyboardToDirection('a', V2(-1, 0));
      keyboardToDirection('d', V2(1, 0));
      keyboardToDirection('w', V2(0, -1));
      return keyboardToDirection('s', V2(0, 1));
    };

    GameController.prototype.clickRoom = function(room) {
      return console.log('you clicked', room);
    };

    GameController.prototype.roomAtPoint = function(p) {
      return this.rooms[p.toString()];
    };

    GameController.prototype.adjacentRoom = function(room, dGridPoint) {
      var p2;

      p2 = room.gridPoint.add(dGridPoint);
      if (!(p2.toString() in this.rooms)) {
        return false;
      }
      if (!_.find(this.doors[room.hash()], function(door) {
        return door.other(room.gridPoint).equals(p2);
      })) {
        return false;
      }
      return this.roomAtPoint(p2);
    };

    return GameController;

  })();

  WD.Room = (function() {
    function Room(gridPoint, amtRed, amtGreen, amtBlue, fullness) {
      this.gridPoint = gridPoint;
      this.amtRed = amtRed;
      this.amtGreen = amtGreen;
      this.amtBlue = amtBlue;
      this.fullness = fullness;
      this.color = WD.subtractiveColor(this.amtRed, this.amtGreen, this.amtBlue, this.fullness / 100);
      this.$el = $(("        <div class='wd-room rounded-rect'          data-grid-x='" + this.gridPoint.x + "'          data-grid-y='" + this.gridPoint.y + "'        ></div>      ").trim()).css({
        width: WD.ROOM_SIZE,
        height: WD.ROOM_SIZE,
        left: this.gridPoint.x * WD.GRID_SIZE + WD.ROOM_PADDING,
        top: this.gridPoint.y * WD.GRID_SIZE + WD.ROOM_PADDING,
        'background-color': this.color
      });
    }

    Room.prototype.center = function() {
      return V2(this.gridPoint.x * WD.GRID_SIZE + WD.GRID_SIZE / 2, this.gridPoint.y * WD.GRID_SIZE + WD.GRID_SIZE / 2);
    };

    Room.prototype.hash = function() {
      return this.gridPoint.toString();
    };

    return Room;

  })();

  WD.Door = (function() {
    function Door(room1, room2, type) {
      var tmp;

      this.type = type;
      if (room1.gridPoint.y > room2.gridPoint.y || room1.gridPoint.x > room2.gridPoint.x) {
        tmp = room1;
        room1 = room2;
        room2 = tmp;
      }
      this.gridPoint1 = room1.gridPoint;
      this.gridPoint2 = room2.gridPoint;
      if (this.gridPoint1.x === this.gridPoint2.x) {
        this.initVertical(room1.color, room2.color);
      } else {
        this.initHorizontal(room1.color, room2.color);
      }
    }

    Door.prototype.hash1 = function() {
      return this.gridPoint1.toString();
    };

    Door.prototype.hash2 = function() {
      return this.gridPoint2.toString();
    };

    Door.prototype.other = function(p) {
      if (p.equals(this.gridPoint1)) {
        return this.gridPoint2;
      } else {
        return this.gridPoint1;
      }
    };

    Door.prototype.initVertical = function(color1, color2) {
      this.$el = $("<div class='wd-door " + this.type + "'></div>").css({
        width: WD.DOOR_SIZE,
        height: WD.ROOM_PADDING * 2,
        left: WD.GRID_SIZE * this.gridPoint1.x + 20,
        top: this.gridPoint1.y * WD.GRID_SIZE + WD.GRID_SIZE - WD.ROOM_PADDING
      });
      return WD.cssGradientVertical(this.$el, color1, color2);
    };

    Door.prototype.initHorizontal = function(color1, color2) {
      this.$el = $("<div class='wd-door " + this.type + "'></div>").css({
        width: WD.ROOM_PADDING * 2,
        height: WD.DOOR_SIZE,
        left: this.gridPoint2.x * WD.GRID_SIZE - WD.ROOM_PADDING,
        top: WD.GRID_SIZE * this.gridPoint1.y + 20
      });
      return WD.cssGradientHorizontal(this.$el, color1, color2);
    };

    return Door;

  })();

}).call(this);

(function() {
  var lerp, lerpStreams;

  window.WD = window.WD || {};

  lerp = function(startValue, endValue, duration, dt) {
    var val;

    val = startValue + (endValue - startValue) * (dt / duration);
    if (endValue > startValue) {
      val = Math.min(endValue, val);
      val = Math.max(startValue, val);
    } else {
      val = Math.max(endValue, val);
      val = Math.min(startValue, val);
    }
    return val;
  };

  lerpStreams = function(clock, startPoint, endPoint, duration) {
    var distance, endTime, reachedDest, startTime, tickStreamToTween;

    startTime = clock.now();
    distance = endPoint.subtract(startPoint).length();
    tickStreamToTween = function(val1, val2) {
      return clock.tick.map(function(currentTime) {
        return lerp(val1, val2, duration, currentTime - startTime);
      });
    };
    endTime = startTime + duration;
    reachedDest = clock.tick.filter(function(t) {
      return t > endTime;
    }).take(1);
    return {
      x: tickStreamToTween(startPoint.x, endPoint.x).takeUntil(reachedDest),
      y: tickStreamToTween(startPoint.y, endPoint.y).takeUntil(reachedDest),
      reachedDest: reachedDest
    };
  };

  WD.Player = (function() {
    function Player(clock, username, gameController) {
      var _this = this;

      this.clock = clock;
      this.username = username;
      this.gameController = gameController;
      this.gridPosition = V2(0, 0);
      this.currentRoom = null;
      this.$el = $("<div class='wd-player' data-name='" + this.name + "'></div>");
      this.initBaconJunk();
      this.fb = fb.child('users').child(this.username);
      this.fb.on('value', function(snapshot) {
        var color, position, room, _ref;

        _ref = snapshot.val(), color = _ref.color, position = _ref.position;
        _this.color = color;
        _this.$el.css('background-color', "rgb(" + _this.color.r + ", " + _this.color.g + ", " + _this.color.b + ")");
        room = _this.gameController.roomAtPoint(V2(position.x, position.y));
        if (_this.currentRoom) {
          return _this.walkToRoom(room);
        } else {
          return _this.teleportToRoom(room);
        }
      });
    }

    Player.prototype.initBaconJunk = function() {
      var buses, isStillBus, properties, started, stopMoving, updateStreams,
        _this = this;

      this.positionData = {
        x: 0,
        y: 0
      };
      started = false;
      buses = {};
      properties = {};
      _.each(['x', 'y'], function(k) {
        buses[k] = new Bacon.Bus();
        properties[k] = buses[k].flatMapLatest(_.identity).skipDuplicates().toProperty(_this[k]);
        return properties[k].onValue(function(v) {
          _this.positionData[k] = v;
          if (!started) {
            return;
          }
          return _this.$el.css({
            left: _this.positionData.x,
            top: _this.positionData.y
          });
        });
      });
      updateStreams = function(streams) {
        return _.each(_.pairs(streams), function(_arg) {
          var k, v;

          k = _arg[0], v = _arg[1];
          if (k in buses) {
            return buses[k].push(v);
          }
        });
      };
      stopMoving = function() {
        return updateStreams({
          x: Bacon.constant(_this.positionData.x),
          y: Bacon.constant(_this.positionData.y)
        });
      };
      stopMoving();
      started = true;
      Bacon.combineTemplate(this.properties);
      this.stopMoving = stopMoving;
      this.updateStreams = updateStreams;
      isStillBus = new Bacon.Bus();
      this.startMoving = function() {
        return isStillBus.push(false);
      };
      this.stopMoving = function() {
        return isStillBus.push(true);
      };
      return this.isStill = isStillBus.toProperty(true);
    };

    Player.prototype.teleportToRoom = function(room) {
      var p;

      this.currentRoom = room;
      p = this.currentRoom.center();
      return this.updateStreams({
        x: Bacon.constant(p.x),
        y: Bacon.constant(p.y)
      });
    };

    Player.prototype.walkToRoom = function(room) {
      var streams,
        _this = this;

      this.startMoving();
      streams = lerpStreams(this.clock, V2(this.positionData.x, this.positionData.y), room.center(), 500);
      this.currentRoom = room;
      streams.reachedDest.onValue(function() {
        _this.stopMoving();
        return _this.teleportToRoom(room);
      });
      return this.updateStreams(streams);
    };

    return Player;

  })();

}).call(this);

(function() {
  var _showUsernamePrompt;

  window.WD = window.WD || {};

  _showUsernamePrompt = function(callback, isRepeat) {
    var $el, $form;

    if (isRepeat == null) {
      isRepeat = false;
    }
    $el = $("    <div class='username-prompt-container'>      <form class='username-prompt'>        <label>Pick a username:</label>        <input name='username' autofocus>      </form>    </div>  ".trim()).appendTo($('body'));
    if (isRepeat) {
      $("<div>(The one you tried was taken)</div>").insertAfter($el.find('input'));
    }
    $form = $el.find('form');
    return $form.on('submit', function(e) {
      var value;

      value = $el.find('input').val();
      if (value) {
        $el.remove();
        callback(value);
      }
      e.preventDefault();
      return false;
    });
  };

  WD.ensureUser = function(callback, isRepeat) {
    var f, fbUsers, username,
      _this = this;

    if (isRepeat == null) {
      isRepeat = false;
    }
    fbUsers = fb.child('users');
    if (localStorage.getItem('username')) {
      username = localStorage.getItem('username');
      return fbUsers.child(username).once('value', function(snapshot) {
        var data;

        data = snapshot.val();
        if (!data) {
          data = {
            username: username,
            color: {
              r: _.random(50, 255),
              g: _.random(50, 255),
              b: _.random(50, 255)
            },
            position: {
              x: 0,
              y: 0
            }
          };
          fbUsers.child(username).set(data);
        }
        return callback(username);
      });
    } else {
      f = function(username) {
        return fbUsers.child(username).once('value', function(snapshot) {
          var data;

          if (snapshot.val()) {
            return WD.ensureUser(callback, true);
          } else {
            data = {
              username: username,
              color: {
                r: _.random(50, 255),
                g: _.random(50, 255),
                b: _.random(50, 255)
              },
              position: {
                x: 0,
                y: 0
              }
            };
            fbUsers.child(username).set(data);
            localStorage.setItem('username', username);
            return callback(username);
          }
        });
      };
      return _showUsernamePrompt(f, isRepeat);
    }
  };

}).call(this);

(function() {
  window.WD = window.WD || {};

  WD.GRID_SIZE = 128;

  WD.ROOM_SIZE = 110;

  WD.ROOM_PADDING = (WD.GRID_SIZE - WD.ROOM_SIZE) / 2;

  WD.DOOR_SIZE = WD.GRID_SIZE - 40;

  WD.run = function(selector) {
    return (new WD.GameController($(selector))).run();
  };

  WD.chunkForPoint = function(_arg) {
    var x, y;

    x = _arg.x, y = _arg.y;
    return "[" + (Math.floor(x / 100)) + ", " + (Math.floor(y / 100)) + "]";
  };

  WD.subtractiveColor = function(r, g, b, fraction) {
    var floor;

    if (fraction == null) {
      fraction = 1;
    }
    r *= fraction;
    g *= fraction;
    b *= fraction;
    floor = 255 - Math.max(r, g, b);
    return "rgb(" + (floor + r) + ", " + (floor + g) + ", " + (floor + b) + ")";
  };

  WD.cssGradientVertical = function($el, a, b) {
    return $el.css('background', "-webkit-gradient(linear, left top, left bottom, from(" + a + "), to(" + b + "))");
  };

  WD.cssGradientHorizontal = function($el, a, b) {
    return $el.css('background', "-webkit-gradient(linear, left top, right top, from(" + a + "), to(" + b + "))");
  };

  WD.keyboard = {
    downs: _.memoize(function(key) {
      return new Bacon.EventStream(function(sink) {
        Mousetrap.bind([key], function(e) {
          return sink(new Bacon.Next(e));
        });
        return function() {};
      });
    }),
    ups: _.memoize(function(key) {
      return new Bacon.EventStream(function(sink) {
        Mousetrap.bind([key], (function(e) {
          return sink(new Bacon.Next(e));
        }), "keyup");
        return function() {};
      });
    }),
    isDown: _.memoize(function(key) {
      return WD.keyboard.downs(key).map(true).merge(WD.keyboard.ups(key).map(false)).merge($('window').asEventStream('focus').map(false)).toProperty(false);
    })
  };

}).call(this);