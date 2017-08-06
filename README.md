redux-store-events
==================

Simple, minimalistic and flexible way to organize redux logic

## Installation

```
npm install --save redux-store-events
```

## Usage

### 1. Define events namespace

Events are organizaed in namespaces. Basic setup for most common CRUD actions
may look like this:

```js
// events/todos.js

import events from 'redux-store-events';
import update from 'update-js';
import { get, post, put, destroy } from 'your-requests-lib';

const initialState = {
  loading: false,
  items: []
};

events('todos')
  .init(initialState)
  .on('load', () => {
    this.reduce(state => ({ ...state, loading: true }));

    return get('/todos').then((response) => {
      // since this is async callback, the scope of 'load' event is lost at this point,
      // and 'loadSuccess' is used to identify a dispatched action. this is used purely
      // for clarity, the code will still work without explicitly named action.
      this.reduce('loadSuccess', (state) => {
        return { loading: false, items: response.data };
      });
    });
  })
  .on('create', (item) => {
    return post('/items', { item }).then((response) => {
      this.reduce('createSuccess', (state) => {
        return update.push(state, 'items', response.data);
      });
    });
  })
  .on('update', (item) => {
    return put(`/items/${item.id}`, { item }).then((response) => {
      this.reduce('updateSuccess', (state) => {
        return update(state, `items.{id:${item.id}}`, response.data);
      });
    });
  })
  .on('destroy', (itemId) => {
    return destroy(`/items/${itemId}`).then(() => {
      this.reduce('destroySuccess', (state) => {
        return update.remove(state, `items.{id:${itemId}}`);
      });
    });
  });
```

**NOTE:** since event handler uses `this.reduce` call to reduce store, handler has to
be a function with no bounded context (this also means no implicitly bounded context
via transpilers that replace `this` with `_this` that references to context). To overcome
this limitation if you need to bind a context, you may do something like this:

```js
const reduce = events('todos').reduce;
events('todos')
  .on('load', () => {
    reduce(state => ({ ...state, loading: true }));
    // ....
  });
```

### 2. Add an index file to import all events

```js
// app/events/all.js

import './todos';
// ... import all other event namespaces
```

### 3. Create store with attached events

```js
// you application entry component

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

const todoEvents = events('todos');

function mapStateToProps(state) {
  return state.todos;
}

class Todos extends PureComponent {
  componentDidMount() {
    todoEvents.load();
  }

  // callback on form submit
  submitNewTodo(todo) {
    todoEvents.create(todo);
  }

  // callback for toggle 'Active' button
  toggleTodo(todoId) {
    todoEvents.toggleActive(todoId);
  }

  // rest of definitions
}

export default connect(mapStateToProps)(Todos);
```

Note that `mapDispatchToProps` is obsolete if you use `redux-store-events`;

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

## Tips and Hints

### `export` and `import` your event namespaces

When defining event namespace, you can export it immediately to import where it used:

```js
// events/todos.js
export default events('todos')
  .init(initialState)
  .on('load', () => {
    // handle load event
  })
  // the rest of handler definitions

// components/Todos.jsx
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
events('todos')
  .init({ loading: false, list: { items: [], query: {} } })
  .on('loadSuccess', (items) => {
    this.reduce((state) => {
      return { ...state, list: { ...state.list, items } };
    });
  });
```
turns to this:

```js
import update from 'update-js/fp';

events('todos')
  .init({ loading: false, list: { items: [], query: {} } })
  .on('loadSuccess', (items) => {
    this.reduce(update('list.items', items));
  });
```

The profit from `update-js/fp` usage increases as complexity of store grows.

## License

MIT
