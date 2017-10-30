import { createStore } from 'redux';
import events, { getState } from '../src';
import expect, { createSpy } from 'expect';

describe('events', function() {
  afterEach(function() {
    events.clear();
  });

  describe('usage', function() {
    beforeEach(function() {
      events('tests')
        .init({ foo: 1 })
        .on('test', function() {
          this.reduce(() => ({ foo: 2 }));
        });
    });

    it('attaches to store and passes initial state on initialization', function() {
      const store = events(createStore);

      expect(store.getState()).toEqual({ tests: { foo: 1 } });
    });

    it('reduces store according to handler', function() {
      const store = events(createStore);

      events('tests').test();

      expect(store.getState()).toEqual({ tests: { foo: 2 } });
    });

    it('throws error if already attached to store on initialization', function() {
      events(createStore);

      expect(function() {
        events(createStore);
      }).toThrow('store is already created');
    });

    describe('#setup', function() {
      it('passes events object and reducer method to setup function', function() {
        events('tests').setup((tests, reduce) => {
          tests.on('test2', () => {
            reduce(() => ({ foo: 3 }));
          });
        });

        const store = events(createStore);

        events('tests').test2();
        expect(store.getState()).toEqual({ tests: { foo: 3 } });
      });

      it('initializes events and uses setup function that yield "on" and "reduce" functions', function() {
        events('tests').setup({ foo: 1 }, (on, reduce) => {
          on('test2', () => {
            reduce(() => ({ foo: 3 }));
          });
        });

        const store = events(createStore);

        expect(store.getState()).toEqual({ tests: { foo: 1 } });
        events('tests').test2();
        expect(store.getState()).toEqual({ tests: { foo: 3 } });
      });
    });

    describe('#trigger', function() {
      it('calls corresponding event handler', function() {
        const spy = createSpy();

        events('tests').on('test', spy);
        events('tests').trigger('test', 'foo');
        expect(spy).toHaveBeenCalledWith('foo');
      });
    });
  });

  describe('advanced usage', function() {
    beforeEach(function() {
      const root = events('root');

      root('foo')
        .init({ value: 5 })
        .on('test', function() {
          this.reduce(() => ({ value: 6 }));
        });

      root('bar')
        .init({ value: 7 })
        .on('test', function() {
          this.reduce(() => ({ value: 8 }));
        });
    });

    it('initializes nested namespaces', function() {
      const store = events(createStore);

      expect(store.getState()).toEqual({
        root: {
          foo: { value: 5 },
          bar: { value: 7 }
        }
      });
    });

    it('reduces actions of nested namespaces correctly', function() {
      const store = events(createStore);

      events('root')('foo').test();

      expect(store.getState()).toEqual({
        root: {
          foo: { value: 6 },
          bar: { value: 7 }
        }
      });
    });
  });

  describe('mixins', function() {
    beforeEach(function() {
      events('tests')
        .init({})
        .use(Mixin, 'foo');

      function Mixin(events, foo) {
        events.on('mixinEvent', function() {
          this.reduce(() => ({ foo: foo }));
        });
      }
    });

    it('applies mixin to events', function() {
      const store = events(createStore);
      events('tests').mixinEvent();
      expect(store.getState()).toEqual({ tests: { foo: 'foo' } });
    });
  });

  describe('getState', function() {
    context('when store is not yet initialized', function() {
      it('throws an exception', function() {
        expect(function() {
          getState();
        }).toThrow('redux store is not initialized');
      });
    });

    context('when store is initialized', function() {
      beforeEach(function() {
        events('tests').init({ foo: 'bar' });
      });

      it('returns redux store\'s state', function() {
        events(createStore);
        
        expect(getState()).toEqual({ tests: { foo: 'bar' } });
      });

      describe('events#getState', function() {
        it('returns redux store object defined under namespace', function() {
          events(createStore);

          expect(events('tests').getState()).toEqual({ foo: 'bar' });
        });
      });
    });
  });
});
