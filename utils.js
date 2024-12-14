/**
 * @typedef HTMLElementOptions
 * @property { string[] } classNames element classList
 * @property { Object.<string, any> } attr element attributes
 * @property { HTMLElement? } parent if set, will be appended to this parent
 * @property { ('beforebegin' | 'afterbegin' | 'beforeend' | 'afterend') } parentPosition if parent is set, the insertion position
 * @property { Object.<string, function> } events event listeners
 */

/**
 * @type { HTMLElementOptions }
 */
const defaultOptions = {
    classNames: [],
    attr: {},
    parent: null,
    parentPosition: null,
    events: {}
}

/**
 * Return a new element with passed options
 * @param {string} tagString HTML tag of the element (with css id (#) and classes (.))
 * @param { HTMLElementOptions? } options various options
 * @returns { HTMLElement }
 */
export function _new(tagString, options = defaultOptions, text = null) {
    options = { ...defaultOptions, ...options };

    let [tagName, id, classes] = parseTagString(tagString);

    tagName = tagName || 'div';

    if (id) options.attr.id = id;
    if (classes) options.classNames = [...classes, ...options.classNames];

    const element = document.createElement(tagName);

    options.classNames.forEach((_class) => element.classList.add(_class));

    Object.entries(options.events).forEach(event => {
        element.addEventListener(event[0], event[1]);
    })

    Object.entries(options.attr).forEach(attr => {
        element.setAttribute(attr[0], attr[1]);
    });

    element.textContent = text;

    if (options.parent) {
        if (typeof (options.parent) == "string")
            options.parent = _get(options.parent);

        if (options.parentPosition)
            options.parent.insertAdjacentElement(options.parentPosition, element);
        else
            options.parent.appendChild(element);
    }

    return element;
}

/**
 * 
 * @param {string} tagString HTML tag of the element (with css id (#) and classes (.))
 * @returns { [tagName: string, id: string?, classes: string[]] }
 */
function parseTagString(tagString) {
    let classes, id = null;

    let classSplitted = tagString.split('.');
    if (classSplitted.length > 1)
        classes = classSplitted.slice(1);

    let idSplitted = classSplitted[0].split('#');
    if (idSplitted.length > 1)
        id = idSplitted[1];

    return [idSplitted[0], id, classes];
}

/**
 * Get one element that matches the provided css selector
 * @param {string} querySelector the css formatted query selector
 * @returns { HTMLElement } the found element (if found)
 */
export function _get(querySelector) {
    return document.querySelector(querySelector);
}

/**
 * Get an array of elements that matches the provided css selector
 * @param {string} querySelector the css formatted query selector
 * @returns { HTMLElement[] } the found elements (if found)
 */
export function _getAll(querySelector) {
    return document.querySelectorAll(querySelector);
}

/**
 * Lock or unlock the body scroll.
 *
 * @param {boolean} lock Whether to lock or unlock the body scroll. Default = true.
 */
export function lockBodyScroll(lock = true) {
    const { documentElement, body } = document;

    // RTL <body> scrollbar
    const documentLeft = documentElement.getBoundingClientRect().left;
    const scrollbarX = Math.round(documentLeft) + documentElement.scrollLeft;
    const paddingProp = scrollbarX ? 'paddingLeft' : 'paddingRight';

    if (lock) {
        body.style[paddingProp] = `${window.innerWidth - documentElement.clientWidth}px`;
        body.style.top = `-${window.scrollY}px`;
        body.style.left = `-${window.scrollX}px`;
        body.style.right = 0;
        body.style.position = 'fixed';

        body.classList.add('scroll-locked');
    } else {
        if (!body.classList.contains('scroll-locked')) {
            return;
        }

        const currentScrollY = parseInt(body.style.top || '0') * -1;
        const currentScrollX = parseInt(body.style.left || '0') * -1;

        body.style[paddingProp] = '';
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';

        body.classList.remove('scroll-locked');

        window.scrollTo({ left: currentScrollX, top: currentScrollY, behavior: 'instant' });
    }
}

export function debounce(callback, delay = 350) {
    var timer;
    return function () {
        var args = arguments;
        var context = this;
        clearTimeout(timer);
        timer = setTimeout(function () {
            callback.apply(context, args);
        }, delay)
    }
}

export function removeAccents(string) {
    return string.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}