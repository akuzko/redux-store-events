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

    describe('#init', function() {
      it('initializes events and uses setup function that yield "on" and "reduce" functions', function() {
        events('tests').init({ foo: 1 }, (on, reduce) => {
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

    describe('#setup', function() {
      it('passes "on" and "reduce" methods to setup function', function() {
        events('tests').setup((on, reduce) => {
          on('test2', () => {
            reduce(() => ({ foo: 3 }));
          });
        });

        const store = events(createStore);

        events('tests').test2();
        expect(store.getState()).toEqual({ tests: { foo: 3 } });
      });
    });

    describe('#on', function() {
      it('can be chained', function() {
        events('tests')
          .init({})
          .on('foo', function() {
            this.reduce(() => ({ value: 'foo' }));
          })
          .on('bar', function() {
            this.reduce(() => ({ value: 'bar' }));
          });

        const store = events(createStore);

        events('tests').bar();
        expect(store.getState()).toEqual({ tests: { value: 'bar' } });
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

  describe('binding data object', function() {
    context('using setup function', function() {
      beforeEach(function() {
        events('tests').init({ foo: 1 }, (on, reduce, evs) => {
          on('test', () => {
            reduce(() => ({ foo: evs.foo }));
          });
        });
      });

      it('binds data to events', function() {
        events(createStore);

        events('tests').test();
        expect(events('tests').getState()).toEqual({ foo: undefined });
        events('tests')({ foo: 2 }).test();
        expect(events('tests').getState()).toEqual({ foo: 2 });
      });
    });

    context('using `on` handler', function() {
      beforeEach(function() {
        events('tests')
          .init({ foo: 1 })
          .on('test', function() {
            this.reduce(() => ({ foo: this.foo }));
          });
      });

      it('binds data to events', function() {
        events(createStore);

        events('tests').test();
        expect(events('tests').getState()).toEqual({ foo: undefined });
        events('tests')({ foo: 2 }).test();
        expect(events('tests').getState()).toEqual({ foo: 2 });
      });
    });

    describe('bound events caching', function() {
      beforeEach(function() {
        events('tests').init({ foo: 1 }, (on, reduce, evs) => {
          on('test', () => {
            reduce(() => ({ foo: evs.foo }));
          });
        });
      });

      it('caches last bound events for same data object', function() {
        events(createStore);

        const evsFoo1 = events('tests')({ foo: 2 });
        const evsFoo2 = events('tests')({ foo: 2 });
        expect(evsFoo1).toBe(evsFoo2);
        const evsFoo3 = events('tests')({ foo: 3 });
        expect(evsFoo1).toNotBe(evsFoo3);
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
