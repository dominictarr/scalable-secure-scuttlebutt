var el = require('./demos').centralized()
document.body.appendChild(el)

el.dispatchEvent(new FocusEvent('focus'))
