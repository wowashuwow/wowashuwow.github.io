'use strict';
// Layout only: callers retain their existing state, actions and cancellation rules.
function layout(modal, title, wide = false) {
  modal.setTitle(title);
  modal.modalEl.classList.add('publishdesk-modal');
  if (wide) modal.modalEl.classList.add('publishdesk-modal-wide');
  modal.contentEl.classList.add('publishdesk-content');
  modal.body = modal.contentEl.createDiv({ cls: 'publishdesk-body' });
  modal.footer = modal.contentEl.createDiv({ cls: 'publishdesk-footer' });
}
function multiline(setting) {
  setting.settingEl.classList.add('publishdesk-multiline');
  return setting;
}
function focusBack(modal, control) {
  if (!modal.closed && control?.isConnected) control.focus();
}
module.exports = { layout, multiline, focusBack };
