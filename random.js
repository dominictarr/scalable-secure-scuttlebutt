var el = require('./demos').random()
document.body.appendChild(el)

el.dispatchEvent(new FocusEvent('focus'))
