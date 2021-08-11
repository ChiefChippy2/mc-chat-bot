const translation = require('mc_text.json');
/**
 * Handles C-style formatting with %
 * @param {any[]} context Context
 * @param {string} x String
 * @return {string}
 */
function handlePercent(context = [], x = '') {
  x = translation[x] || x; // Fallback to x if can't be translated
  context = context.map((el)=>{
    if (typeof el === 'string' || typeof el === 'number') return el;
    if (el.translate) return handlePercent(el.with, el.translate);
    return el.text||el.toString();
  });
  return x.replace(/%(.)/, (_, type)=>{
    switch (type) {
      case 's': return context.shift();
      case 'd': return context.shift().toString();
      case 'x':
      case 'X': return parseInt(context.shift()).toString(16);
      case '%': return '%';
      default: return type;
    }
  });
}

module.exports = handlePercent;
