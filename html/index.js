'use strict';

if (!window) {
  var Handlebars = require('handlebars');
  var _ = require('underscore');
  var $ = require('jquery');
  var noop = function(id){
    return function(){
      console.log('noop '+id);
    };
  };
  $.collapse = $.collapse || noop('collapse');
  $.popover = $.popover || noop('popover');
  $.tooltip = $.tooltip || noop('tooltip');
  $.animate = $.animate || noop('animate');
} else {
  var _ = window._;
  var $ = window.$;
  var Handlebars = window.Handlebars;
}

var Section = function(intf,id) {
  this.opts = {
    buttonClass: {
      open: 'btn-sec-open',
      closed: 'btn-sec-closed',
    },
    makeSelector: function(id){
      return '#'+id;
    },
    makeButtonSelectorOpen: function(secSelector){
      return '.section-open[data-target="'+secSelector+'"]';
    },
    makeButtonSelectorClose: function(secSelector){
      return '.section-close[data-target="'+secSelector+'"]';
    },
    makeButtonSelectorScroll: function(secSelector){
      return '.section-scroll[data-from="'+secSelector+'"]';
    }
  };
  this.intf = intf;
  this.id = id;
  this.isOpen = false;
  this.selector = this.opts.makeSelector(this.id);
  this.el = $(this.selector);
  this.el.on('shown.bs.collapse',_.bind(function(){
    console.log('section %s shown',this.id);
    this.intf.scrollTo(this.selector,_.bind(function(){
      this.intf.openedSection(this);
    },this));
  },this));
  this.el.on('hidden.bs.collapse',_.bind(function(){
    console.log('section %s hidden',this.id);
    this.intf.scrollTo(this.intf.selector,_.bind(function(){
      this.intf.closedSection(this);
    },this));
  },this));
  this.initButtons();
  console.log('created new section %s with %s buttons',
                this.id,this.buttons.length);
};

Section.prototype.initButtons = function () {
  this.buttonSelectorOpen = this.opts.makeButtonSelectorOpen(this.selector);
  this.buttonSelectorClose = this.opts.makeButtonSelectorClose(this.selector);
  this.buttonSelectorScroll = this.opts.makeButtonSelectorScroll(this.selector);
  this.buttonsOpen = _.map($(this.buttonSelectorOpen),function(el){
    return $(el);
  });
  this.buttonsClose = _.map($(this.buttonSelectorClose),function(el){
    return $(el);
  });
  this.buttonsScroll = _.map($(this.buttonSelectorScroll),function(el){
    return $(el);
  });
  this.buttons = _.union(this.buttonsOpen,
                          this.buttonsClose,
                          this.buttonsScroll);
};

Section.prototype.open = function () {
  console.log('opening section: %s',this.id);

  if (this.isOpen) {
    console.log('section '+this.id+' already open');
    this.el.trigger('shown.bs.collapse');
    return;
  }

  console.log('showing section: %s',this.id);
  this.isOpen = true;
  _.each(this.buttons,_.bind(function(btn){
    btn.removeClass(this.opts.buttonClass.closed);
    btn.addClass(this.opts.buttonClass.open);
  },this));
  this.el.collapse('show');
};

Section.prototype.close = function () {
  console.log('closing section: %s',this.id);

  if (!this.isOpen) {
    console.log('section '+this.id+' already closed');
    this.el.trigger('hidden.bs.collapse');
    return;
  }

  this.isOpen = false;
  _.each(this.buttons,_.bind(function(btn){
    btn.removeClass(this.opts.buttonClass.open);
    btn.addClass(this.opts.buttonClass.closed);
  },this));
  this.el.collapse('hide');
};

Section.prototype.scroll = function (scrollBtn) {
  var to = $(scrollBtn).attr('data-to');
  console.log('scrolling from section %s to %s',this.id,to);
  this.intf.scrollTo(to);
};

Section.prototype.start = function () {
  this.el.collapse({
    toggle: false
  });

  _.each(this.buttonsOpen,_.bind(function(btn){
    btn.addClass(this.opts.buttonClass.closed);
    btn.on('click',_.bind(function(e){
      e.preventDefault();
      this.open();
      return false;
    },this));
  },this));

  _.each(this.buttonsClose,_.bind(function(btn){
    btn.addClass(this.opts.buttonClass.closed);
    btn.on('click',_.bind(function(e){
      e.preventDefault();
      this.close();
      return false;
    },this));
  },this));

  _.each(this.buttonsScroll,_.bind(function(btn){
    btn.addClass(this.opts.buttonClass.closed);
    btn.on('click',_.bind(function(e){
      e.preventDefault();
      this.scroll(btn);
      return false;
    },this));
  },this));
};




var Interface = function(intfId,sections){
  this.opts = {
    scroll: {
      duration: 200,
    }
  };
  this.id = intfId;
  this.selector = '#'+this.id;
  this.currentSection = null;
  this.sections = _.map(sections,_.bind(function(secData,id){
    console.log('creating section %s',id);
    var sec = new Section(this,id);
    return sec;
  },this));
  this.documentTitle = '';
};

Interface.prototype.scrollTo = function (to,cb) {
  cb = cb || function() {};
  console.log('scrolling to: %s',to);
  var target = $(to);
  try {
    $('html, body').animate({
      scrollTop: target.offset().top
    }, this.opts.scroll.duration, function() {
      console.log('scrolling to %s completed: %s',to);
      cb();
    });
  } catch (e) {
    console.error('Exception while scrolling');
    console.error(e);
  }
};

Interface.prototype.isHashSection = function (hash) {
  return _.find(this.sections,function(sec){
    return sec.selector === hash;
  });
};

Interface.prototype.setHash = function (hash) {
  var curHash = window.location.hash;
  console.log('setting hash to: %s (cur=%s)',hash,curHash);

  if (curHash === hash) {
    return;
  }

  if ('pushState' in history) {
    history.pushState(hash,
      document.title,
      window.location.pathname + hash + window.location.search);
  } else {
    var scrollV, scrollH;
    // Prevent scrolling by storing the page's current scroll offset
    scrollV = document.body.scrollTop;
    scrollH = document.body.scrollLeft;

    window.location.hash = hash;

    // Restore the scroll offset, should be flicker free
    document.body.scrollTop = scrollV;
    document.body.scrollLeft = scrollH;
    console.log('cleared hash');
  }
  console.log('hash set');

  if (!this.isHashSection(hash)) {
    this.scrollTo(this.selector);
  }
};

Interface.prototype.onHashChanged = function(e){
  var hash = window.location.hash;
  this.openSection(hash);
};

Interface.prototype.openSection = function(selector) {
  var validSection = _.find(this.sections,function(sec){
    return sec.selector === selector;
  });

  if (validSection) {
    validSection.open();
  }
};

Interface.prototype.openedSection = function (sec) {
  console.log('opened section: sec=%s, cur=%s',
                sec.id,this.currentSection);
  if (this.currentSection !== sec.id) {
    this.currentSection = sec.id;
    this.setHash(sec.selector);
    document.title = [this.documentTitle,'-',sec.id].join(' ');
  }
};

Interface.prototype.closedSection = function (sec) {
  var hash = window.location.hash;
  console.log('closed section: sec=%s, cur=%s, hash=%s',
                sec.id,this.currentSection,hash);

  if (hash === sec.selector){
    this.setHash('');
    document.title = this.documentTitle;
  }

  if (this.currentSection === sec.id) {
    this.currentSection = null;
  }
};

Interface.prototype.start = function () {
  $('[data-toggle="popover"]').popover();
  $('.tooltip-bottom').tooltip({
    placement: 'bottom',
    animation: false,
    html: true,
  });
  $('.tooltip-top').tooltip({
    placement: 'top',
    animation: false,
    html: true,
  });
  _.each(this.sections,_.bind(function(sec){
    console.log('starting section %s',sec.id);
    sec.start();
  },this));
  this.documentTitle = document.title;
  /* open section from browser URL */
  var hash = window.location.hash;
  console.log('starting interface on section: %s',hash);
  this.openSection(hash);
  $(window).on( 'hashchange',_.bind(this.onHashChanged,this));
};

var templates = $('script.template');

var mayhem = {
  Interface: Interface,
  Section: Section,
  interface: 'page',
  sections: {
    'manifesto':{

    },
    'donate': {

    },
    'thanks': {

    }
  }
};