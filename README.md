redux-store-events
==================

A simple, minimalistic and flexible way to organize redux logic

## Installation

```
npm install --save redux-store-events
```

## Usage

### 1. Define Events Namespace

Basic setup for most common CRUD actions may look like this:

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
      this.reduce((state) => {
        return update.push(state, 'items', response.data);
      });
    });
  })
  .on('update', (item) => {
    return put(`/items/${item.id}`, { item }).then((response) => {
      this.reduce((state) => {
        return update(state, `items.{id:${item.id}}`, response.data);
      });
    });
  })
  .on('toggleActive', (itemId) => {
    return put(`/items/${item.id}/toggle`).then(() => {
      this.reduce((state) => {
        return update.with(state, `items.{id:${item.id}}.active`, (active) => !active);
      });
    });
  })
  .on('destroy', (itemId) => {
    return destroy(`/items/${itemId}`).then(() => {
      this.reduce((state) => {
        return update.remove(state, `items.{id:${itemId}}`);
      });
    });
  });
```

### 2. Add an index file to import all events

// app/events/all.js
import './todos';
// ... import all other event namespaces

### 3. Create Store

// you application entry component
import { createStore } from 'redux';
import events from 'redux-store-events';

import 'app/events/all';

const store = events(createStore);

### 4. Use `events` Anywhere

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

  // callback for toggle button
  toggleTodo(todoId) {
    todoEvents.toggle(todoId);
  }

  // rest of definitions
}

export default connect(mapStateToProps)(Todos);
```

Note that `mapDispatchToProps` is obsolete if you use `redux-store-events`;

## Tips and Hints

### `export` and `import` your event namespaces

When defining event namespace, you can export it immediately to import where it used:

```js
// events/todos.js
export default events('todos')
  .init(initialState)
  .on('load', () => {
    // load events
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

## License

MIT
