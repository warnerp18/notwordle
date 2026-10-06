import '@testing-library/jest-dom';

// jsdom has <dialog> but never implemented show() / showModal() / close().
// These stand-ins set the `open` attribute the way browsers do, so tests can
// check whether a dialog is showing. Guarded because node-environment tests
// (server code) have no DOM.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.show = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    // a browser drops focus from a button that disappears; jsdom doesn't, so
    // a later Enter would "click" the hidden button again
    if (this.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    this.removeAttribute('open');
  };
}
