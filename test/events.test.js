import { createStore } from 'redux';
import events from '../src';
import expect, { createSpy } from 'expect';

describe('events', function() {
  afterEach(function() {
    events.detach();
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
});
