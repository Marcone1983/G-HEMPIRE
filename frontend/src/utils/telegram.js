const tg = window.Telegram?.WebApp;

export const TelegramWebApp = {
  init() {
    if (!tg) {
      console.warn('Telegram WebApp not available');
      return false;
    }

    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    return true;
  },

  getInitData() {
    return tg?.initData || '';
  },

  getInitDataUnsafe() {
    return tg?.initDataUnsafe || {};
  },

  getUserData() {
    const user = tg?.initDataUnsafe?.user;
    if (!user) return null;

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
      isPremium: user.is_premium || false,
      photoUrl: user.photo_url
    };
  },

  getThemeParams() {
    return tg?.themeParams || {};
  },

  setHeaderColor(color) {
    if (tg) {
      tg.setHeaderColor(color);
    }
  },

  setBackgroundColor(color) {
    if (tg) {
      tg.setBackgroundColor(color);
    }
  },

  showMainButton(text, onClick) {
    if (!tg) return;

    tg.MainButton.setText(text);
    tg.MainButton.show();
    tg.MainButton.onClick(onClick);
  },

  hideMainButton() {
    if (tg) {
      tg.MainButton.hide();
    }
  },

  showBackButton(onClick) {
    if (!tg) return;

    tg.BackButton.show();
    tg.BackButton.onClick(onClick);
  },

  hideBackButton() {
    if (tg) {
      tg.BackButton.hide();
    }
  },

  showAlert(message) {
    if (tg) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  },

  showConfirm(message, callback) {
    if (tg) {
      tg.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      callback(result);
    }
  },

  showPopup(params, callback) {
    if (tg) {
      tg.showPopup(params, callback);
    }
  },

  openLink(url) {
    if (tg) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  },

  openTelegramLink(url) {
    if (tg) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  },

  close() {
    if (tg) {
      tg.close();
    }
  },

  isAvailable() {
    return !!tg;
  },

  getVersion() {
    return tg?.version || 'unknown';
  },

  getPlatform() {
    return tg?.platform || 'unknown';
  },

  isVersionAtLeast(version) {
    return tg?.isVersionAtLeast(version) || false;
  },

  hapticFeedback: {
    impactOccurred(style) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(style || 'medium');
      }
    },
    notificationOccurred(type) {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type || 'success');
      }
    },
    selectionChanged() {
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.selectionChanged();
      }
    }
  },

  cloudStorage: {
    async setItem(key, value) {
      return new Promise((resolve, reject) => {
        if (!tg?.CloudStorage) {
          reject(new Error('CloudStorage not available'));
          return;
        }
        tg.CloudStorage.setItem(key, value, (error, success) => {
          if (error) reject(error);
          else resolve(success);
        });
      });
    },

    async getItem(key) {
      return new Promise((resolve, reject) => {
        if (!tg?.CloudStorage) {
          reject(new Error('CloudStorage not available'));
          return;
        }
        tg.CloudStorage.getItem(key, (error, value) => {
          if (error) reject(error);
          else resolve(value);
        });
      });
    },

    async getItems(keys) {
      return new Promise((resolve, reject) => {
        if (!tg?.CloudStorage) {
          reject(new Error('CloudStorage not available'));
          return;
        }
        tg.CloudStorage.getItems(keys, (error, values) => {
          if (error) reject(error);
          else resolve(values);
        });
      });
    },

    async removeItem(key) {
      return new Promise((resolve, reject) => {
        if (!tg?.CloudStorage) {
          reject(new Error('CloudStorage not available'));
          return;
        }
        tg.CloudStorage.removeItem(key, (error, success) => {
          if (error) reject(error);
          else resolve(success);
        });
      });
    },

    async removeItems(keys) {
      return new Promise((resolve, reject) => {
        if (!tg?.CloudStorage) {
          reject(new Error('CloudStorage not available'));
          return;
        }
        tg.CloudStorage.removeItems(keys, (error, success) => {
          if (error) reject(error);
          else resolve(success);
        });
      });
    },

    async getKeys() {
      return new Promise((resolve, reject) => {
        if (!tg?.CloudStorage) {
          reject(new Error('CloudStorage not available'));
          return;
        }
        tg.CloudStorage.getKeys((error, keys) => {
          if (error) reject(error);
          else resolve(keys);
        });
      });
    }
  }
};

export default TelegramWebApp;
