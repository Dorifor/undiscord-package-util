/**
 * @typedef Channel
 * @type { object }
 * @property { string } id - Channel ID
 * @property { string } name - Channel Name
 */

/** 
 * @typedef Group
 * @type { object }
 * @property { string } id - Group UUID (generated)
 * @property { string } name - Group Name 
 * @property { Array.<Channel> } channels - Channels inside this group
 */

import { _new, _get, _getAll, lockBodyScroll, debounce, removeAccents } from './utils.js';
import { JSONParse } from './json-with-bigint.min.js';

const fileInput = _get('#package-file');
const channelsContainer = _get('.channels');
const directMessagesContainer = _get('.direct-messages');
const groupChatsContainer = _get('.group-chats');

let exportContent;

_get('#export-button').addEventListener('click', exportChannelsAndMessages);

_get('.close').addEventListener('click', () => _get('dialog.messages-popup').close());
_get('dialog.messages-popup').addEventListener('close', closeModal);
_get('#select-servers').checked = false;
_get('#select-groups').checked = false;
_get('#select-messages').checked = false;
_get('#select-servers').addEventListener('change', selectAllServers);
_get('#select-groups').addEventListener('change', selectAllGroupChats);
_get('#select-messages').addEventListener('change', selectAllDirectMessages);

_get('#search-servers').value = "";
_get('#search-servers').addEventListener('input', debounce(searchServers));

_get('#search-groups').value = "";
_get('#search-groups').addEventListener('input', debounce(searchGroups));

_get('#search-messages').value = "";
_get('#search-messages').addEventListener('input', debounce(searchMessages));
// _get('#download-button').addEventListener('click', downloadExport);

addEventListener('popstate', event => {
    const modal = _get('dialog.messages-popup');
    if (modal.open) {
        event.preventDefault();
        modal.close();
    }
})

fileInput.addEventListener('change', onFilePicked);

/** @type { Array } */
let archiveRoot;

/** @type { Set.<string> } */
const channelsToDelete = new Set();

let serverListItems = new Array;
let groupChatsListItems = new Array;
let directMessagesListItems = new Array;

async function onFilePicked() {
    resetChannels();
    let channelsList;

    try {
        channelsList = await getChannelsListFromArchive();
        channelsList.sort((a, b) => a.name.localeCompare(b.name));
        showFilePickerFeedback(true);
    } catch (error) {
        console.error("Archive Loading Error: ", error);
        showFilePickerFeedback(false);
        return;
    }

    populateChannelsList(channelsList)
    _get('section.package-channels').classList.remove('hidden');
}

/**
 * Get raw channels list from archive
 * @param {File} file 
 * @returns { { id: string, name: string }[] }
 */
async function getChannelsListFromArchive() {
    const file = fileInput.files[0];
    const reader = new zip.ZipReader(new zip.BlobReader(file));
    archiveRoot = await reader.getEntries();
    reader.close();
    const channelsListFile = archiveRoot.find(file => file.filename === 'messages/index.json');
    let channelsList = JSON.parse(await channelsListFile.getData(new zip.TextWriter()));
    return Object.entries(channelsList).map(channel => { return { id: 'c' + channel[0], name: channel[1] } });
}

/**
 * Show visual feedback for success or fail of file load
 * @param {boolean} isSuccess has file loaded successfully
 * @returns { null } nothing
 */
function showFilePickerFeedback(isSuccess) {
    const fileInputLabel = _get('label.file-input');
    if (!isSuccess) {
        fileInputLabel.classList.remove('loaded');
        fileInputLabel.classList.add('error');
        fileInputLabel.querySelector('span').textContent = "Loading Error";
        return;
    }

    fileInputLabel.classList.remove('error');
    fileInputLabel.classList.add('loaded');
    fileInputLabel.querySelector('span').textContent = "Archive Loaded";
}

/**
 * @param { Group } group 
 * @returns { boolean }
 */
function isGroupChat(group) {
    return group.channels.length == 1 && group.channels[0].name == group.name;
}

function populateChannelsList(channels) {
    /** @type { Group[] } */
    let groupedChannels = Object.groupBy(channels, ({ name }) => {
        if (name.includes('Direct Message with')) {
            return "Direct Messages"
        } else {
            return name.split(' in ').at(-1)
        }
    });

    groupedChannels = Object.entries(groupedChannels).map(group => { return { id: 'g' + self.crypto.randomUUID(), name: group[0], channels: group[1] } });
    groupedChannels.sort((a, b) => a.name.localeCompare(b.name));

    groupedChannels.forEach(group => {
        if (isGroupChat(group)) {
            const newListItem = addChannelCheckbox(group.channels[0], groupChatsContainer);
            groupChatsListItems.push(newListItem);
            return;
        }

        group.channels.sort((a, b) => a.name.localeCompare(b.name));

        if (group.name == 'Direct Messages') {
            for (let channel of group.channels) {
                const newListItem = addChannelCheckbox(channel, directMessagesContainer);
                directMessagesListItems.push(newListItem);
            }
            return;
        }

        const details = _new('details', { parent: channelsContainer });
        const summary = _new('summary', { parent: details });
        _new('span', { parent: summary }, `${group.name} (${group.channels.length})`);

        const selectAllDiv = _new('.select-all', { parent: summary, parentPosition: 'afterbegin' });
        _new('input', {
            parent: selectAllDiv, attr: { type: 'checkbox', id: group.id }, events: {
                change: e => {
                    if (e.target.checked)
                        selectAllChannelsOfGroup(group);
                    else
                        unselectAllChannelsOfGroup(group);
                }
            }
        });
        _new('label', { parent: selectAllDiv, attr: { for: group.id, title: 'Select All' } });

        const list = _new('ul', { parent: details });

        group.channels.forEach(channel => {
            const newListItem = addChannelCheckbox(channel, list, group);
            serverListItems.push(newListItem);
        });
    });
}

function selectAllServers(event) {
    const servers = _getAll('.channels .select-all > input');
    if (event.target.checked)
        servers.forEach(server => {
            server.checked = true;
            server.dispatchEvent(new Event('change'));
        });
    else
        servers.forEach(server => {
            server.checked = false;
            server.dispatchEvent(new Event('change'));
        });
}

function selectAllGroupChats(event) {
    const groups = _getAll('.group-chats > li > input');
    if (event.target.checked)
        groups.forEach(server => {
            server.checked = true;
            server.dispatchEvent(new Event('change'));
        });
    else
        groups.forEach(server => {
            server.checked = false;
            server.dispatchEvent(new Event('change'));
        });
}

function selectAllDirectMessages(event) {
    const groups = _getAll('.direct-messages > li > input');
    if (event.target.checked)
        groups.forEach(server => {
            server.checked = true;
            server.dispatchEvent(new Event('change'));
        });
    else
        groups.forEach(server => {
            server.checked = false;
            server.dispatchEvent(new Event('change'));
        });
}

/**
 * @param {string} channelId 
 */
function addChannelToDelete(channelId) {
    channelsToDelete.add(channelId);

    _get('section.export').classList.remove('hidden');
    _get('textarea').classList.remove('hidden');
}

/**
 * @param {string} channelId 
 */
function removeChannelToDelete(channelId) {
    channelsToDelete.delete(channelId);

    if (channelsToDelete.length === 0) {
        _get('section.export').classList.add('hidden');
        _get('textarea').classList.remove('hidden');
    }
}

/**
 * @param {Group} group the group containing the channels to be selected
 */
function selectAllChannelsOfGroup(group) {
    for (let channel of group.channels) {
        const channelCheckbox = _get(`#${channel.id}`);
        channelCheckbox.checked = true;
        channelCheckbox.dispatchEvent(new Event('change'));
    }
}

/**
 * @param {Group} group the group containing the channels to be unselected
 */
function unselectAllChannelsOfGroup(group) {
    for (let channel of group.channels) {
        const channelCheckbox = _get(`#${channel.id}`);
        channelCheckbox.checked = false;
        channelCheckbox.dispatchEvent(new Event('change'));
    }
}

/**
 * @param {Group} group 
 */
function updateGroupCheckbox(group) {
    const groupCheckbox = _get(`#${group.id}`);

    const checkedChannels = group.channels.filter(channel => _get(`#${channel.id}`).checked)

    if (checkedChannels.length == 0) {
        groupCheckbox.checked = false;
        groupCheckbox.indeterminate = false;
    }
    else if (checkedChannels.length == group.channels.length) {
        groupCheckbox.checked = true;
        groupCheckbox.indeterminate = false;
    }
    else {
        groupCheckbox.checked = false;
        groupCheckbox.indeterminate = true;
    }

    updateGlobalCheckbox('#select-servers', '.channels .select-all > input');
}

function updateGlobalCheckbox(globalSelector, listSelector) {
    const globalCheckbox = _get(globalSelector);
    const groups = _getAll(`${listSelector}`);
    const checkedgroups = _getAll(`${listSelector}:checked`);

    if (checkedgroups.length == 0) {
        globalCheckbox.checked = false;
        globalCheckbox.indeterminate = false;
    }
    else if (checkedgroups.length == groups.length) {
        globalCheckbox.checked = true;
        globalCheckbox.indeterminate = false;
    }
    else {
        globalCheckbox.checked = false;
        globalCheckbox.indeterminate = true;
    }
}

/**
 * Add a new checkbox element to the specified parent
 * @param { Channel } channel 
 * @param { HTMLElement } parent 
 * @param { Group } group
 * @returns { HTMLLIElement } listItem
 */
function addChannelCheckbox(channel, parent, group = null) {
    const newListItem = _new('li', {
        parent: parent, events: {
            'contextmenu': event => {
                event.preventDefault();
                let target = event.target;

                if (target.nodeName === "LABEL")
                    target = event.target.parentElement;

                target.querySelector('.actions').click();
            }
        }
    });

    _new(
        'input',
        {
            attr: {
                type: 'checkbox',
                id: channel.id
            },
            parent: newListItem,
            events: {
                change: (e) => {
                    if (e.target.checked)
                        addChannelToDelete(channel.id);
                    else
                        removeChannelToDelete(channel.id);

                    if (group)
                        updateGroupCheckbox(group);
                    else {
                        updateGlobalCheckbox('#select-groups', '.group-chats > li > input');
                        updateGlobalCheckbox('#select-messages', '.direct-messages > li > input');
                    }
                }
            }
        }
    );

    let channelName = channel.name.trim();
    if (group)
        channelName = channel.name.replace(`in ${group.name}`, '').trim();

    channelName = channelName.replace('Direct Message with ', '');

    const isUnknown = ["Unknown channel", "Unknown Participant"].includes(channelName);

    _new(
        'label',
        {
            attr: { for: channel.id },
            parent: newListItem,
            classNames: isUnknown ? ['unknown'] : []
        },
        channelName
    );

    const readMessagesButton = _new('span.actions', { parent: newListItem, attr: { 'data-channel-id': channel.id }, events: { click: openMessageModal } });
    _new('span', { parent: readMessagesButton }, 'Messages');
    readMessagesButton.insertAdjacentHTML('afterbegin', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-more"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>');
    return newListItem;
}

/**
 * Export channel IDs and Message IDs formatted as needed
 */
async function exportChannelsAndMessages() {
    // const onlyExportChannels = _get('#export-channels').checked;
    const channels = Array.from(channelsToDelete);
    const progress = _get('progress');
    const textArea = _get('textarea');

    textArea.textContent = '';
    // _get('#download-button').disabled = true;
    _get('#export-button').disabled = true;
    _get('#export-button').textContent = 'Exporting...';
    _get('.export-report').innerHTML = '';
    progress.max = channels.length;
    progress.value = 0;

    // if (onlyExportChannels) {
    //     textArea.textContent = channels.map(channel => channel.slice(1)).join(', ');
    //     return;
    // }

    let lineCount = 0;

    exportContent = '';

    for (let channel of channels) {
        for (let message of await getChannelMessagesIds(channel)) {
            exportContent += `${channel.slice(1)},${message}\n`;
            if (lineCount < 200)
                textArea.textContent += `${channel.slice(1)},${message}\n`;
            else if (lineCount == 200)
                textArea.textContent += `... (truncated for performance)`;
            lineCount++;
        }
        progress.value++;
    }

    _get('.export-report').innerHTML = `Exported <b>${lineCount.toLocaleString('fr')} messages</b> from <b>${channels.length.toLocaleString('fr')} channels</b>`;
    _get('#export-button').textContent = 'Export';
    _get('#export-button').disabled = false;
    // _get('#download-button').disabled = false;

    downloadExport();
}

function downloadExport() {
    const textFile = new File([exportContent], 'messages.csv', {
        type: 'text/csv'
    });

    const url = URL.createObjectURL(textFile)

    const link = _new('a', {
        attr: {
            href: url,
            download: textFile.name,
            target: '_blank',
            parent: document.body
        }
    });

    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

/**
 * Return an array of messages IDs for this channel 
 * @param {Channel} channel 
 * @returns { int[] }
 */
async function getChannelMessagesIds(channel) {
    const channelMessagesFile = archiveRoot.find(file => file.filename === `messages/${channel}/messages.json`);
    let messagesList = JSONParse(await channelMessagesFile.getData(new zip.TextWriter()));
    return messagesList.map(message => message['ID'].toString());
}

/**
 * Load all messages for this channel 
 * @param {Channel} channel 
 * @returns { Array.<{ ID: int, Timestamp: string, Contents: string, Attachments: string }> }
 */
async function getChannelMessages(channel) {
    const channelMessagesFile = archiveRoot.find(file => file.filename === `messages/${channel}/messages.json`);
    const channelMessagesJSON = await channelMessagesFile.getData(new zip.TextWriter(), {
        onprogress: (progress, total) => {
            // console.log(`${progress}/${total} (${progress / total * 100}/100)`);
        }
    }).catch(err => console.trace('channelMessagesJSON', err));
    const parsedChannelMessages = JSON.parse(channelMessagesJSON);
    return parsedChannelMessages;
}

function openMessageModal(event) {
    history.pushState({ action: 'open' }, "", '#modal');
    const loadMessage = _get('dialog.messages-popup > p');
    loadMessage.classList.remove('hidden');
    loadMessage.classList.remove('error');
    loadMessage.textContent = "Loading Messages...";

    let target = event.target;

    if (!target.classList.contains('actions'))
        target = target.parentElement;

    _get('dialog.messages-popup').showModal();
    lockBodyScroll();

    const channelName = _get(`[for="${target.dataset.channelId}"]`).textContent;
    _get('dialog.messages-popup > h3').textContent = `${channelName}`;
    loadMessagesFromChannel(target.dataset.channelId);
}

function loadMessagesFromChannel(channel) {
    getChannelMessages(channel)
        .then(messages => {
            populateMessagesList(messages);
        })
        .catch(async error => {
            console.error(error);
            console.error('failed message fetch, no more tries.');
            const loadMessage = _get('dialog.messages-popup > p');
            loadMessage.classList.remove('hidden');
            loadMessage.classList.add('error');
            loadMessage.textContent = "Cannot load messages, try again.";
        });
}

/**
 * 
 * @param { Array.<{ ID: int, Timestamp: string, Contents: string, Attachments: string }> } messages 
 */
function populateMessagesList(messages) {
    _get('dialog.messages-popup > h3').textContent += ` (${messages.length})`;
    _get('dialog.messages-popup > p').classList.add('hidden');
    const messagesList = _new('ul', { parent: 'dialog.messages-popup' });
    messagesList.scrollTo(0, 0);

    messages.forEach(message => {
        if (message.Contents === "" && message.Attachments === "") return;

        const newListItem = _new('li', { parent: messagesList });

        _new('span.date', { parent: newListItem }, message.Timestamp.slice(0, -3));
        _new('br', { parent: newListItem });

        let attachments = [];
        if (message.Attachments != "")
            attachments = message.Attachments.split(' ');

        if (message.Contents != "")
            _new('span', { parent: newListItem }, message.Contents);

        attachments.forEach(attachment => {
            _new('a', { parent: newListItem, attr: { href: attachment, target: '_blank' } }, getStrippedFileName(attachment))
        });

    });
}

function getStrippedFileName(url) {
    const filename = new URL(url).pathname.split('/').at(-1);
    if (filename.length <= 20)
        return `[${filename}]`;

    return `[${filename.slice(0, 8)}...${filename.slice(-5)}]`;
}

function closeModal() {
    history.replaceState(null, null, ' ');
    lockBodyScroll(false);
    _get('dialog.messages-popup > p').classList.remove('hidden');
    _get('dialog.messages-popup > ul')?.remove();
}

function searchGroups(event) {
    const search = removeAccents(this.value.toLowerCase());
    const list = _get('.group-chats');

    groupChatsListItems.forEach(item => {
        if (removeAccents(item.querySelector('label').textContent.toLowerCase()).includes(search))
            item.classList.remove('excluded');
        else
            item.classList.add('excluded');
    })

    if (list.querySelectorAll('li:not(.excluded)').length > 1)
        list.querySelector('.nothing-found').classList.add('hidden');
    else
        list.querySelector('.nothing-found').classList.remove('hidden');
}

function searchMessages(event) {
    const search = removeAccents(this.value.toLowerCase());
    const list = _get('.direct-messages')

    directMessagesListItems.forEach(item => {
        if (removeAccents(item.querySelector('label').textContent.toLowerCase()).includes(search))
            item.classList.remove('excluded');
        else
            item.classList.add('excluded');
    })

    if (list.querySelectorAll('li:not(.excluded)').length > 1)
        list.querySelector('.nothing-found').classList.add('hidden');
    else
        list.querySelector('.nothing-found').classList.remove('hidden');
}

function searchServers(event) {
    const search = removeAccents(this.value.toLowerCase());

    for (let item of serverListItems) {
        if (removeAccents(item.querySelector('label').textContent.toLowerCase()).includes(search))
            item.classList.remove('excluded');
        else
            item.classList.add('excluded');
    }

    for (let group of _getAll('.channels > details')) {
        updateGroupAfterSearch(group);
    }
}

/**
 * @param {HTMLElement} groupItem 
 */
function updateGroupAfterSearch(groupItem) {
    const foundChannels = groupItem.querySelectorAll('li:not(.excluded)')
    console.log(foundChannels.length)
    if (foundChannels.length == 0)
        groupItem.classList.add('excluded');
    else
        groupItem.classList.remove('excluded');

    const groupLabel = groupItem.querySelector('summary > span');
    const countStart = groupLabel.textContent.lastIndexOf('(');
    groupLabel.textContent = groupLabel.textContent.slice(0, countStart) + '(' + foundChannels.length + ')';
}

function resetChannels() {
    const serverList = _getAll('.channels > li:not(.nothing-found)');
    const groupChatsList = _getAll('.channels > li:not(.nothing-found)');
    const directMessagesList = _getAll('.channels > li:not(.nothing-found)');

    serverList.forEach(item => item.remove);
    groupChatsList.forEach(item => item.remove);
    directMessagesList.forEach(item => item.remove);
    _get('.export').classList.add('hidden');
}