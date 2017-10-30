redux-store-events
==================

Simple, minimalistic and flexible way to organize redux logic

[![build status](https://img.shields.io/travis/akuzko/redux-store-events/master.svg?style=flat-square)](https://travis-ci.org/akuzko/redux-store-events)
[![npm version](https://img.shields.io/npm/v/redux-store-events.svg?style=flat-square)](https://www.npmjs.com/package/redux-store-events)

## Installation

```
npm install --save redux-store-events
```

## Usage

### 1. Define events namespace

Events are organizaed in namespaces. Basic setup for most common CRUD actions
may look like this:

```js
// app/events/todos.js

import events from 'redux-store-events';
import update from 'update-js';
import { get, post, put, destroy } from 'your-requests-lib';

const initialState = {
  loading: false,
  items: []
};

events('todos').setup(initialState, (on, reduce) => {
  on('load', () => {
    reduce(state => ({ ...state, loading: true }));

    return get('/todos').then((response) => {
      // since this is async callback, the scope of 'load' event is lost at this point,
      // and 'loadSuccess' is used to identify a dispatched action. this is used purely
      // for clarity, the code will still work without explicitly named action.
      reduce('loadSuccess', () => {
        return { loading: false, items: response.data };
      });
    });
  });

  on('create', (item) => {
    return post('/todos', { item }).then((response) => {
      reduce('createSuccess', (state) => {
        return update.push(state, 'items', response.data);
      });
    });
  });

  on('update', (item) => {
    return put(`/todos/${item.id}`, { item }).then((response) => {
      reduce('updateSuccess', (state) => {
        return update(state, `items.{id:${item.id}}`, response.data);
      });
    });
  });
  
  on('destroy', (itemId) => {
    return destroy(`/todos/${itemId}`).then(() => {
      reduce('destroySuccess', (state) => {
        return update.remove(state, `items.{id:${itemId}}`);
      });
    });
  });
});
```

The third argument that is passed into a setup function is namespaced events object itself.
It can be used for direct manipulations, like adding mixins (see bellow). 

If setup function has been called without initial state, it will yeild events object
and `reduce` function to the function body: 

```
events('todos').setup((todos, reduce) => {
  todos
    .init(initialState)
    .on('load', () => {
      reduce(state => ({ ...state, loading: true }));

      return get('/todos').then((response) => {
        reduce('loadSuccess', () => {
          return { loading: false, items: response.data };
        });
      });
    })
    .on('create', (item) => {
      return post('/todos', { item }).then((response) => {
        reduce('createSuccess', (state) => {
          return update.push(state, 'items', response.data);
        });
      });
    })
    // ...
});


**NOTE:** it is also possible to initialize and define event namespace in a more brief
way without using a `setup` function:

```js
events('todos')
  .init(initialState)
  .on('load', () => {
    this.reduce(state => ({ ...state, loading: true }));
    // ....
  })
  // rest of definitions
```

Note, however, that it relies on `this.reduce` method call, which means that event
handler's context should not be bound to any object in any way.

### 2. Add an index file to import all events

```js
// app/events/all.js

import './todos';
// ... import all other event namespaces
```

### 3. Create store with attached events

```js
// you application entry point

import { createStore } from 'redux';
import events from 'redux-store-events';

import 'app/events/all';

const store = events(createStore);
```

### 4. Use `events` anywhere

For instance, if you use `redux` with React and `react-redux`, you may have the following:

```js
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import events from 'redux-store-events';

function mapStateToProps(state) {
  return state.todos;
}

class Todos extends PureComponent {
  componentDidMount() {
    events('todos').load();
  }

  // callback on form submit
  submitNewTodo(todo) {
    events('todos').create(todo);
  }

  // callback for toggle 'Active' button
  toggleTodo(todoId) {
    events('todos').toggleActive(todoId);
  }

  // rest of definitions
}

export default connect(mapStateToProps)(Todos);
```

Note that `mapDispatchToProps` is obsolete if you use `redux-store-events`;

### Nested namespaces

It is possible to nest namespaces to handle deep Redux store:

```js
import events from 'redux-store-events';
import { createStore } from 'redux';

const rootEvents = events('root');

rootEvents('nested1')
  .init({ value: 'nested1' })
  .on('foo', () => {
    return { value: 'nested1-foo' };
  });

rootEvents('nested2')
  .init({ value: 'nested2' })
  .on('foo', () => {
    return { value: 'nested2-foo' };
  });

const store = events(createStore);

events('root')('nested2').foo();

store.getState() // =>
// { root: {
//     nested1: { value: 'nested1' },
//     nested2: { value: 'nested2-foo' }
//   }
// }
```

Namespaces can be nested with any depth.

### Mixins

Event mixins are helper functions used to define shared functionality between
different event namespaces. Each mixin function accepts namespaced events object
as it's first argument, and the rest of arguments that are passed to `.use` method
of events object itself:

```js
// app/events/mixins/fooSetter.js
export default function fooSetter(events, value) {
  events.on('setFoo', () => {
    return events.reduce(state => ({ ...state, foo: value }));
  });
}

// app/events/todos.js
import fooSetter from './mixins/fooSetter';

events('todos')
  .init({ items: [] })
  .use(fooSetter, 'foo')
  // ... rest of definitions
```

### `getState` function

For convenience, you can use `getState` helper function in your event handlers. Also,
all events instances have `getState` method that returns a state corresponding to events
namespace. For example:

```js
import events, { getState } from 'redux-store-events';

events('todos')
  .init({ items: [], allowClear: false })
  .on('allowClear', () => {
    this.reduce(state => ({ ...state, allowClear: true }));
  })
  .on('clear', () => {
    if (getState().todos.allowClear) {
      this.reduce(state => ({ ...state, items: [] }));
    }
  });

// after redux store has been created and initialized:
getState() // => { todos: { items: [], allowClear: false } };

events('todos').getState() // => { { items: [], allowClear: false } };
```

## Tips and Hints

### `export` and `import` your event namespaces

When defining event namespace, you can export it immediately to import where it used:

```js
// app/events/todos.js
export default events('todos').setup((todos, reduce) => {
  todos
    .init(initialState)
    .on('load', () => {
      // handle load event
    })
    // the rest of handler definitions
});

// app/components/Todos.jsx
import events from 'app/events/todos';

class Todos extends PureComponent {
  componentDidMount() {
    events.load();
  }
  // the rest of definitions
}
```

### Use `update-js/fp` to reduce store

[`update-js/fp`](https://www.npmjs.com/package/update-js#update-jsfp-module) module provides
an `update` function that returns a currying function that can be used as callback for
reducing store in event handlers. For example, this:

```js
// ... events namespace initialiation
  .on('loadSuccess', (items) => {
    reduce((state) => {
      return { ...state, list: { ...state.list, items } };
    });
  });
```
turns to this:

```js
import update from 'update-js/fp';

// ... events namespace initialiation
  .on('loadSuccess', (items) => {
    reduce(update('list.items', items));
  });
```

The profit from `update-js/fp` usage increases as complexity of store grows.

## License

MIT
