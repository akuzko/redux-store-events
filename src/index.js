import { combineReducers } from 'redux';
import set from 'lodash.set';
import get from 'lodash.get';

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
    fn.call(this, this, this.reduce);
    return this;
  },

  init(initialState) {
    initialStates[this.namespace.join('.')] = initialState;
    return this;
  },

  use(mixin, ...args) {
    mixin.call(null, this, ...args);
  },

  on(name, handler) {
    this[name] = (function() {
      const prev = this.currentEvent;
      let result;
      this.currentEvent = name;
      try {
        result = handler.apply(this, arguments);
      } catch (e) {
        this.currentEvent = prev;
        throw e;
      }
      this.currentEvent = prev;
      return result;
    }).bind(this);

    return this;
  },

  trigger(name, ...args) {
    return this[name](...args);
  },

  reduce(event, reducer) {
    if (reducer === undefined && typeof event === 'function') {
      reducer = event;
      event = this.currentEvent;
    }

    const type = `event:${this.namespace.join('/')}:${event || '$generic'}`;

    store.dispatch({ type, reducer });
  },

  getState() {
    return get(getState(), this.namespace);
  }
};

function createEvents(namespace) {
  if (namespace) {
    const key = namespace.join('.');

    if (eventsStore[key]) {
      return eventsStore[key];
    }

    Object.assign(events, eventsMixin, { namespace });
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

    return createEvents(namespace ? [...namespace, ns] : [ns]);
  }

  return events;
}

function escape(string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

export default globalEvents;
