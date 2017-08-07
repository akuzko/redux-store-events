import { combineReducers } from 'redux';

const globalEvents = createEvents();
const allEvents = {};
const initialStates = {};

let store;

Object.assign(globalEvents, {
  attach(reduxStore) {
    store = reduxStore;
  },

  detach() {
    store = null;
  },

  getReducer() {
    return combineReducers(Object.keys(allEvents).reduce((result, ns) => {
      const initial = initialStates[ns];

      result[ns] = function(state = initial, action) {
        if (!new RegExp(`^event:${escape(ns)}(?::.+)?$`).test(action.type)) {
          return state;
        }

        return action.reducer(state);
      };
      return result;
    }, {}));
  }
});

const eventsMixin = {
  setup(fn) {
    fn.call(this, this, this.reduce);
    return this;
  },

  init(initialState) {
    initialStates[this.namespace] = initialState;
    return this;
  },

  use(mixin, ...args) {
    mixin.call(null, this, ...args);
  },

  on(name, handler) {
    this[name] = function() {
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
    };

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

    const type = `event:${this.namespace}:${event || '$generic'}`;

    store.dispatch({ type, reducer });
  }
};

function createEvents(namespace) {
  if (namespace) {
    if (allEvents[namespace]) {
      return allEvents[namespace];
    }

    Object.assign(events, eventsMixin, { namespace });
    events.reduce = events.reduce.bind(events);
    allEvents[namespace] = events;
  }

  function events(ns) {
    if (typeof ns === 'function') {
      const createStore = ns;

      if (store) {
        throw new Error('store is already created');
      }

      store = createStore(globalEvents.getReducer());
      return store;
    }

    return createEvents(namespace ? `${namespace}.${ns}` : ns);
  }

  return events;
}

function escape(string) {
  return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

export default globalEvents;
