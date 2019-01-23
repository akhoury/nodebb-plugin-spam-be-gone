'use strict';

var Meta = require.main.require('./src/meta');
var async = require.main.require('async');
var winston = require.main.require('winston');
var Plugin = require('../library');

module.exports = {
	name: 'Enable StopForumSpam by default without api key',
	timestamp: Date.UTC(2019, 0, 21),
	method: function (callback) {
		Meta.settings.get(Plugin.nbbId, function (err, settings) {
			if (err) {
				return callback(err);
			}
			if (!settings) {
				settings = {};
			}
			if (settings.stopforumspamEnabled !== 'on') {
				settings.stopforumspamEnabled = 'on';
				Meta.settings.set(Plugin.nbbId, settings, function (err) {
					callback(err);
				});
			} else {
				callback();
			}
		});
	}
};