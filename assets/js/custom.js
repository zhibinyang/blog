/**
 * Custom JavaScript for FixIt blog site.
 * @author @Lruihao https://lruihao.cn
 */
class FixItBlog {
  /**
   * say hello
   * you can define your own functions below
   * @returns {FixItBlog}
   */
  hello() {
    console.log('custom.js: Hello FixIt!');
    return this;
  }
  /**
   * Generate and persist a first-party UID cookie on the top-level domain.
   * The UID is stored in `__uid_1st` with a 1-year expiry and exposed
   * as `window.__USER_UID` for downstream ad request usage.
   * @returns {FixItBlog}
   */
  generateFirstPartyUID() {
    const cookieName = '__uid_1st';
    // Read existing cookie
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    let uid = parts.length === 2 ? parts.pop().split(';').shift() : null;

    if (!uid) {
      // Generate a random UUID
      uid = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
      // Derive top-level domain (e.g. .example.com)
      const hostname = window.location.hostname;
      const domainParts = hostname.split('.');
      const domain = domainParts.length >= 2
        ? `; domain=.${domainParts.slice(-2).join('.')}`
        : '';
      document.cookie = `${cookieName}=${uid}; max-age=31536000; path=/${domain}; samesite=lax`;
    }

    window.__USER_UID = uid;
    console.log('1st-party UID:', uid);
    return this;
  }
  /**
   * Listen for language switch events and push to dataLayer
   * Targeted at FixIt's nested HTML structure
   * @returns {FixItBlog}
   */
  trackLanguageSwitch() {
    // Target all specific language options (li.menu-item) under the sub-menu
    const langOptions = document.querySelectorAll('.language-switch .sub-menu .menu-item');

    langOptions.forEach(el => {
      el.addEventListener('click', () => {
        // Attempt to get the language name from the title attribute or text content
        const targetElement = el.querySelector('a, span');
        if (!targetElement) return;

        const targetLang = targetElement.getAttribute('title') || targetElement.innerText.trim();

        // Push the event to the DataLayer for GA4 tracking
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          'event': 'switch_language',
          'language_target': targetLang,
          'current_page_path': window.location.pathname
        });

        console.log('GA4 Language Switch Event Pushed:', targetLang);
      });
    });
    return this;
  }

  /**
   * initialize
   * @returns {FixItBlog}
   */
  init() {
    this.generateFirstPartyUID();
    this.hello();
    this.trackLanguageSwitch();
    return this;
  }
}

/**
 * immediate execution
 */
(() => {
  window.fixitBlog = new FixItBlog();
  // it will be executed when the DOM tree is built
  document.addEventListener('DOMContentLoaded', () => {
    window.fixitBlog.init();
  });
})();
