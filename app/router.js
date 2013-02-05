//  router.js
//  Directus 6.0

//  (c) RANGER
//  Directus may be freely distributed under the GNU license.
//  For all details and documentation:
//  http://www.getdirectus.com

define([
  "app",
  "core/directus",
  "core/tabs",
  "ui/ui",
  "modules/activity",
  "modules/table",
  "modules/settings",
  "modules/media",
  "modules/users",
  "modules/messages",
  "core/modal",
  "core/collection.settings",
  "core/collection.upload"
],

function(app, Directus, Tabs, UI, Activity, Table, Settings, Media, Users, Messages, Modal, CollectionSettings, CollectionMedia) {

  var Router = Backbone.Router.extend({

    routes: {
      "":                       "index",
      "tables":                 "tables",
      "tables/:name":           "entries",
      "tables/:name/:id":       "entry",
      "activity":               "activity",
      "media":                  "media",
      "users":                  "users",
      "users/:id":              "users",
      "settings":               "settings",
      "settings/:name":         "settings",
      "settings/tables/:table": "settingsTable",
      "messages":               "messages"
    },

    go: function() {
      var array = _.isArray(arguments[0]) ? arguments[0] : _.toArray(arguments);
      return this.navigate(array.join("/"), true);
    },

    setTitle: function(title) {
      document.title = title;
    },

    showAlert: function(message) {
      if (!this.alert) {
        this.alert = new Backbone.Layout({template: 'alert', serialize: {message: message}});
        this.v.messages.insertView(this.alert).render();
      }
    },

    hideAlert: function() {
      if (this.alert) {
        this.alert.remove();
        this.alert = undefined;
      }
    },

    openModal: function(view, options) {
      options.view = view;
      var modal = new Directus.Modal(options);
      this.v.messages.insertView(modal).render();
      return modal;
    },

    setPage: function(view, options) {
      options.ui = UI;
      this.v.main.setView('#content', new view(options)).render();
    },

    tables: function() {
      this.setTitle('Tables');
      this.tabs.setActive('tables');
      this.v.main.setView('#content', new Table.Views.Tables({collection: app.tables}));
      this.v.main.render();
    },

    entries: function(tableName) {
      this.setTitle('Tables');
      if (app.entries[tableName].table.get('single')) {
        this.entry(tableName, 1);
        return;
      }
      this.tabs.setActive('tables');
      this.v.main.setView('#content', new Table.Views.List({collection: app.entries[tableName]}));
      this.v.main.render();
    },

    entry: function(tableName, id) {
      this.setTitle('Tables');
      this.tabs.setActive('tables');
      var collection = app.entries[tableName];
      var model;

      if (id === "new") {
        model = new collection.model({},{collection: collection});

      } else {
        model = collection.get(id);
        if (model === undefined) {
          model = new collection.model({id: id}, {collection: collection});
        }
      }

      this.v.main.setView('#content', new Table.Views.Edit({model: model}));
      this.v.main.render();

    },

    activity: function() {
      this.setTitle('Activity');
      this.tabs.setActive('activity');
      this.v.main.setView('#content', new Activity.Views.List({collection: app.activity}));
      this.v.main.render();
    },

    media: function() {
      this.setTitle('Media');
      this.tabs.setActive('media');
      this.v.main.setView('#content', new Media.Views.List({collection: app.media}));
      this.v.main.render();
    },

    users: function(id) {
      this.setTitle('Users');
      this.tabs.setActive('users');
      if (id !== undefined) {
        this.v.main.setView('#content', new Users.Views.Edit({model: app.users.get(id)}));
      } else {
        this.v.main.setView('#content', new Users.Views.List({collection: app.users}));
      }
      this.v.main.render();
    },

    settings: function(name) {

      this.setTitle('Settings');
      this.tabs.setActive('settings');


      switch(name) {
        case 'tables':
          this.v.main.setView('#content', new Settings.Tables({collection: app.tables}));
          break;
        case 'global':
          this.v.main.setView('#content', new Settings.Global({model: app.settings.get('media'), structure: Settings.MediaStructure}));
          break;
        case 'media':
          this.v.main.setView('#content', new Settings.Global({model: app.settings.get('media'), structure: Settings.MediaStructure}));
          break;
        case 'permissions':
          this.v.main.setView('#content', new Settings.Permissions());
          break;
        case 'system':
          this.v.main.setView('#content', new Settings.System());
          break;
        case 'about':
          this.v.main.setView('#content', new Settings.About());
          break;
        default:
          this.v.main.setView('#content', new Settings.Main({tables: app.tables}));
          break;
      }

      this.v.main.render();
    },

    settingsTable: function(tableName) {

      this.setTitle('Settings');
      this.tabs.setActive('settings');

      this.v.main.setView('#content', new Settings.Table({collection: app.columns[tableName]}));

      this.v.main.render();
    },

    messages: function(name) {
      this.setPage(Messages.Views.List, {collection: this.messages});
    },

    initialize: function(options) {

      this.tabs = new Tabs.Collection([
        {title: "Activity", id: "activity", count: app.tables.get('directus_activity').get('count')},
        {title: "Tables", id: "tables", count: app.tables.length},
        {title: "Media", id: "media", count: app.tables.get('directus_media').get('count')},
        {title: "Users", id: "users", count: app.tables.get('directus_users').get('count')},
        {title: "Settings", id: "settings"}
      ]);

      var user = app.users.get(1);

      //Top
      var Navbar = Backbone.Layout.extend(
        {
          template: "navbar",
          serialize: function() {
            return {
              user: user.get('first_name'),
              avatar: user.get('avatar'),
              siteName: this.model.get('site_name'),
              siteUrl: this.model.get('site_url')
              //settings: this.settings.get('global').toJSON()
            };
          }
      });

      //holds references to view instances
      this.v = {};
      this.v.content = undefined;

      this.v.main = new Backbone.Layout({
        el: "#main",
        //template: "main",
        views: {
          '#navbar': new Navbar({model: app.settings.get('global')}),
          '#tabs': new Tabs.View({collection: this.tabs})
        }
      });

      this.v.messages = new Backbone.Layout({
        el: "#messages"
      });

      // Update media counter
      app.media.on('all', function() {
        var media = this.tabs.get('media');
        media.set({count: this.media.length});
      }, this);

      this.v.main.render();
      //this.navigate('#tables', {trigger: true});
    }
  });

  return Router;

});