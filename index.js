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

import { _new, _get, _getAll } from './utils.js';

const fileInput = _get('#package-file');
const channelsContainer = _get('.channels');
const directMessagesContainer = _get('.direct-messages');
const groupChatsContainer = _get('.group-chats');

_get('#export-button').addEventListener('click', exportChannelsAndMessages);

fileInput.addEventListener('change', onFilePicked);

/** @type { Array } */
let archiveRoot;

/** @type { Set.<string> } */
const channelsToDelete = new Set();

async function onFilePicked() {
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
    archiveRoot = await (new zip.ZipReader(new zip.BlobReader(file))).getEntries();
    const channelsListFile = archiveRoot.find(file => file.filename === 'messages/index.json');
    let channelsList = JSON.parse(await channelsListFile.getData(new zip.TextWriter()));
    return Object.entries(channelsList).map(channel => { return { id: 'c' + channel[0], name: channel[1] } })
}

/**
 * Show visual feedback for success or fail of file load
 * @param {boolean} isSuccess has file loaded successfully
 * @returns { null } nothing
 */
function showFilePickerFeedback(isSuccess) {
    const fileInputLabel = _get('label.file-input');
    if (!isSuccess) {
        fileInputLabel.classList.remove('loaded')
        fileInputLabel.classList.add('error');
        fileInputLabel.querySelector('span').textContent = "Loading Error";
        return;
    }

    fileInputLabel.classList.remove('error')
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
            addChannelCheckbox(group.channels[0], groupChatsContainer);
            return;
        }

        group.channels.sort((a, b) => a.name.localeCompare(b.name));

        if (group.name == 'Direct Messages') {
            for (let channel of group.channels)
                addChannelCheckbox(channel, directMessagesContainer);
            return;
        }

        const details = _new('details', { parent: channelsContainer });
        const summary = _new('summary', { parent: details }, `${group.name} (${group.channels.length})`);

        const selectAllDiv = _new('.select-all', { parent: summary, parentPosition: 'afterbegin' });
        _new('input', {
            parent: selectAllDiv, attr: { type: 'checkbox', id: group.id }, events: {
                click: e => {
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
            addChannelCheckbox(channel, list, group);
        });
    });
}

/**
 * @param {string} channelId 
 */
function addChannelToDelete(channelId) {
    channelsToDelete.add(channelId);

    _get('section.export').classList.remove('hidden');
    _get('section.export + textarea').classList.remove('hidden');
}

/**
 * @param {string} channelId 
 */
function removeChannelToDelete(channelId) {
    channelsToDelete.delete(channelId);

    if (channelsToDelete.length === 0) {
        _get('section.export').classList.add('hidden');
        _get('section.export + textarea').classList.remove('hidden');
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
        groupCheckbox.classList.remove('partial');
    }
    else if (checkedChannels.length == group.channels.length) {
        groupCheckbox.checked = true;
        groupCheckbox.classList.remove('partial');
    }
    else {
        groupCheckbox.checked = false;
        groupCheckbox.classList.add('partial');
    }
}

/**
 * Add a new checkbox element to the specified parent
 * @param { Channel } channel 
 * @param { HTMLElement } parent 
 * @param { Group } group
 */
function addChannelCheckbox(channel, parent, group = null) {
    const newListItem = _new('li', { parent: parent });

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
                }
            }
        }
    );

    let channelName = channel.name.trim();
    if (group)
        channelName = channel.name.replace(`in ${group.name}`, '').trim();

    const isUnknown = channelName == "Unknown channel";

    _new(
        'label',
        {
            attr: { for: channel.id },
            parent: newListItem,
            classNames: isUnknown ? ['unknown'] : []
        },
        channelName
    );
}

/**
 * Export channel IDs and Message IDs formatted as needed
 */
async function exportChannelsAndMessages() {
    const onlyExportChannels = _get('#export-channels').checked;
    const channels = Array.from(channelsToDelete);

    _get('textarea').textContent = '';
    _get('#download-button').addEventListener('click', downloadExport);

    if (onlyExportChannels) {
        _get('textarea').textContent = channels.map(channel => channel.slice(1)).join(', ');
        return;
    }

    for (let channel of channels) {
        _get('textarea').textContent += `${channel.slice(1)}:\n`;
        _get('textarea').textContent += (await getChannelMessagesIds(channel)).join(', ') + '\n\n';
    }
}

function downloadExport() {
    const textFile = new File([_get('textarea').textContent], 'undiscord.txt', {
        type: 'text/plain'
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
    console.log(`messages/${channel}/messages.json`);
    const channelMessagesFile = archiveRoot.find(file => file.filename === `messages/${channel}/messages.json`);
    let messagesList = JSON.parse(await channelMessagesFile.getData(new zip.TextWriter()));
    return messagesList.map(message => message['ID'].toString());
}