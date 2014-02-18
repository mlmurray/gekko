// helpers
var _ = require('lodash');
var Util = require('util');
var log = require('../core/log.js');

var config = require('../core/util.js').getConfig();
var settings = config.DEMA;

// required indicators
var DEMA = require('./indicators/DEMA.js');

var TradingMethod = function() {
  _.bindAll(this);

  this.trend = {
    direction: 'undefined',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.historySize = config.tradingAdvisor.historySize;
  this.dema = new DEMA(settings);
}

// teach our trading method events
var Util = require('util');
var EventEmitter = require('events').EventEmitter;
Util.inherits(TradingMethod, EventEmitter);

TradingMethod.prototype.update = function(candle) {
  var price = candle.c;

  this.lastPrice = price;
  this.dema.update(price);

  if(this.dema.short.age < this.historySize)
    return;

  this.log();
  this.calculateAdvice();
}

// for debugging purposes: log the last calculated
// EMAs and diff.
TradingMethod.prototype.log = function() {
  log.debug('calculated DEMA properties for candle:');
  log.debug('\t', 'long ema:', this.dema.long.result.toFixed(8));
  log.debug('\t', 'short ema:', this.dema.short.result.toFixed(8));
  log.debug('\t diff:', this.dema.result.toFixed(5));
  log.debug('\t DEMA age:', this.dema.short.age, 'candles');
}

TradingMethod.prototype.calculateAdvice = function() {
  var diff = this.dema.result;
  var price = this.lastPrice;

  var message = '@ ' + price.toFixed(8) + ' (' + diff.toFixed(5) + ')';


  if (!settings.tradeOnStart && this.trend.direction === 'undefined' ) {
    // We just started the program and we don't have a trend, so set it and wait until next time.
    if (diff > settings.thresholds.up)
      this.trend.direction = 'up';
    else
      this.trend.direction = 'down';
    this.advice(); 
  } else if(diff > settings.thresholds.up) {

    // new trend detected
    if(this.trend.direction !== 'up')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'up',
        adviced: false
      };

    this.trend.duration++;

    log.debug('In uptrend since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('long');
    } else
      this.advice();
    
  } else if(diff < settings.thresholds.down) {

    // new trend detected
    if(this.trend.direction !== 'down')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'down',
        adviced: false
      };

    this.trend.duration++;

    log.debug('In downtrend since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= settings.thresholds.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('short');
    } else
      this.advice();


  } else {

    log.debug('In no trend');

    // we're not in an up nor in a downtrend
    // but for now we ignore sideways trends
    // 
    // read more @link:
    // 
    // https://github.com/askmike/gekko/issues/171

    // this.trend = {
    //   direction: 'none',
    //   duration: 0,
    //   persisted: false,
    //   adviced: false
    // };

    this.advice();
  }
}

TradingMethod.prototype.advice = function(newPosition) {
  if(!newPosition)
    return this.emit('soft advice');

  this.emit('advice', {
    recommandation: newPosition,
    portfolio: 1
  });
}

module.exports = TradingMethod;
