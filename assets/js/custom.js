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
