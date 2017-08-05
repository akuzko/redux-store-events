import events from '../src';
import expect from 'expect';

describe('events', function() {
  it('initializes without error', function() {
    expect(function() {
      events('tests')
        .init({})
        .on('test', function(){});
    }).toNotThrow();
  });
});
