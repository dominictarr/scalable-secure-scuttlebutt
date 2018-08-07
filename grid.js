var el = require('./demos').grid()
document.body.appendChild(el)

el.dispatchEvent(new FocusEvent('focus'))
