var	Akismet = require('akismet'),
    Honeypot = require('project-honeypot'),
    pluginData = require('./plugin.json'),
    winston = module.parent.require('winston'),
    Meta = module.parent.require('./meta'),
    akismet, honeypot, Plugin = {};

pluginData.nbbId = pluginData.id.replace(/nodebb-plugin-/, '');

Plugin.load = function(app, middleware, controllers) {

    var render = function(req, res, next) {
        res.render('admin/plugins/' + pluginData.nbbId, pluginData || {});
    };

    Meta.settings.get(pluginData.nbbId, function(err, settings) {
        if (!err && settings) {
            if (settings.akismetEnabled === 'on') {
                if (settings.akismetApiKey) {
                    akismet = Akismet(settings.akismetApiKey);
                    akismet.verifyKey(function(err, verified) {
                        if (!verified) {
                            winston.error('[plugins/' + pluginData.nbbId + '] Unable to verify Akismet API key.');
                            akismet = null;
                        }
                    });
                } else {
                    winston.error('[plugins/' + pluginData.nbbId + '] Akismet API Key not set!');
                }
            }

            if (settings.honeypotEnabled === 'on') {
                if (settings.honeypotApiKey) {
                    honeypot = Honeypot(settings.honeypotApiKey)
                } else {
                    winston.error('[plugins/' + pluginData.nbbId + '] Honeypot API Key not set!');
                }
            }

        } else {
            winston.warn('[plugins/' + pluginData.nbbId + '] Settings not set or could not be retrived!');
        }
    });

    app.get('/admin/plugins/' + pluginData.nbbId, middleware.admin.buildHeader, render);
    app.get('/api/admin/plugins/' + pluginData.nbbId, render);
};


Plugin.checkPost = function(data, callback) {

    // http://akismet.com/development/api/#comment-check
    if (akismet && data.req) {
        akismet.checkSpam({
            user_ip: data.req.ip ,
            user_agent: data.req.get('User-Agent'),
            blog: data.req.host,
            comment_content: data.content,
            comment_author: data.username
        }, function(err, spam) {
            if (err) {
                winston.error(err);
            }

            if(spam)  {
                callback(new Error('Post content was flagged as spam.'), content);
            } else {
                callback(null, content);
            }
        });
    } else {
        callback(null, content);
    }
};

Plugin.checkUser = function(userData, callback) {
    if (honeypot && userData.ip) {
        honeypot.query(userData.ip, function (err, results) {
            if (err) {
                winston.error(err);
                callback(null, userData);
            } else {
                if (results && results.found && results.type) {
                    if (results.type.spammer || results.type.suspicious) {
                        callback(new Error('User was detected as ' +  (results.type.spammer ? 'spammer' : 'suspicious')), userData);
                    } else {
                        callback(null, userData);
                    }
                } else {
                    winston.warn('User @ ' + userData.ip + ' not found in Honeypot database');
                    callback(null, userData);
                }
            }
        });
    } else {
        callback(null, userData);
    }
};

Plugin.admin = {
    menu: function(custom_header, callback) {
        custom_header.plugins.push({
            "route": '/plugins/' + pluginData.nbbId,
            "icon": pluginData.faIcon,
            "name": pluginData.name
        });

        callback(null, custom_header);
    }
};

module.exports = Plugin;