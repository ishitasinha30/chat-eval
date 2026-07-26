const Store = require('electron-store');

const store = new Store({
  name: 'chateval-settings',
  schema: {
    apiKey: { type: 'string', default: '' },
    defaultEvaluator: { type: 'string', default: '' },
  },
});

function getSetting(key) {
  return store.get(key);
}

function setSetting(key, value) {
  store.set(key, value);
  return true;
}

module.exports = { getSetting, setSetting };
