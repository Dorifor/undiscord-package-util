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

    if (options.parent && options.parentPosition)
        options.parent.insertAdjacentElement(options.parentPosition, element);
    else if (options.parent)
        options.parent.appendChild(element);

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