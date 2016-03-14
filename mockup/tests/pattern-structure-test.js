define([
  'expect',
  'jquery',
  'pat-registry',
  'mockup-patterns-structure',
  'mockup-patterns-structure-url/js/views/actionmenu',
  'mockup-patterns-structure-url/js/views/app',
  'mockup-patterns-structure-url/js/models/result',
  'mockup-utils',
  'sinon',
], function(expect, $, registry, Structure, ActionMenu, AppView, Result,
            utils, sinon) {
  'use strict';

  window.mocha.setup('bdd');
  $.fx.off = true;

  var dummyWindow = {};

  function getQueryVariable(url, variable) {
    var query = url.split('?')[1];
    if (query === undefined) {
      return null;
    }
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i += 1) {
      var pair = vars[i].split('=');
      if (decodeURIComponent(pair[0]) === variable) {
        return decodeURIComponent(pair[1]);
      }
    }
    return null;
  }

  var extraDataJsonItem = null;


  /* ==========================
   TEST: Per Item Action Buttons
  ========================== */
  describe('Per Item Action Buttons', function() {
    beforeEach(function() {
      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('POST', '/cut', function (xhr, id) {
        xhr.respond(200, { 'Content-Type': 'application/json' },
                    JSON.stringify({
          status: 'success',
          msg: 'cut'
        }));
      });

      this.clock = sinon.useFakeTimers();

      this.$el = $('<div id="item"></div>').appendTo('body');

      /*
        queryHelper and AppView instances for now due to the tight
        coupling that exist for the moment.  The relationship should be
        changed so that the render method don't poke into app but should
        be supplied the details on a need-to-use basis.
      */
      var queryHelper = new utils.QueryHelper({});
      this.app = new AppView({
        'queryHelper': queryHelper,

        // XXX ActionButton need this lookup directly.
        'buttons': [{'title': 'Cut', 'url': '/cut'}],

        'activeColumns': [],
        'availableColumns': [],
        'indexOptionsUrl': '',
        'setDefaultPageUrl': '',
      });
      this.app.render();
    });

    afterEach(function() {
      this.clock.restore();
      this.server.restore();
      requirejs.undef('dummytestactionmenu');
    });

    it('basic action menu rendering', function() {
      var model = new Result({
          "Title": "Dummy Object",
          "is_folderish": true,
          "review_state": "published"
      });

      var menu = new ActionMenu({
        app: this.app,
        model: model,
        header: 'Menu Header'
      });

      var el = menu.render().el;

      expect($('li.dropdown-header', el).text()).to.equal('Menu Header');
      expect($('li a', el).length).to.equal(7);
      expect($($('li a', el)[0]).text()).to.equal('Cut');

      $('.cutItem a', el).click();
      this.clock.tick(500);

      expect(this.app.$('.status').text()).to.equal('Cut "Dummy Object"');

    });

    it('custom action menu items', function() {
      var model = new Result({
          "Title": "Dummy Object",
          "is_folderish": true,
          "review_state": "published"
      });

      var menu = new ActionMenu({
        app: this.app,
        model: model,
        menuOptions: {
          'cutItem': [
            'mockup-patterns-structure-url/js/actions',
            'cutClicked',
            '#',
            'Cut',
          ],
        },
      });

      var el = menu.render().el;
      expect($('li a', el).length).to.equal(1);
      expect($($('li a', el)[0]).text()).to.equal('Cut');

      $('.cutItem a', el).click();
      this.clock.tick(500);
      expect(this.app.$('.status').text()).to.equal('Cut "Dummy Object"');

    });

    it('custom action menu items and actions.', function() {
      // Define a custom dummy "module"
      define('dummytestactionmenu', ['backbone'], function(Backbone) {
        var Actions = Backbone.Model.extend({
          initialize: function(options) {
            this.options = options;
            this.app = options.app;
          },
          foobarClicked: function(e) {
            var self = this;
            self.app.setStatus('Status: foobar clicked');
          }
        });
        return Actions;
      });
      // use it to make it available synchronously.
      require(['dummytestactionmenu'], function(){});
      this.clock.tick(500);

      var model = new Result({
          "is_folderish": true,
          "review_state": "published"
      });

      // Make use if that dummy in here.
      var menu = new ActionMenu({
        app: this.app,
        model: model,
        menuOptions: {
          'foobar': [
            'dummytestactionmenu',
            'foobarClicked',
            '#',
            'Foo Bar',
          ],
        },
      });

      var el = menu.render().el;
      expect($('li a', el).length).to.equal(1);
      expect($($('li a', el)[0]).text()).to.equal('Foo Bar');

      $('.foobar a', el).click();
      this.clock.tick(500);
      expect(this.app.$('.status').text()).to.equal('Status: foobar clicked');
    });

    it('custom action menu items and actions.', function() {
      // Define a custom dummy "module"
      define('dummytestactionmenu', ['backbone'], function(Backbone) {
        var Actions = Backbone.Model.extend({
          initialize: function(options) {
            this.options = options;
            this.app = options.app;
          },
          barbazClicked: function(e) {
            var self = this;
            self.app.setStatus('Status: barbaz clicked');
          }
        });
        return Actions;
      });
      // use it to make it available synchronously.
      require(['dummytestactionmenu'], function(){});
      this.clock.tick(500);

      var model = new Result({
          "is_folderish": true,
          "review_state": "published"
      });

      // Make use if that dummy in here.
      var menu = new ActionMenu({
        app: this.app,
        model: model,
        menuOptions: {
          'foobar': [
            'dummytestactionmenu',
            'foobarClicked',
            '#',
            'Foo Bar',
          ],
          'barbaz': [
            'dummytestactionmenu',
            'barbazClicked',
            '#',
            'Bar Baz',
          ],
        },
      });

      // Broken/missing action
      var el = menu.render().el;
      $('.foobar a', el).click();
      this.clock.tick(500);
      expect(this.app.$('.status').text().trim()).to.equal('');
    });

  });


  /* ==========================
   TEST: Structure
  ========================== */
  describe('Structure', function() {
    beforeEach(function() {
      // clear cookie setting
      $.removeCookie('__cp');
      $.removeCookie('_fc_perPage');
      $.removeCookie('_fc_activeColumns');
      $.removeCookie('_fc_activeColumnsCustom');

      var structure = {
        "vocabularyUrl": "/data.json",
        "uploadUrl": "/upload",
        "moveUrl": "/moveitem",
        "indexOptionsUrl": "/tests/json/queryStringCriteria.json",
        "contextInfoUrl": "{path}/contextInfo",
        "setDefaultPageUrl": "/setDefaultPage"
      };

      this.$el = $('<div class="pat-structure"></div>').attr(
        'data-pat-structure', JSON.stringify(structure)).appendTo('body');

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('GET', /data.json/, function (xhr, id) {
        var batch = JSON.parse(getQueryVariable(xhr.url, 'batch'));
        var start = 0;
        var end = 15;
        if (batch) {
          start = (batch.page - 1) * batch.size;
          end = start + batch.size;
        }
        var items = [];
        items.push({
          UID: '123sdfasdfFolder',
          getURL: 'http://localhost:8081/folder',
          path: '/folder',
          portal_type: 'Folder',
          Description: 'folder',
          Title: 'Folder',
          'review_state': 'published',
          'is_folderish': true,
          Subject: [],
          id: 'folder'
        });
        for (var i = start; i < end; i = i + 1) {
          items.push({
            UID: '123sdfasdf' + i,
            getURL: 'http://localhost:8081/item' + i,
            path: '/item' + i,
            portal_type: 'Document ' + i,
            Description: 'document',
            Title: 'Document ' + i,
            'review_state': 'published',
            'is_folderish': false,
            Subject: [],
            id: 'item' + i
          });
        }

        if (extraDataJsonItem) {
          items.push(extraDataJsonItem);
        }

        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          total: 100,
          results: items
        }));
      });
      this.server.respondWith('POST', '/rearrange', function (xhr, id) {
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          status: 'success',
          msg: 'rearranged'
        }));
      });
      this.server.respondWith('POST', '/paste', function (xhr, id) {
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          status: 'success',
          msg: 'pasted'
        }));
      });
      this.server.respondWith('POST', '/moveitem', function (xhr, id) {
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          status: 'success',
          msg: 'moved ' + xhr.requestBody
        }));
      });
      this.server.respondWith('POST', '/setDefaultPage', function (xhr, id) {
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          status: 'success',
          msg: 'defaulted'
        }));
      });
      this.server.respondWith('GET', /contextInfo/, function (xhr, id) {
        var data = {
          addButtons: [{
            id: 'document',
            title: 'Document',
            url: '/adddocument'
          },{
            id: 'folder',
            title: 'Folder'
          }],
        };
        if (xhr.url.indexOf('folder') !== -1){
          data.object = {
            UID: '123sdfasdfFolder',
            getURL: 'http://localhost:8081/folder',
            path: '/folder',
            portal_type: 'Folder',
            Description: 'folder',
            Title: 'Folder',
            'review_state': 'published',
            'is_folderish': true,
            Subject: [],
            id: 'folder'
          };
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(data));
      });

      this.clock = sinon.useFakeTimers();

      sinon.stub(utils, 'getWindow', function() {
        return dummyWindow;
      });
    });

    afterEach(function() {
      extraDataJsonItem = null;
      this.server.restore();
      this.clock.restore();
      $('body').html('');
      utils.getWindow.restore();
    });

    it('initialize', function() {
      registry.scan(this.$el);
      // moveUrl provided, can get to this via order-support.
      expect(this.$el.find('.order-support > table').size()).to.equal(1);
    });

    it('select item populates selection well', function() {
      registry.scan(this.$el);
      this.clock.tick(500);
      var cb = this.$el.find('.itemRow td.selection input').eq(0);
      cb[0].checked = true;
      cb.trigger('change');
      this.clock.tick(500);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('1');
      var selectedItems = $('.popover-content .selected-item', this.$el);
      expect($(selectedItems[0]).text()).to.contain('Folder');
    });

    it('test selection well label', function() {
      extraDataJsonItem = {
        UID: 'XSS" data-xss="bobby',
        getURL: 'http://localhost:8081/xss',
        path: '/xss',
        portal_type: 'Folder',
        Description: 'XSS test item',
        Title: "<script>alert('XSS');window.foo=1;</script>",
        'review_state': 'published',
        'is_folderish': true,
        Subject: [],
        id: 'xss'
      };
      registry.scan(this.$el);
      this.clock.tick(500);
      // it's overloaded, pattern doesn't actually enforce batch limits.
      var cb = this.$el.find('.itemRow td.selection input').eq(16);
      cb[0].checked = true;
      cb.trigger('change');
      this.clock.tick(500);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('1');

      // XSS happened.
      expect(window.foo).not.equal(1);
      expect($('.popover-content .selected-item a', this.$el).eq(0).data().xss
        ).not.equal('bobby');
      var selectedItems = $('.popover-content .selected-item', this.$el);
      expect($(selectedItems[0]).text()).to.contain(
        "<script>alert('XSS');window.foo=1;</script>");
    });

    it('remove item from selection well', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item1 = this.$el.find('.itemRow td.selection input').eq(0);
      $item1[0].checked = true;
      $item1.trigger('change');
      this.$el.find('.items.popover-content a.remove').trigger('click').trigger('change');
      expect(this.$el.find('#btn-selected-items').html()).to.contain('0');
    });

    it('remove all from selection well', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item1 = this.$el.find('.itemRow td.selection input').eq(0);
      $item1[0].checked = true;
      $item1.trigger('change');
      this.clock.tick(1000);
      var $item2 = this.$el.find('.itemRow td.selection input').eq(1);
      $item2[0].checked = true;
      $item2.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('2');
      this.$el.find('.popover.selected-items a.remove-all').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('0');
    });

    it('paging', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      // click next page
      var page1Btn = this.$el.find('.pagination li.active a');
      page1Btn.parent().next().find('a').trigger('click');
      this.clock.tick(1000);
      expect(page1Btn.html()).not.to.contain(this.$el.find('.pagination li.active a').eq('0').html());
      expect(this.$el.find('.pagination li.active a').eq('0').html()).to.contain('2');
    });

    it('per page', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      this.$el.find('.serverhowmany15 a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.itemRow').length).to.equal(16);
      this.$el.find('.serverhowmany30 a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.itemRow').length).to.equal(31);
    });

    it('test paging does not apply overflow hidden to parent', function() {
      /*
       * very odd here, overflow hidden is getting applied by something after
       * the table of results is re-rendered with new data
       */
      registry.scan(this.$el);
      this.clock.tick(1000);
      // click next page
      var page1Btn = this.$el.find('.pagination li.active a');
      page1Btn.parent().next().find('a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.css('overflow')).to.not.equal('hidden');
    });

    it.skip('test rearrange button', function() {
      /* test not working in firefox */
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $popover = this.$el.find('.popover.rearrange');
      this.$el.find('#btn-rearrange').trigger('click');
      expect($popover.hasClass('active')).to.equal(true);
      $popover.find('button').trigger('click');
      this.clock.tick(1000);
      expect($popover.hasClass('active')).to.equal(false);
      expect(this.$el.find('.order-support .status').html()).to.contain('rearrange');
    });

    it('test select all', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item = this.$el.find('table th .select-all');
      $item[0].checked = true;
      $item.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('16');

    });

    it('test unselect all', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item = this.$el.find('table th .select-all');
      $item[0].checked = true;
      $item.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('16');
      $item[0].checked = false;
      $item.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('0');
    });

    it('test current folder buttons do not show on root', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      expect(this.$el.find('.context-buttons').length).to.equal(0);
    });

    it('test current folder buttons do show on subfolder', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item = this.$el.find('.itemRow').eq(0);
      $('.title a', $item).trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.context-buttons').length).to.equal(1);
    });

    it('test select current folder', function() {
      registry.scan(this.$el);
      var pattern = this.$el.data('patternStructure');
      this.clock.tick(1000);
      var $item = this.$el.find('.itemRow').eq(0);
      $('.title a', $item).trigger('click');
      this.clock.tick(1000);
      var $checkbox = $('.fc-breadcrumbs-container input[type="checkbox"]', this.$el);
      $checkbox[0].checked = true;
      $checkbox.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('1');
    });

    it('test select displayed columns', function() {
      registry.scan(this.$el);
      this.clock.tick(500);
      var $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(6);
      expect($row.find('th').eq(1).text()).to.equal('Title');
      expect($row.find('th').eq(2).text()).to.equal('Last modified');
      expect($row.find('th').eq(3).text()).to.equal('Published');
      expect($row.find('th').eq(4).text()).to.equal('Review state');
      expect($row.find('th').eq(5).text()).to.equal('Actions');

      expect($.cookie('_fc_activeColumns')).to.be(undefined);

      this.$el.find('#btn-attribute-columns').trigger('click');
      this.clock.tick(500);

      var $checkbox = this.$el.find(
          '.attribute-columns input[value="getObjSize"]');
      $checkbox[0].checked = true;
      $checkbox.trigger('change');
      this.clock.tick(500);

      var $popover = this.$el.find('.popover.attribute-columns');
      expect($popover.find('button').text()).to.equal('Save');
      $popover.find('button').trigger('click');
      this.clock.tick(500);

      $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(7);
      expect($row.find('th').eq(5).text()).to.equal('Object Size');
      expect($row.find('th').eq(6).text()).to.equal('Actions');
      expect($.parseJSON($.cookie('_fc_activeColumns')).value).to.eql(
          ["ModificationDate", "EffectiveDate", "review_state", "getObjSize"]);

      $checkbox[0].checked = false;
      $checkbox.trigger('change');
      $popover.find('button').trigger('click');
      this.clock.tick(500);

      $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(6);
      expect($.parseJSON($.cookie('_fc_activeColumns')).value).to.eql(
          ["ModificationDate", "EffectiveDate", "review_state"]);

    });

    it('test main buttons count', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var buttons = this.$el.find('#btngroup-mainbuttons a');
      expect(buttons.length).to.equal(8);
    });

    it('test itemRow default actionmenu folder', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      // folder
      var folder = this.$el.find('.itemRow').eq(0);
      expect(folder.data().id).to.equal('folder');
      expect($('.actionmenu ul li a', folder).length).to.equal(6);
      // no pasting (see next test
      expect($('.actionmenu ul li.pasteItem', folder).length).to.equal(0);
      // no set default page
      expect($('.actionmenu ul li.set-default-page a', folder).length
        ).to.equal(0);
      // can select all
      expect($('.actionmenu ul li.selectAll', folder).text()).to.equal(
        'Select all contained items');
    });

    it('test itemRow default actionmenu item', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);

      var item = this.$el.find('.itemRow').eq(10);
      expect(item.data().id).to.equal('item9');
      expect($('.actionmenu ul li a', item).length).to.equal(6);
      // cannot select all
      expect($('.actionmenu ul li.selectAll a', item).length).to.equal(0);
      // can set default page
      expect($('.actionmenu ul li.set-default-page', item).text()).to.equal(
        'Set as default page');
      $('.actionmenu ul li.set-default-page a', item).click();
      this.clock.tick(1000);
      expect(this.$el.find('.order-support .status').html()).to.contain(
        'defaulted');
    });

    it('test itemRow actionmenu paste click', function() {
      // item pending to be pasted
      $.cookie('__cp', 'dummy');
      this.clock.tick(1000);
      registry.scan(this.$el);
      this.clock.tick(1000);
      // top item
      var item0 = this.$el.find('.itemRow').eq(0);
      expect(item0.data().id).to.equal('folder');
      expect($('.actionmenu ul li a', item0).length).to.equal(7);
      expect($('.actionmenu ul li.pasteItem', item0).text()).to.equal('Paste');
      $('.actionmenu ul li.pasteItem a', item0).click();
      this.clock.tick(1000);
      expect(this.$el.find('.order-support .status').html()).to.contain(
        'Pasted into "Folder"');
    });

    it('test itemRow actionmenu move-top click', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      // top item
      var item0 = this.$el.find('.itemRow').eq(0);
      expect(item0.data().id).to.equal('folder');
      var item10 = this.$el.find('.itemRow').eq(10);
      expect(item10.data().id).to.equal('item9');

      expect($('.actionmenu ul li.move-top', item10).text()).to.equal(
        'Move to top of folder');
      $('.actionmenu ul li.move-top a', item10).trigger('click');
      this.clock.tick(1000);

      expect(this.$el.find('.order-support .status').html()).to.contain(
        'moved');
      expect(this.$el.find('.order-support .status').html()).to.contain(
        'delta=top');
      expect(this.$el.find('.order-support .status').html()).to.contain(
        'id=item9');
      // No items actually moved, this is to be implemented server-side.
    });

    it('test navigate to item', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var pattern = this.$el.data('patternStructure');
      var item = this.$el.find('.itemRow').eq(10);
      expect(item.data().id).to.equal('item9');
      $('.title a.manage', item).trigger('click');
      this.clock.tick(1000);
      expect(dummyWindow.location).to.equal('http://localhost:8081/item9/view');

      $('.actionmenu ul li.editItem a', item).trigger('click');
      this.clock.tick(1000);
      expect(dummyWindow.location).to.equal('http://localhost:8081/item9/edit');
    });

  });

  /* ==========================
   TEST: Structure Customized
  ========================== */
  describe('Structure Customized', function() {
    beforeEach(function() {
      // clear cookie setting
      $.removeCookie('_fc_perPage');

      var structure = {
        "vocabularyUrl": "/data.json",
        "indexOptionsUrl": "/tests/json/queryStringCriteria.json",
        "contextInfoUrl": "{path}/contextInfo",
        "activeColumnsCookie": "activeColumnsCustom",
        "buttons": [{
          "url": "foo",
          "title": "Foo",
          "id": "foo",
          "icon": ""
        }]
      };

      this.$el = $('<div class="pat-structure"></div>').attr(
        'data-pat-structure', JSON.stringify(structure)).appendTo('body');

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('GET', /data.json/, function (xhr, id) {
        var batch = JSON.parse(getQueryVariable(xhr.url, 'batch'));
        var start = 0;
        var end = 15;
        if (batch) {
          start = (batch.page - 1) * batch.size;
          end = start + batch.size;
        }
        var items = [];

        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          total: 0,
          results: items
        }));
      });
      this.server.respondWith('GET', /contextInfo/, function (xhr, id) {
        var data = {
          addButtons: []
        };
        if (xhr.url.indexOf('folder') !== -1){
          data.object = {
            UID: '123sdfasdfFolder',
            getURL: 'http://localhost:8081/folder',
            path: '/folder',
            portal_type: 'Folder',
            Description: 'folder',
            Title: 'Folder',
            'review_state': 'published',
            'is_folderish': true,
            Subject: [],
            id: 'folder'
          };
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(data));
      });

      this.clock = sinon.useFakeTimers();

      sinon.stub(utils, 'getWindow', function() {
        return dummyWindow;
      });

    });

    afterEach(function() {
      this.server.restore();
      this.clock.restore();
      $('body').html('');
      utils.getWindow.restore();
    });

    it('initialize', function() {
      registry.scan(this.$el);
      // no order-support for this one due to lack of moveUrl
      expect(this.$el.find('.order-support > table').size()).to.equal(0);
    });

    it('per page', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      this.$el.find('.serverhowmany15 a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.itemRow').length).to.equal(0);
      this.$el.find('.serverhowmany30 a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.itemRow').length).to.equal(0);
    });

    it('test select all', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item = this.$el.find('table th .select-all');
      $item[0].checked = true;
      $item.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('0');

    });

    it('test unselect all', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var $item = this.$el.find('table th .select-all');
      $item[0].checked = true;
      $item.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('0');
      $item[0].checked = false;
      $item.trigger('change');
      this.clock.tick(1000);
      expect(this.$el.find('#btn-selected-items').html()).to.contain('0');
    });

    it('test select displayed columns', function() {
      registry.scan(this.$el);
      // manually setting a borrowed cookie from the previous test.
      $.cookie('_fc_activeColumns',
               '{"value":["ModificationDate","EffectiveDate","review_state",' +
               '"getObjSize"]}');
      this.clock.tick(500);
      var $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(6);
      expect($row.find('th').eq(5).text()).to.equal('Actions');

      expect($.cookie('_fc_activeColumnsCustom')).to.be(undefined);

      this.$el.find('#btn-attribute-columns').trigger('click');
      this.clock.tick(500);

      var $checkbox = this.$el.find(
          '.attribute-columns input[value="portal_type"]');
      $checkbox[0].checked = true;
      $checkbox.trigger('change');
      this.clock.tick(500);

      var $popover = this.$el.find('.popover.attribute-columns');
      expect($popover.find('button').text()).to.equal('Save');
      $popover.find('button').trigger('click');
      this.clock.tick(500);

      $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(7);
      expect($row.find('th').eq(5).text()).to.equal('Type');
      expect($row.find('th').eq(6).text()).to.equal('Actions');
      expect($.parseJSON($.cookie('_fc_activeColumnsCustom')).value).to.eql(
          ["ModificationDate", "EffectiveDate", "review_state", "portal_type"]);
      // standard cookie unchanged.
      expect($.parseJSON($.cookie('_fc_activeColumns')).value).to.eql(
          ["ModificationDate", "EffectiveDate", "review_state", "getObjSize"]);

      $checkbox[0].checked = false;
      $checkbox.trigger('change');
      $popover.find('button').trigger('click');
      this.clock.tick(500);

      $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(6);
      expect($.parseJSON($.cookie('_fc_activeColumnsCustom')).value).to.eql(
          ["ModificationDate", "EffectiveDate", "review_state"]);

    });

    it('test main buttons count', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var buttons = this.$el.find('#btngroup-mainbuttons a');
      expect(buttons.length).to.equal(1);
    });

  });


  /* ==========================
   TEST: Structure no buttons
  ========================== */
  describe('Structure no buttons', function() {
    beforeEach(function() {
      // clear cookie setting
      $.removeCookie('_fc_perPage');
      $.removeCookie('_fc_activeColumnsCustom');

      var structure = {
        "vocabularyUrl": "/data.json",
        "indexOptionsUrl": "/tests/json/queryStringCriteria.json",
        "contextInfoUrl": "{path}/contextInfo",
        "activeColumnsCookie": "activeColumnsCustom",
        "activeColumns": ["getObjSize"],
        "availableColumns": {
          "id": "ID",
          "CreationDate": "Created",
          "getObjSize": "Object Size"
        },
        "buttons": []
      };

      this.$el = $('<div class="pat-structure"></div>').attr(
        'data-pat-structure', JSON.stringify(structure)).appendTo('body');

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('GET', /data.json/, function (xhr, id) {
        var batch = JSON.parse(getQueryVariable(xhr.url, 'batch'));
        var start = 0;
        var end = 15;
        if (batch) {
          start = (batch.page - 1) * batch.size;
          end = start + batch.size;
        }
        var items = [];

        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          total: 0,
          results: items
        }));
      });
      this.server.respondWith('GET', /contextInfo/, function (xhr, id) {
        var data = {
          addButtons: []
        };
        if (xhr.url.indexOf('folder') !== -1){
          data.object = {
            UID: '123sdfasdfFolder',
            getURL: 'http://localhost:8081/folder',
            path: '/folder',
            portal_type: 'Folder',
            Description: 'folder',
            Title: 'Folder',
            'review_state': 'published',
            'is_folderish': true,
            Subject: [],
            id: 'folder'
          };
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(data));
      });

      this.clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      this.server.restore();
      this.clock.restore();
      $('body').html('');
    });

    it('test main buttons count', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var buttons = this.$el.find('#btngroup-mainbuttons a');
      expect(buttons.length).to.equal(0);
    });

    it('test select displayed columns', function() {
      registry.scan(this.$el);
      this.clock.tick(500);
      var $row = this.$el.find('table thead tr').eq(1);
      expect($row.find('th').length).to.equal(4);
      expect($row.find('th').eq(1).text()).to.equal('Title');
      expect($row.find('th').eq(2).text()).to.equal('Object Size');
      expect($row.find('th').eq(3).text()).to.equal('Actions');
    });

  });

  /* ==========================
   TEST: Structure barebone columns
  ========================== */
  describe('Structure barebone columns', function() {
    beforeEach(function() {
      // clear cookie setting
      $.removeCookie('_fc_perPage');
      $.removeCookie('_fc_activeColumnsCustom');

      var structure = {
        "vocabularyUrl": "/data.json",
        "indexOptionsUrl": "/tests/json/queryStringCriteria.json",
        "contextInfoUrl": "{path}/contextInfo",
        "activeColumnsCookie": "activeColumnsCustom",
        "activeColumns": [],
        "availableColumns": {
          "getURL": "URL",
        },
        "buttons": [],
        "attributes": [
          'Title', 'getURL'
        ]
      };

      this.$el = $('<div class="pat-structure"></div>').attr(
        'data-pat-structure', JSON.stringify(structure)).appendTo('body');

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('GET', /data.json/, function (xhr, id) {
        var batch = JSON.parse(getQueryVariable(xhr.url, 'batch'));
        var start = 0;
        var end = 15;
        if (batch) {
          start = (batch.page - 1) * batch.size;
          end = start + batch.size;
        }
        var items = [];
        items.push({
          /*
          getURL: 'http://localhost:8081/folder',
          Title: 'Folder',
          id: 'folder'
          */
          // 'portal_type', 'review_state', 'getURL'

          getURL: 'http://localhost:8081/folder',
          Title: 'Folder',
          // Other required fields.
          id: 'folder',
          UID: 'folder'
        });
        for (var i = start; i < end; i = i + 1) {
          items.push({
            /*
            getURL: 'http://localhost:8081/item' + i,
            Title: 'Document ' + i,
            */

            getURL: 'http://localhost:8081/item' + i,
            Title: 'Document ' + i,
            // Other required fields.
            id: 'item' + i,
            UID: 'item' + i
          });
        }

        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({
          total: 100,
          results: items
        }));
      });
      this.server.respondWith('GET', /contextInfo/, function (xhr, id) {
        var data = {
          addButtons: []
        };
        if (xhr.url.indexOf('folder') !== -1){
          data.object = {
            UID: '123sdfasdfFolder',
            getURL: 'http://localhost:8081/folder',
            path: '/folder',
            portal_type: 'Folder',
            Description: 'folder',
            Title: 'Folder',
            'review_state': 'published',
            'is_folderish': true,
            Subject: [],
            id: 'folder'
          };
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(data));
      });

      this.clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      this.server.restore();
      this.clock.restore();
      $('body').html('');
    });

    it('per page', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      this.$el.find('.serverhowmany15 a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.itemRow').length).to.equal(16);
      this.$el.find('.serverhowmany30 a').trigger('click');
      this.clock.tick(1000);
      expect(this.$el.find('.itemRow').length).to.equal(31);
    });

    it('test itemRow actionmenu move-top none', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      // top item
      var item = this.$el.find('.itemRow').eq(1);
      expect(item.data().id).to.equal('item0');
      // Since no moveUrl, no move-top or move-bottom.
      expect(item.find('.actionmenu .move-top a').length).to.equal(0);
      expect(item.find('.actionmenu .move-bottom a').length).to.equal(0);
    });

  });

  /* ==========================
   TEST: Structure no action buttons
  ========================== */
  describe('Structure no action buttons', function() {
    beforeEach(function() {
      // clear cookie setting
      $.removeCookie('_fc_perPage');
      $.removeCookie('_fc_activeColumnsCustom');

      var structure = {
        "vocabularyUrl": "/data.json",
        "indexOptionsUrl": "/tests/json/queryStringCriteria.json",
        "contextInfoUrl": "{path}/contextInfo",
        "activeColumnsCookie": "activeColumnsCustom",
        "activeColumns": [],
        "availableColumns": {
          "getURL": "URL",
        },
        "buttons": [],
        "menuOptions": [],
        "attributes": [
          'Title', 'getURL'
        ]
      };

      this.$el = $('<div class="pat-structure"></div>').attr(
        'data-pat-structure', JSON.stringify(structure)).appendTo('body');

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('GET', /data.json/, function (xhr, id) {
        var batch = JSON.parse(getQueryVariable(xhr.url, 'batch'));
        var start = 0;
        var end = 15;
        if (batch) {
          start = (batch.page - 1) * batch.size;
          end = start + batch.size;
        }
        var items = [];
        items.push({
          getURL: 'http://localhost:8081/folder',
          Title: 'Folder',
          id: 'folder',
          UID: 'folder',
        });
        for (var i = start; i < end; i = i + 1) {
          items.push({
            getURL: 'http://localhost:8081/item' + i,
            Title: 'Document ' + i,
            id: 'item' + 1,
            UID: 'item' + 1,
          });
        }

        xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify({
          total: 100,
          results: items
        }));
      });
      this.server.respondWith('GET', /contextInfo/, function (xhr, id) {
        var data = {
          addButtons: []
        };
        if (xhr.url.indexOf('folder') !== -1){
          data.object = {
            UID: '123sdfasdfFolder',
            getURL: 'http://localhost:8081/folder',
            path: '/folder',
            portal_type: 'Folder',
            Description: 'folder',
            Title: 'Folder',
            'review_state': 'published',
            'is_folderish': true,
            Subject: [],
            id: 'folder'
          };
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(data));
      });

      this.clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      this.server.restore();
      this.clock.restore();
      $('body').html('');
    });

    it('test itemRow actionmenu no options.', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      // top item
      var item = this.$el.find('.itemRow').eq(1);
      expect(item.data().id).to.equal('item1');
      // Since no moveUrl, no move-top or move-bottom.
      expect(item.find('.actionmenu * a').length).to.equal(0);
    });

  });

  /* ==========================
   TEST: Structure alternative action buttons
  ========================== */
  describe('Structure alternative action buttons and links', function() {
    beforeEach(function() {
      // clear cookie setting
      $.removeCookie('_fc_perPage');
      $.removeCookie('_fc_activeColumnsCustom');

      var structure = {
        "vocabularyUrl": "/data.json",
        "indexOptionsUrl": "/tests/json/queryStringCriteria.json",
        "contextInfoUrl": "{path}/contextInfo",
        "activeColumnsCookie": "activeColumnsCustom",
        "activeColumns": [],
        "availableColumns": {
          "getURL": "URL",
        },
        "buttons": [],
        "menuOptions": {
          'action1': [
            'dummytestmodule',
            'option1',
            '#',
            'Option 1',
          ],
          'action2': [
            'dummytestmodule',
            'option2',
            '#',
            'Option 2',
          ],
        },
        'tableRowItemAction': {
          'other': ['dummytestaction', 'handleOther'],
        },
        "attributes": [
          'Title', 'getURL'
        ]
      };

      this.$el = $('<div class="pat-structure"></div>').attr(
        'data-pat-structure', JSON.stringify(structure)).appendTo('body');

      this.server = sinon.fakeServer.create();
      this.server.autoRespond = true;

      this.server.respondWith('GET', /data.json/, function (xhr, id) {
        var batch = JSON.parse(getQueryVariable(xhr.url, 'batch'));
        var start = 0;
        var end = 15;
        if (batch) {
          start = (batch.page - 1) * batch.size;
          end = start + batch.size;
        }
        var items = [{
          getURL: 'http://localhost:8081/folder',
          Title: 'Folder',
          'is_folderish': true,
          path: '/folder',
          id: 'folder'
        }, {
          getURL: 'http://localhost:8081/item',
          Title: 'Item',
          'is_folderish': false,
          path: '/item',
          id: 'item'
        }];

        xhr.respond(200, {'Content-Type': 'application/json'}, JSON.stringify({
          total: 1,
          results: items
        }));
      });
      this.server.respondWith('GET', /contextInfo/, function (xhr, id) {
        var data = {
          addButtons: []
        };
        if (xhr.url.indexOf('folder') !== -1){
          data.object = {
            UID: '123sdfasdfFolder',
            getURL: 'http://localhost:8081/folder',
            path: '/folder',
            portal_type: 'Folder',
            Description: 'folder',
            Title: 'Folder',
            'review_state': 'published',
            'is_folderish': true,
            Subject: [],
            id: 'folder'
          };
        }
        xhr.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(data));
      });

      this.clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      requirejs.undef('dummytestaction');
      this.server.restore();
      this.clock.restore();
      $('body').html('');
    });

    it('test itemRow actionmenu no options.', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var item = this.$el.find('.itemRow').eq(0);
      // Check for complete new options
      expect($('.actionmenu * a', item).length).to.equal(2);
      expect($('.actionmenu .action1 a', item).text()).to.equal('Option 1');
      expect($('.actionmenu .action2 a', item).text()).to.equal('Option 2');
    });

    it('folder link not overriden', function() {
      registry.scan(this.$el);
      this.clock.tick(1000);
      var item = this.$el.find('.itemRow').eq(0);
      $('.title a.manage', item).trigger('click');
      this.clock.tick(1000);
      // default action will eventually trigger this.
      expect(this.$el.find('.context-buttons').length).to.equal(1);
    });

    it('item link triggered', function() {
      define('dummytestaction', ['backbone'], function(Backbone) {
        var Actions = Backbone.Model.extend({
          initialize: function(options) {
            this.options = options;
            this.app = options.app;
          },
          handleOther: function(e) {
            e.preventDefault();
            var self = this;
            self.app.setStatus('Status: not a folder');
          }
        });
        return Actions;
      });
      // preload the defined module to allow it be used synchronously.
      require(['dummytestaction'], function(){});

      registry.scan(this.$el);
      this.clock.tick(1000);
      var item = this.$el.find('.itemRow').eq(1);
      $('.title a.manage', item).trigger('click');
      this.clock.tick(1000);
      // status will be set as defined.
      expect($('.status').text()).to.contain('Status: not a folder');
    });

  });

});
