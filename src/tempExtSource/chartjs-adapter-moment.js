// This is a temporary solution, until an ES6 module version is available for the chartjs-adapter-moment NPM package.
// Downloaded from https://github.com/chartjs/chartjs-adapter-moment/blob/master/src/index.js

'use strict';

import moment from 'moment';
// import { _adapters } from 'chart.js';
const _adapters = window.Chart._adapters;

const FORMATS = {
        datetime: 'MMM D, YYYY, h:mm:ss a',
        millisecond: 'h:mm:ss.SSS a',
        second: 'h:mm:ss a',
        minute: 'h:mm a',
        hour: 'hA',
        day: 'MMM D',
        week: 'll',
        month: 'MMM YYYY',
        quarter: '[Q]Q - YYYY',
        year: 'YYYY'
};

_adapters._date.override(typeof moment === 'function' ? {
        _id: 'moment', // DEBUG ONLY

        formats: function() {
                return FORMATS;
        },

        parse: function(value, format) {
                if (typeof value === 'string' && typeof format === 'string') {
                        value = moment(value, format);
                } else if (!(value instanceof moment)) {
                        value = moment(value);
                }
                return value.isValid() ? value.valueOf() : null;
        },

        format: function(time, format) {
                return moment(time).format(format);
        },

        add: function(time, amount, unit) {
                return moment(time).add(amount, unit).valueOf();
        },

        diff: function(max, min, unit) {
                return moment(max).diff(moment(min), unit);
        },

        startOf: function(time, unit, weekday) {
                time = moment(time);
                if (unit === 'isoWeek') {
                        return time.isoWeekday(weekday).valueOf();
                }
                return time.startOf(unit).valueOf();
        },

        endOf: function(time, unit) {
                return moment(time).endOf(unit).valueOf();
        }
} : {});
