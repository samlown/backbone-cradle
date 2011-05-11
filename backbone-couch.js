// Provides a `Backbone.sync` or `Model.sync` method for the server-side
// context. Uses CouchDB for model persistence.
var _ = require('underscore')._,
    Backbone = require('backbone'),
    Couch = require('./couch');

module.exports = function(config) {
    var db = new Couch(config);

    // Helper function to get a URL from a Model or Collection as a property
    // or as a function.
    var getUrl = function(object) {
        if (object.url instanceof Function) {
            return object.url();
        } else if (typeof object.url === 'string') {
            return object.url;
        }
    };

    // Set up database, populate with design documents.
    var install = function(callback) {
        db.dbDel(function() {
            db.dbPut(function(err) {
                if (err) return callback(err);
                db.putDesignDocs([__dirname + '/base.json'], callback);
            })
        });
    };

    // Prepare model for saving / deleting.
    var toJSON = function(model){
        var doc = model.toJSON();
        doc._id = getUrl(model);
        return doc;
    }

    // Backbone sync method.
    var sync = function(method, model, success, error) {
        switch (method) {
        case 'read':
            if (model.id) {
                db.get(getUrl(model), function(err, doc) {
                    err ? error('No results') : success(doc);
                });
            } else {
                db.view('_design/base/_view/all', {
                    limit: 10,
                    include_docs: true
                }, function(err, res) {
                    if (err || !res.rows.length) return error('No results');
                    data = [];
                    _.each(res.rows, function(val) {
                        data.push(val.doc);
                    });
                    success(data);
                });
            }
            break;
        case 'create':
            db.put(toJSON(model), function(err, res) {
                if (err) return error(err.reason);
                success({'_rev': res.rev});
            });
            break;
        case 'update':
            db.put(toJSON(model), function(err, res) {
                if (err) return error(err.reason);
                success({'_rev': res.rev});
            });
            break;
        case 'delete':
            db.del(toJSON(model), function(err, res) {
                err ? error(err) : success(res);
            })
            break;
        }
    };

    return {
        db: db,
        install: install,
        sync: sync
    };
};
