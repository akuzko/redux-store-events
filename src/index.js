import { combineReducers } from 'redux';
import set from 'lodash.set';
import get from 'lodash.get';
import shallowEqual from 'shallow-equal/objects';

const globalEvents = createEvents();
let eventsStore = {};
let eventsGraph = {};
let initialStates = {};

let store;

export function getState() {
  if (!store) {
    throw new Error('redux store is not initialized');
  }

  return store.getState();
}

function combineNamespaceReducers(events, path = []) {
  return combineReducers(Object.keys(events).reduce((result, ns) => {
    const nsPath = [...path, ns];

    if (typeof events[ns] === 'object') {
      result[ns] = combineNamespaceReducers(events[ns], nsPath);
    } else {
      const initial = initialStates[nsPath.join('.')];

      result[ns] = function(state = initial, action) {
        if (!new RegExp(`^event:${escape(nsPath.join('/'))}(?::.+)?$`).test(action.type)) {
          return state;
        }

        return action.reducer(state);
      };
    }
    return result;
  }, {}));
}

function nsToKey(namespace, separator = '.') {
  return namespace.join(separator);
}

Object.assign(globalEvents, {
  attach(reduxStore) {
    store = reduxStore;
  },

  detach() {
    store = null;
  },

  clear() {
    eventsStore = {};
    eventsGraph = {};
    initialStates = {};
    store = null;
  },

  getReducer() {
    return combineNamespaceReducers(eventsGraph);
  }
});

const eventsMixin = {
  setup(fn) {
    this._setupHandlers.push(fn);

    fn.call(this, this._on.bind(this), this.reduce, this);

    return this;
  },

  init(initialState, fn) {
    initialStates[nsToKey(this.namespace)] = initialState;

    if (typeof fn === 'function') {
      this.setup(fn);
    }

    return this;
  },

  use(mixin, ...args) {
    mixin.call(null, this, ...args);

    return this;
  },

  _on(name, handler) {
    this.handlers[name] = handler;
    this[name] = function() {
      return this.trigger(name, ...arguments);
    };
  },

  on(name, handler) {
    this._onHandlers[name] = handler;
    this._on(name, handler);
  },

  trigger(name, ...args) {
    const prev = this.currentEvent;
    let result;
    this.currentEvent = name;

    try {
      result = this.handlers[name].apply(this, args);
    } catch (e) {
      this.currentEvent = prev;
      throw e;
    }
    this.currentEvent = prev;

    return result;
  },

  reduce(event, reducer) {
    if (reducer === undefined && typeof event === 'function') {
      reducer = event;
      event = this.currentEvent;
    }

    const type = `event:${nsToKey(this.namespace, '/')}:${event || '$generic'}`;

    store.dispatch({ type, reducer });
  },

  getState() {
    return get(getState(), this.namespace);
  }
};

function bindEvents(events, dataObject) {
  if (events._boundEvents && shallowEqual(events._boundEvents._data, dataObject)) {
    return events._boundEvents;
  }

  const { use, _on, reduce, trigger, getState } = eventsMixin;
  const evs = {
    ...dataObject,
    namespace: events.namespace,
    handlers: {},
    use,
    reduce,
    trigger,
    getState
  };
  evs.on = _on.bind(evs);
  evs.reduce = evs.reduce.bind(evs);
  events._setupHandlers.forEach(fn => fn.call(evs, evs.on, evs.reduce, evs));
  for (const name in events._onHandlers) {
    evs.on(name, events._onHandlers[name]);
  }
  evs._data = dataObject;
  events._boundEvents = evs;

  return evs;
}

function createEvents(namespace) {
  if (namespace) {
    const key = nsToKey(namespace);

    if (eventsStore[key]) {
      return eventsStore[key];
    }

    Object.assign(events, eventsMixin, {
      namespace,
      _setupHandlers: [],
      _onHandlers: {},
      handlers: {}
    });
    events.on = events.on.bind(events);
    events.reduce = events.reduce.bind(events);
    eventsStore[key] = events;
    set(eventsGraph, namespace, true);
  }

  function events(ns, ...args) {
    if (typeof ns === 'function') {
      const createStore = ns;

      if (store) {
        throw new Error('store is already created');
      }

      store = createStore(globalEvents.getReducer(), ...args);
      return store;
    }

    if (typeof ns === 'object') {
      return bindEvents(events, ns);
    }

    return createEvents(namespace ? [...namespace, ns] : [ns]);
  }

  return events;
}

function escape(string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

export default globalEvents;
