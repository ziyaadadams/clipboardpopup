/*
 * Clipboard Popup - GNOME Shell extension
 * Brings up a Windows-style clipboard history panel via a shortcut (default: Super+V).
 * NOTE: Auto-paste after selection is only feasible on X11 (requires xdotool); Wayland forbids key injection.
 */

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Soup from 'gi://Soup?version=3.0';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import Shell from 'gi://Shell';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';

// ByteArray path moved across GNOME releases; imports.byteArray works across versions.
const ByteArray = imports.byteArray;

const HISTORY_FILE = GLib.build_filenamev([GLib.get_user_cache_dir(), 'clipboardpopup', 'history.json']);
const MAX_PREVIEW_CHARS = 160;
const MAX_IMAGE_BYTES = 1_500_000;
const THUMB_SIZE = 120;
const MAX_EMOJI_RECENTS = 30;
const EMOJI_CATEGORIES = {
    'Smileys': ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','🤗','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','🤤','😒','😓','😔','😕','🙃','🤑','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','😕','☹️','🙁','😟','😢','😭','😤','😠','😡','🤬','🤡','💀','☠️','👻','👽','🤖'],
    'People': ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💅','🤳','💪','🦾','🧠','🫀','🫁','🦵','🦶','👂','🦻','👃','🧠','🫦','👀','👁️','🧠','👅','👄','🧑','👨','👩','🧔','👱','👩‍🦰','👨‍🦰','👩‍🦱','👨‍🦱','👩‍🦳','👨‍🦳','👩‍🦲','👨‍🦲','🧓','👴','👵','👶','🧒','👦','👧','🧑‍🎓','🧑‍💻','🧑‍🔧','🧑‍🔬','🧑‍🍳','🧑‍🎨','🧑‍🚀','🧑‍⚕️','🧑‍🚒','🧑‍✈️','🧑‍🏫','🧑‍🔬','🧑‍⚖️','🧑‍🌾'],
    'Nature': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦍','🦧','🐔','🐧','🐦','🐤','🦉','🦅','🦆','🦢','🦩','🦜','🐺','🦇','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🪲','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐅','🐆','🦓','🦌','🐘','🦏','🦛','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦚','🦜','🦢','🦩','🐓','🦃','🦤','🐕‍🦺','🐈‍⬛','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🪴','🌻','🌼','🌸','🌺','🌹','🥀','🌷','🌾','🪻','🍄','🌰','🦷','🪶','🪨'],
    'Food': ['🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍑','🍒','🍓','🫐','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🍵','🧃','🥤','🍺','🍻','🍷','🥂','🍸','🍹','🍾','🧉','🧊'],
    'Objects': ['⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🧯','🛢️','🧭','🧱','🔧','🔨','⚒️','🛠️','⛏️','🔩','🪛','🪚','🪜','⚙️','🧰','🪤','🔫','🧲','🧪','🧫','🧬','🧯','🔭','🔬','🕳️','💣','🧨','🪓','🔪','🛡️','🚪','🪑','🛏️','🛋️','🚽','🚿','🛁','🧴','🧷','🧹','🧺','🧻','🪠','🪥','🧼','🧽','🪣','🧯','🧦','🧤','🧣','🧥','👗','👖','👕','👔','👙','👚','🩱','🩳','👠','👞','👟','🥾','🧢','🎩','🎓','🧳','💼','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️','🖊️','🖋️','✒️','📝','🖍️','🖌️','🔏','🔐','🔑','🗝️','🔨','🪝','🧲','🪡','🧵','🧶'],
    'Symbols': ['❤️','🩷','🧡','💛','💚','💙','💜','🖤','🩶','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','⛔','📛','🚫','❌','⭕','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〰️','➰','➿','✔️','☑️','🔘','⚪','⚫','🔴','🔵','🟤','🟢','🟣','🟡','🟠','🟦','🟩','🟥','🟪','🟫','⬛','⬜','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','🟫'],
    'Travel': ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛻','🚲','🛴','🏍️','🛵','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🛫','🛬','🛩️','✈️','🚁','🚤','🛳️','⛴️','🛥️','🛶','🚢','⚓','⛽','🚧','🚦','🚥','🛑','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','🗻','🏔️','⛰️','🏕️','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','⛪','🕌','🛕','🕍','⛩️','🕋','⛺'],
};
const EMOJI_TAB_META = [
    {id: 'Recents', label: 'Recents', icon: 'document-open-recent-symbolic'},
    {id: 'Smileys', label: 'Smileys', icon: 'face-smile-symbolic'},
    {id: 'People', label: 'People', icon: 'system-users-symbolic'},
    {id: 'Nature', label: 'Nature', icon: 'weather-clear-symbolic'},
    {id: 'Food', label: 'Food', icon: 'emoji-food-symbolic'},
    {id: 'Objects', label: 'Objects', icon: 'applications-utilities-symbolic'},
    {id: 'Symbols', label: 'Symbols', icon: 'emoji-symbols-symbolic'},
    {id: 'Travel', label: 'Travel', icon: 'airplane-mode-symbolic'},
];

// Kaomoji categories
const KAOMOJI_CATEGORIES = {
    'Happy': ['(◕‿◕)', '(｡◕‿◕｡)', '(◠‿◠)', '(◕ᴗ◕✿)', '(✿◠‿◠)', '(◡‿◡)', '(◔‿◔)', '(◠ᴗ◠)', '٩(◕‿◕｡)۶', '(ᵔᴥᵔ)', '(◕‿◕)♡', '(◕ω◕)', '✧◝(⁰▿⁰)◜✧', '٩(｡•́‿•̀｡)۶', 'ヽ(>∀<☆)☆', '＼(◎o◎)／', '(★‿★)', '(｡♥‿♥｡)', '(◍•ᴗ•◍)', '(◠‿・)—☆'],
    'Sad': ['(╥﹏╥)', '(T_T)', '(;_;)', '(ಥ_ಥ)', '(ノ_<。)', '(´;ω;`)', '(｡•́︿•̀｡)', '(っ˘̩╭╮˘̩)っ', '(｡ŏ﹏ŏ)', '(◞‸◟)', '(˃̣̣̥‿˂̣̣̥)', '(╯︵╰,)', '(´°̥̥̥̥̥̥̥̥ω°̥̥̥̥̥̥̥̥`)', '༼ つ ◕_◕ ༽つ', '(っ- ‸ – ς)', '(｡•́︿•̀｡)', '( ´_ゝ`)'],
    'Angry': ['(╬ಠ益ಠ)', '(ノಠ益ಠ)ノ彡┻━┻', '(ง •̀_•́)ง', '(╯°□°)╯︵ ┻━┻', 'ಠ_ಠ', '(¬_¬)', '(ఠ ͟ʖ ఠ)', '(눈_눈)', '(◣_◢)', '┌∩┐(◣_◢)┌∩┐', '(ﾉಥ益ಥ)ﾉ', '(≖︿≖ )', '(>_<)', 'ヽ(`Д´)ノ', '(╬ Ò﹏Ó)'],
    'Surprised': ['(°o°)', '(⊙_⊙)', 'Σ(°△°|||)', '(°ロ°) !', '(◎_◎;)', '(O.O)', '(゜゜)', '∑(O_O;)', '(⊙ˍ⊙)', '( ꒪Д꒪)', '(°△°)', '(゜ロ゜)', 'w(°o°)w', '(・□・;)'],
    'Love': ['(♡˙︶˙♡)', '(´∀`)♡', '♡(◕ω◕)', '(◕‿◕)♡', '(｡♥‿♥｡)', '(◍•ᴗ•◍)❤', '(◠‿◠)♡', '♡^▽^♡', '(◕‿◕)♥', '(^ω^)♡', '♡(ӦｖӦ｡)', '(´ ▽`).。ｏ♡', 'ღゝ◡╹)ノ♡', '(●´ω`●)♡', '(っ˘з(˘⌣˘ )'],
    'Actions': ['(づ｡◕‿‿◕｡)づ', '(つ≧▽≦)つ', 'ヾ(^▽^*)))', '(*・ω・)ﾉ', '(✧ω✧)', '(* ^ ω ^)', '(^_^)/', 'ヾ(･ω･*)ﾉ', '(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧', '✧⁺⸜(●˙▾˙●)⸝⁺✧', '~(^з^)-☆', '(^_−)☆', '( ˘ ³˘)♥', '(っ´▽`)っ', '(*≧▽≦)'],
    'Animals': ['(=^･ω･^=)', '(=^‥^=)', 'ฅ^•ﻌ•^ฅ', '(◕ᴥ◕)', 'ʕ•ᴥ•ʔ', '(ᵔᴥᵔ)', 'U・ᴥ・U', '(^・ω・^ )', '(=｀ω´=)', 'ヾ(=`ω´=)ノ"', '(΄◞ิ౪◟ิ‵)', '(・(ｪ)・)', '⊂(・▽・⊂)', 'ฅ(^◕ᴥ◕^)ฅ', '(๑˃ᴗ˂)ﻭ'],
    'Misc': ['¯\\_(ツ)_/¯', '(╯°□°)╯︵ ┻━┻', '┬─┬ノ( º _ ºノ)', '(ノ°∀°)ノ⌒･*:.｡', '(｡◕‿◕｡)', '( ͡° ͜ʖ ͡°)', '(☞ﾟヮﾟ)☞', '☜(ﾟヮﾟ☜)', '(☞ ͡° ͜ʖ ͡°)☞', '┌( ಠ_ಠ)┘', '(ノ ˘_˘)ノ　ζ|||ζ　ζ|||ζ　ζ|||ζ', '( •_•)>⌐■-■', '(⌐■_■)', '(～￣▽￣)～', '(ノ^_^)ノ'],
};
const KAOMOJI_TAB_META = [
    {id: 'Happy', label: 'Happy', icon: 'face-smile-symbolic'},
    {id: 'Sad', label: 'Sad', icon: 'face-sad-symbolic'},
    {id: 'Angry', label: 'Angry', icon: 'face-angry-symbolic'},
    {id: 'Surprised', label: 'Surprised', icon: 'dialog-warning-symbolic'},
    {id: 'Love', label: 'Love', icon: 'emblem-favorite-symbolic'},
    {id: 'Actions', label: 'Actions', icon: 'system-run-symbolic'},
    {id: 'Animals', label: 'Animals', icon: 'face-monkey-symbolic'},
    {id: 'Misc', label: 'Misc', icon: 'view-more-symbolic'},
];

// Symbol categories
const SYMBOL_CATEGORIES = {
    'Arrows': ['←','↑','→','↓','↔','↕','↖','↗','↘','↙','⇐','⇑','⇒','⇓','⇔','⇕','⤴','⤵','↩','↪','↫','↬','↭','↮','↯','↰','↱','↲','↳','↴','↵','↶','↷','↸','↹','↺','↻','➔','➘','➙','➚','➛','➜','➝','➞','➟','➠','➡','➢','➣','➤','➥','➦','➧','➨','➩','➪','➫','➬','➭','➮','➯','➰','➱','➲'],
    'Math': ['±','×','÷','≠','≈','≤','≥','∞','∑','∏','√','∛','∜','∫','∬','∭','∮','∴','∵','∈','∉','⊂','⊃','⊆','⊇','∪','∩','∧','∨','¬','∀','∃','∄','∅','∇','∂','∆','π','θ','φ','Ω','α','β','γ','δ','ε','λ','μ','σ','τ'],
    'Currency': ['$','€','£','¥','₹','₽','₩','฿','₿','¢','₱','₴','₪','₸','₺','₼','₾','₮','₦','₡','₢','₣','₤','₥','₧','₨','₫','₭','₯','₰','₲','₳','₵','₶','₷','₻','₠','₢','¤'],
    'Punctuation': ["…","–","—","«","»","‹","›","\"","'","‚","„","†","‡","•","·","‰","′","″","‴","⁄","‖","¦","§","¶","©","®","™","℠","℃","℉","°","№","℗","℘","℞","℟","℧","Ω","℮","⅍","⅛","⅜","⅝","⅞","¼","½","¾","⅓","⅔","⅕","⅖","⅗","⅘","⅙","⅚"],
    'Shapes': ['■','□','▢','▣','▤','▥','▦','▧','▨','▩','▪','▫','▬','▭','▮','▯','▰','▱','▲','△','▴','▵','▶','▷','▸','▹','►','▻','▼','▽','▾','▿','◀','◁','◂','◃','◄','◅','◆','◇','◈','◉','◊','○','◌','◍','◎','●','◐','◑','◒','◓','◔','◕','◖','◗','★','☆','✦','✧','✩','✪','✫','✬','✭','✮','✯','✰'],
    'Technical': ['⌘','⌥','⇧','⌃','⎋','⏎','⌫','⌦','⇥','⇤','⌤','⏏','⌨','⎆','⎇','⎈','⎉','⎊','⎌','⏐','⏑','⏒','⏓','⏔','⏕','⏖','⏗','⏘','⏙','⏚','⏛','⏜','⏝','⏞','⏟','⏠','⏡','⌚','⌛','⏰','⏱','⏲','⏳','⌬','⌭','⌮','⌯','⌰','⌱','⌲','⌳','⌴','⌵','⌶','⌷','⌸','⌹','⌺','⌻','⌼','⌽','⌾','⌿','⍀'],
    'Music': ['♩','♪','♫','♬','♭','♮','♯','𝄀','𝄁','𝄂','𝄃','𝄄','𝄅','𝄆','𝄇','𝄈','𝄉','𝄊','𝄋','𝄌','𝄍','𝄎','𝄏','𝄐','𝄑','𝄒','𝄓','𝄔','𝄕','𝄖','𝄗','𝄘','𝄙','𝄚','🎵','🎶','🎼','🎹','🎸','🎷','🎺','🎻','🥁','🪕','🪗'],
    'Misc': ['☀','☁','☂','☃','☄','★','☆','☎','☏','☐','☑','☒','☓','☔','☕','☘','☙','☚','☛','☜','☝','☞','☟','☠','☡','☢','☣','☤','☥','☦','☧','☨','☩','☪','☫','☬','☭','☮','☯','☰','☱','☲','☳','☴','☵','☶','☷','♔','♕','♖','♗','♘','♙','♚','♛','♜','♝','♞','♟','♠','♡','♢','♣','♤','♥','♦','♧'],
};
const SYMBOL_TAB_META = [
    {id: 'Arrows', label: 'Arrows', icon: 'go-next-symbolic'},
    {id: 'Math', label: 'Math', icon: 'accessories-calculator-symbolic'},
    {id: 'Currency', label: 'Currency', icon: 'emblem-money-symbolic'},
    {id: 'Punctuation', label: 'Punctuation', icon: 'format-text-italic-symbolic'},
    {id: 'Shapes', label: 'Shapes', icon: 'emblem-photos-symbolic'},
    {id: 'Technical', label: 'Technical', icon: 'input-keyboard-symbolic'},
    {id: 'Music', label: 'Music', icon: 'audio-x-generic-symbolic'},
    {id: 'Misc', label: 'Misc', icon: 'view-more-symbolic'},
];

// Picker modes
const PICKER_MODES = [
    {id: 'emoji', label: 'Emoji', icon: 'face-smile-symbolic'},
    {id: 'kaomoji', label: 'Kaomoji', icon: 'face-cool-symbolic'},
    {id: 'symbols', label: 'Symbols', icon: 'accessories-character-map-symbolic'},
    {id: 'gif', label: 'GIF', icon: 'image-x-generic-symbolic'},
];

const MAIN_TABS = [
    {id: 'history', label: 'History', icon: 'view-list-symbolic'},
    ...PICKER_MODES,
];

class HistoryStore {
    constructor(settings) {
        this._settings = settings;
        this.entries = [];
        this._loadFromDisk();
    }

    _ensureCacheDir() {
        const dir = GLib.path_get_dirname(HISTORY_FILE);
        if (!GLib.file_test(dir, GLib.FileTest.IS_DIR)) {
            GLib.mkdir_with_parents(dir, 0o755);
        }
    }

    _loadFromDisk() {
        if (!this._settings.get_boolean('persist-history')) {
            this.entries = [];
            return;
        }
        try {
            const file = Gio.File.new_for_path(HISTORY_FILE);
            const [, bytes] = file.load_contents(null);
            const parsed = JSON.parse(bytes.toString());
            if (Array.isArray(parsed)) {
                this.entries = parsed.map(e => {
                    if (typeof e === 'string') {
                        return {type: 'text', text: e, pinned: false, ts: Date.now()};
                    }
                    if (e.type === 'text') {
                        return {...e, html: e.html ?? null, rtf: e.rtf ?? null};
                    }
                    return e;
                });
            }
        } catch (e) {
            this.entries = [];
        }
    }

    _saveToDisk() {
        if (!this._settings.get_boolean('persist-history')) {
            return;
        }
        try {
            this._ensureCacheDir();
            const file = Gio.File.new_for_path(HISTORY_FILE);
            const data = JSON.stringify(this.entries);
            file.replace_contents(data, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        } catch (e) {
            log(`clipboardpopup: failed to save history ${e}`);
        }
    }

    _dedupe(predicate) {
        this.entries = this.entries.filter(e => !predicate(e));
    }

    addText(text, source, html, rtf) {
        if (!text || !text.trim()) {
            return;
        }
        const normalized = text.replace(/\s+/g, ' ').trim();
        const dedupeKey = normalized.toLowerCase();
        this._dedupe(e => e.type === 'text' && (e.text?.toLowerCase?.() === dedupeKey));
        const entry = {type: 'text', text: normalized, html: html || null, rtf: rtf || null, pinned: false, ts: Date.now(), source};
        this.entries.unshift(entry);
        this._prune();
        this._saveToDisk();
    }

    addImage(base64, meta, source, hash) {
        if (!base64) {
            return;
        }
        const key = hash ?? base64;
        this._dedupe(e => e.type === 'image' && (e.hash === key || e.data === base64));
        const entry = {type: 'image', data: base64, pinned: false, ts: Date.now(), width: meta.width, height: meta.height, source, hash: key};
        this.entries.unshift(entry);
        this._prune();
        this._saveToDisk();
    }

    togglePin(index) {
        if (index < 0 || index >= this.entries.length) {
            return;
        }
        this.entries[index].pinned = !this.entries[index].pinned;
        this._saveToDisk();
    }

    clear() {
        this.entries = [];
        this._saveToDisk();
    }

    clearUnpinned() {
        this.entries = this.entries.filter(e => e.pinned);
        this._saveToDisk();
    }

    unpinAll() {
        this.entries.forEach(e => e.pinned = false);
        this._saveToDisk();
    }

    remove(index) {
        if (index < 0 || index >= this.entries.length) {
            return;
        }
        this.entries.splice(index, 1);
        this._saveToDisk();
    }

    _prune() {
        const max = this._settings.get_int('history-size');
        const pinned = this.entries.filter(e => e.pinned);
        const rest = this.entries.filter(e => !e.pinned).slice(0, Math.max(0, max - pinned.length));
        this.entries = [...pinned.sort((a, b) => b.ts - a.ts), ...rest.sort((a, b) => b.ts - a.ts)];
    }
}

class ClipboardPopup {
    constructor(extension, clipboard, history, settings) {
        this._extension = extension;
        this._clipboard = clipboard;
        this._history = history;
        this._settings = settings;
        this._emojiRecents = this._settings.get_strv('emoji-recents') || [];
        this._visible = false;
        this._visibleEntries = [];
        this._focusedListIndex = null;
        this._buildUi();
    }

    _confirm(message, confirmLabel, callback) {
        const dialog = new ModalDialog.ModalDialog({styleClass: 'clipboard-popup-confirm'});
        const content = new St.BoxLayout({vertical: true, style_class: 'clipboard-popup'});
        content.add_child(new St.Label({text: message, x_align: Clutter.ActorAlign.START}));
        dialog.contentLayout.add_child(content);
        dialog.setButtons([
            {
                label: 'Cancel',
                action: () => dialog.close(),
                key: Clutter.KEY_Escape,
            },
            {
                label: confirmLabel,
                default: true,
                action: () => { dialog.close(); callback(); },
            },
        ]);
        dialog.open();
    }

    _buildUi() {
        this._container = new St.BoxLayout({
            vertical: true,
            style_class: 'clipboard-popup popup-menu-content popup-menu',
            reactive: true,
            track_hover: true,
            can_focus: true,
        });

        // Header: icon tabs on left, close button on right
        const header = new St.BoxLayout({vertical: false, style_class: 'header', x_expand: true});
        
        // Tab bar in header (icons only)
        this._mainTabBar = new St.BoxLayout({vertical: false, style_class: 'header-tabs', x_expand: true});
        this._mainTabButtons = new Map();
        MAIN_TABS.forEach(tab => {
            const btn = new St.Button({
                child: new St.Icon({icon_name: tab.icon, icon_size: 18}),
                style_class: 'header-tab popup-menu-item',
                can_focus: true,
                reactive: true,
                accessible_name: tab.label,
            });
            btn.connect('clicked', () => this._switchMainTab(tab.id));
            this._mainTabButtons.set(tab.id, btn);
            this._mainTabBar.add_child(btn);
        });
        header.add_child(this._mainTabBar);

        // Spacer
        header.add_child(new St.Widget({x_expand: true}));

        // Close button (right side)
        this._closeButton = new St.Button({
            child: new St.Icon({icon_name: 'window-close-symbolic', icon_size: 16}),
            style_class: 'header-close popup-menu-item',
            reactive: true,
            can_focus: true,
            accessible_name: 'Close',
        });
        this._closeButton.connect('clicked', () => this.hide());
        header.add_child(this._closeButton);

        this._container.add_child(header);

        // History toolbar (clear, pause) - only visible in history tab
        this._historyToolbar = new St.BoxLayout({vertical: false, style_class: 'history-toolbar', x_expand: true});
        
        this._pauseBadge = new St.Label({
            text: 'Paused',
            style_class: 'badge paused',
            visible: false,
            x_align: Clutter.ActorAlign.START,
        });
        this._historyToolbar.add_child(this._pauseBadge);
        
        // Spacer
        this._historyToolbar.add_child(new St.Widget({x_expand: true}));

        this._clearButton = new St.Button({
            child: new St.Icon({icon_name: 'edit-clear-symbolic', icon_size: 16}),
            style_class: 'toolbar-btn popup-menu-item',
            reactive: true,
            can_focus: true,
            accessible_name: 'Clear history',
        });
        this._clearButton.connect('clicked', () => {
            this._confirm('Clear all unpinned items?', 'Clear', () => {
                this._history.clearUnpinned();
                this.refresh();
            });
        });
        this._historyToolbar.add_child(this._clearButton);

        this._unpinAllButton = new St.Button({
            child: new St.Icon({icon_name: 'emblem-ok-symbolic', icon_size: 16}),
            style_class: 'toolbar-btn popup-menu-item',
            reactive: true,
            can_focus: true,
            visible: false,
            accessible_name: 'Unpin all',
        });
        this._unpinAllButton.connect('clicked', () => {
            this._confirm('Unpin all items?', 'Unpin', () => {
                this._history.unpinAll();
                this.refresh();
            });
        });
        this._historyToolbar.add_child(this._unpinAllButton);

        this._pauseButton = new St.Button({
            child: new St.Icon({icon_name: 'media-playback-pause-symbolic', icon_size: 16}),
            style_class: 'toolbar-btn popup-menu-item',
            reactive: true,
            can_focus: true,
            accessible_name: 'Pause capture',
        });
        this._pauseButton.connect('clicked', () => this._togglePause());
        this._historyToolbar.add_child(this._pauseButton);

        this._container.add_child(this._historyToolbar);

        // Simple search entry to filter visible items.
        this._search = new St.Entry({
            hint_text: 'Search…',
            can_focus: true,
            x_expand: true,
            style_class: 'popup-menu-item',
        });
        this._search.clutter_text.connect('text-changed', () => this.refresh());
        this._container.add_child(this._search);

        this._list = new St.BoxLayout({vertical: true});
        this._scroll = new St.ScrollView({
            style_class: 'scroll-view',
            overlay_scrollbars: true,
            x_expand: true,
            y_expand: true,
        });
        this._scroll.set_child(this._list);
        this._container.add_child(this._scroll);

        this._switchMainTab('history');

        this._eventIds = [];
    }

    _formatEntry(entry) {
        if (entry.type === 'image') {
            return 'Image';
        }
        const text = entry.text.replace(/\s+/g, ' ').trim();
        return text.length > MAX_PREVIEW_CHARS ? `${text.slice(0, MAX_PREVIEW_CHARS - 3)}...` : text;
    }

    _formatMeta(entry) {
        if (entry.pinned) {
            return 'Pinned';
        }
        const when = GLib.DateTime.new_from_unix_local(entry.ts / 1000).format('%Y-%m-%d %H:%M');
        if (entry.source?.appName) {
            return `${entry.source.appName} • ${when}`;
        }
        return when;
    }

    refresh() {
        this._list.destroy_all_children();
        const query = this._search?.get_text().toLowerCase().trim() || '';
        const filtered = query
            ? this._history.entries.filter(e => (e.type === 'text' ? e.text : '').toLowerCase().includes(query))
            : this._history.entries;

        this._visibleEntries = filtered.map(e => this._history.entries.indexOf(e));

        filtered.forEach((entry, index) => {
            const button = new St.Button({
                style_class: 'item popup-menu-item',
                reactive: true,
                can_focus: true,
                x_align: Clutter.ActorAlign.FILL,
                x_expand: true,
            });

            const row = new St.BoxLayout({vertical: true, x_expand: true});
            const primaryLine = new St.BoxLayout({vertical: false, x_expand: true});
            const primaryLabel = new St.Label({text: this._formatEntry(entry), style_class: 'primary', x_align: Clutter.ActorAlign.START, x_expand: true});
            primaryLine.add_child(primaryLabel);
            const pinIcon = new St.Icon({icon_name: entry.pinned ? 'emblem-important-symbolic' : 'emblem-ok-symbolic', icon_size: 16});
            const pinButton = new St.Button({child: pinIcon, style_class: 'system-menu-action popup-menu-item', can_focus: true, reactive: true});
            pinButton.connect('clicked', () => {
                const idx = this._history.entries.indexOf(entry);
                this._history.togglePin(idx);
                this.refresh();
            });
            primaryLine.add_child(pinButton);
            row.add_child(primaryLine);

            const metaText = entry.type === 'image'
                ? (entry.pinned ? 'Pinned' : (entry.width && entry.height ? `${entry.width}×${entry.height}` : 'Image'))
                : this._formatMeta(entry);
            row.add_child(new St.Label({text: metaText, style_class: 'secondary', x_align: Clutter.ActorAlign.START}));

            if (entry.type === 'image') {
                const thumb = this._makeThumb(entry);
                if (thumb)
                    row.add_child(thumb);
            }
            button.set_child(row);

            button.connect('clicked', () => this._activate(entry));
            button.connect('button-press-event', (_b, ev) => {
                if (ev.get_button && ev.get_button() === 3) {
                    this._activate(entry, {plainText: true});
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });
            button.connect('key-focus-in', () => {
                this._focusedListIndex = index;
                this._focusedIndex = this._history.entries.indexOf(entry);
            });
            this._list.add_child(button);
        });

        if (this._list.get_n_children() > 0) {
            const first = this._list.get_child_at_index(0);
            if (first) {
                first.grab_key_focus();
                this._focusedListIndex = 0;
                this._focusedIndex = this._visibleEntries[0];
            }
        }

        const hasPins = this._history.entries.some(e => e.pinned);
        this._unpinAllButton.visible = hasPins;

        this._updatePauseIcon();

        // Keep focus sane for keyboard navigation.
        if (this._search && !this._visible) {
            this._search.grab_key_focus();
        } else if (first && this._focusedListIndex === null) {
            first.grab_key_focus();
            this._focusedListIndex = 0;
            this._focusedIndex = this._visibleEntries[0];
        }
    }

    _makeThumb(entry) {
        try {
            const bytes = GLib.base64_decode(entry.data);
            const gbytes = GLib.Bytes.new(bytes);
            const stream = Gio.MemoryInputStream.new_from_bytes(gbytes);
            const pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream, null);
            const scaled = pixbuf.scale_simple(THUMB_SIZE, THUMB_SIZE, GdkPixbuf.InterpType.BILINEAR);
            const [, buf] = scaled.save_to_bufferv('png', [], []);
            const iconBytes = GLib.Bytes.new(buf);
            const icon = new Gio.BytesIcon({bytes: iconBytes});
            return new St.Icon({gicon: icon, icon_size: THUMB_SIZE, style_class: 'thumb'});
        } catch (e) {
            return null;
        }
    }

    _computeAnchorPosition() {
        const margin = 12;
        const popupW = 380;
        const popupH = 400;
        const positionMode = this._settings.get_string('popup-position') || 'window';

        let monitorIndex = Main.layoutManager.primaryIndex ?? 0;
        let anchorX = null;
        let anchorY = null;

        // Mouse-based positioning
        if (positionMode === 'mouse') {
            const [stageX, stageY] = global.get_pointer();
            // Get monitor at pointer
            if (global.display.get_current_monitor) {
                monitorIndex = global.display.get_current_monitor();
            }
            anchorX = stageX - 30;
            anchorY = stageY + 20;
        } else {
            // Window-based positioning (Windows 11 style)
            const focusedWindow = global.display.get_focus_window?.() || global.display.focus_window;

            if (focusedWindow) {
                const winMonitor = focusedWindow.get_monitor?.() ?? monitorIndex;
                monitorIndex = winMonitor;

                const frameRect = focusedWindow.get_frame_rect?.() || focusedWindow.get_buffer_rect?.();
                if (frameRect) {
                    anchorX = frameRect.x + Math.floor(frameRect.width / 2) - Math.floor(popupW / 2);
                    anchorY = frameRect.y + 60;
                }
            }
        }

        // Get work area for the target monitor
        const workArea = Main.layoutManager.getWorkAreaForMonitor
            ? Main.layoutManager.getWorkAreaForMonitor(monitorIndex)
            : Main.layoutManager.monitors[monitorIndex];

        // 2. If no anchor, fall back to screen center
        if (anchorX === null || anchorY === null) {
            anchorX = workArea.x + Math.floor(workArea.width / 2) - Math.floor(popupW / 2);
            anchorY = workArea.y + Math.floor(workArea.height / 3);
        }

        // 3. Clamp to work area bounds
        const maxW = workArea ? workArea.width - margin * 2 : popupW;
        const maxH = workArea ? workArea.height - margin * 2 : popupH;
        const clampedW = Math.max(300, Math.min(popupW, maxW));
        const clampedH = Math.max(260, Math.min(popupH, maxH));

        let x = anchorX;
        let y = anchorY;

        // Edge handling: flip/shift if near edges
        if (workArea) {
            const maxX = workArea.x + workArea.width - clampedW - margin;
            const maxY = workArea.y + workArea.height - clampedH - margin;
            const minX = workArea.x + margin;
            const minY = workArea.y + margin;

            // If popup would go below work area, flip above anchor
            if (y + clampedH > workArea.y + workArea.height - margin) {
                y = Math.max(minY, y - clampedH - 60);
            }

            x = Math.min(Math.max(minX, x), maxX);
            y = Math.min(Math.max(minY, y), maxY);
        }

        const scrollH = Math.max(180, clampedH - 120);
        return {x, y, popupW: clampedW, scrollH};
    }

    toggle() {
        this._visible ? this.hide() : this.show();
    }

    isVisible() {
        return this._visible;
    }

    show() {
        if (this._visible)
            return;
        this.refresh();
        // Windows 11-style anchoring: caret → window → screen
        const pos = this._computeAnchorPosition();
        const {x, y, popupW, scrollH} = pos;
        this._container.set_width(popupW);
        this._container.set_height(-1);
        if (this._scroll) {
            this._scroll.set_height(scrollH);
        }
        this._container.set_position(x, y);
        Main.layoutManager.addChrome(this._container, {affectsInputRegion: false});
        this._visible = true;
        this._extension?.onPopupVisibilityChanged?.(true);

        // Track signal sources for cleanup
        this._containerKeyId = this._container.connect('key-press-event', (_, event) => this._onKeyPress(event));
        this._stageClickId = global.stage.connect('button-press-event', (_, event) => {
            if (!this._container.contains(event.get_source())) {
                this.hide();
                return Clutter.EVENT_PROPAGATE;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Close on focus loss (clicking another window)
        this._focusWindowId = global.display.connect('notify::focus-window', () => {
            if (this._visible) {
                this.hide();
            }
        });

        // Focus the search field for immediate keyboard input
        this._search?.grab_key_focus();
    }

    hide() {
        if (!this._visible)
            return;
        if (this._containerKeyId) {
            this._container.disconnect(this._containerKeyId);
            this._containerKeyId = null;
        }
        if (this._stageClickId) {
            global.stage.disconnect(this._stageClickId);
            this._stageClickId = null;
        }
        if (this._focusWindowId) {
            global.display.disconnect(this._focusWindowId);
            this._focusWindowId = null;
        }
        Main.layoutManager.removeChrome(this._container);
        this._visible = false;
        this._extension?.onPopupVisibilityChanged?.(false);
    }

    _onKeyPress(event) {
        const symbol = event.get_key_symbol();
        const state = event.get_state();
        const shift = state & Clutter.ModifierType.SHIFT_MASK;
        const focus = global.stage.get_key_focus();
        if (symbol === Clutter.KEY_Escape) {
            this.hide();
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Tab) {
            if (shift) {
                this._search?.grab_key_focus();
            } else {
                const firstItem = this._list.get_children()[0];
                firstItem?.grab_key_focus();
                this._focusedListIndex = 0;
                this._focusedIndex = this._visibleEntries[0];
            }
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Up || symbol === Clutter.KEY_Down) {
            if (focus === this._search && symbol === Clutter.KEY_Down) {
                this._focusedListIndex = 0;
                this._moveFocus(0);
                return Clutter.EVENT_STOP;
            }
            this._moveFocus(symbol === Clutter.KEY_Down ? 1 : -1);
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Left || symbol === Clutter.KEY_Right) {
            if (this._emojiPane) {
                const idx = EMOJI_TAB_META.findIndex(t => t.id === this._activeEmojiCat);
                if (idx >= 0) {
                    const dir = symbol === Clutter.KEY_Right ? 1 : -1;
                    const next = (idx + dir + EMOJI_TAB_META.length) % EMOJI_TAB_META.length;
                    this._activeEmojiCat = EMOJI_TAB_META[next].id;
                    this._toggleEmoji(false, this._activeEmojiCat);
                }
                return Clutter.EVENT_STOP;
            }
        }
        if ((event.get_state() & Clutter.ModifierType.CONTROL_MASK) && symbol === Clutter.KEY_p) {
            if (this._focusedIndex !== undefined) {
                this._history.togglePin(this._focusedIndex);
                this.refresh();
            }
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Delete || symbol === Clutter.KEY_KP_Delete) {
            if (this._focusedIndex !== undefined) {
                this._history.remove(this._focusedIndex);
                this.refresh();
            }
            return Clutter.EVENT_STOP;
        }
        if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter) {
            if (this._focusedIndex !== undefined) {
                const entry = this._history.entries[this._focusedIndex];
                if (entry) {
                    const shift = event.get_state() & Clutter.ModifierType.SHIFT_MASK;
                    this._activate(entry, {plainText: !!shift});
                }
            }
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _moveFocus(delta) {
        const count = this._list.get_n_children();
        if (count === 0) {
            return;
        }
        let next = this._focusedListIndex ?? 0;
        next = Math.max(0, Math.min(count - 1, next + delta));
        const child = this._list.get_child_at_index(next);
        if (child) {
            child.grab_key_focus();
            this._focusedListIndex = next;
            this._focusedIndex = this._visibleEntries[next];
        }
    }

    _activate(entry, opts = {}) {
        const plain = !!opts.plainText || this._settings.get_boolean('paste-as-plain-text');
        if (entry.type === 'image') {
            if (plain) {
                Main.notify('Cannot paste image as plain text.');
            }
            this._setImage(entry);
        } else {
            const text = entry.text;
            if (!plain && (entry.html || entry.rtf)) {
                const rich = entry.html ? {mime: 'text/html', data: entry.html} : {mime: 'text/rtf', data: entry.rtf};
                try {
                    const bytes = ByteArray.fromString(rich.data);
                    const gbytes = GLib.Bytes.new(bytes);
                    this._clipboard.set_content(St.ClipboardType.CLIPBOARD, rich.mime, gbytes);
                } catch (e) {
                    this._clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
                }
                this._clipboard.set_text(St.ClipboardType.PRIMARY, text);
            } else {
                this._clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
                this._clipboard.set_text(St.ClipboardType.PRIMARY, text);
            }
        }
        this.hide();
        if (this._settings.get_boolean('auto-paste')) {
            this._maybeAutoPaste();
        }
    }

    _maybeAutoPaste() {
        // Auto-paste is only possible on X11 with xdotool available.
        const isWayland = (global.display.is_wayland_compositor && global.display.is_wayland_compositor()) ||
            (Meta.is_wayland_compositor && Meta.is_wayland_compositor());
        if (isWayland) {
            Main.notify('Auto-paste is unavailable on Wayland for security reasons.');
            return;
        }
        const xdotool = GLib.find_program_in_path('xdotool');
        if (!xdotool) {
            Main.notify('Install xdotool to enable auto-paste.');
            return;
        }
        Util.spawn([xdotool, 'key', '--clearmodifiers', 'ctrl+v']);
    }

    _recordEmojiRecent(ch) {
        if (!ch)
            return;
        this._emojiRecents = [ch, ...this._emojiRecents.filter(e => e !== ch)].slice(0, MAX_EMOJI_RECENTS);
        try {
            this._settings.set_strv('emoji-recents', this._emojiRecents);
        } catch (e) {
            // Persistence failure is non-fatal; ignore.
        }
    }

    _toggleEmoji(forceShow = null, forceCat = null) {
        this._togglePicker('emoji', forceShow, forceCat);
    }

    _switchMainTab(tabId) {
        this._activeMainTab = tabId;
        this._updateMainTabStates();
        const showHistory = tabId === 'history';
        this._setHistoryVisible(showHistory);

        if (showHistory) {
            if (this._pickerPane && this._pickerPane.get_parent()) {
                this._pickerPane.destroy();
                this._pickerPane = null;
            }
            this._search?.grab_key_focus();
            return;
        }

        this._togglePicker(tabId, true);
    }

    _setHistoryVisible(show) {
        [this._search, this._scroll, this._historyToolbar].forEach(actor => {
            if (actor)
                actor.visible = show;
        });
    }

    _updateMainTabStates() {
        if (!this._mainTabButtons)
            return;
        this._mainTabButtons.forEach((btn, id) => {
            if (id === this._activeMainTab) {
                btn.add_style_class_name('active');
            } else {
                btn.remove_style_class_name('active');
            }
        });
    }

    _togglePicker(mode = 'emoji', forceShow = null, forceCat = null) {
        const wantsShow = forceShow !== null ? forceShow : !(this._pickerPane && this._pickerPane.get_parent());
        if (!wantsShow) {
            if (this._pickerPane && this._pickerPane.get_parent()) {
                this._pickerPane.destroy();
                this._pickerPane = null;
            }
            return;
        }
        
        // Remove existing picker pane
        if (this._pickerPane && this._pickerPane.get_parent()) {
            this._pickerPane.destroy();
        }
        
        this._activePickerMode = mode;
        this._pickerPane = new St.BoxLayout({vertical: true, style_class: 'emoji-pane', x_expand: true});
        
        // Mode tabs (emoji, kaomoji, symbols, GIF)
        const modeTabs = new St.BoxLayout({vertical: false, style_class: 'emoji-tabs picker-mode-tabs', x_expand: true});
        const modeButtons = new Map();
        
        PICKER_MODES.forEach(m => {
            const modeIcon = new St.Icon({icon_name: m.icon, icon_size: 16});
            const modeBtn = new St.Button({child: modeIcon, style_class: 'emoji-tab popup-menu-item', can_focus: true, accessible_name: m.label});
            if (m.id === mode) modeBtn.add_style_class_name('active');
            modeButtons.set(m.id, modeBtn);
            modeBtn.connect('clicked', () => {
                this._togglePicker(m.id, true);
            });
            modeTabs.add_child(modeBtn);
        });
        
        this._pickerPane.add_child(modeTabs);
        
        // Render content based on mode
        if (mode === 'gif') {
            this._renderGifPicker(this._pickerPane);
        } else {
            this._renderCharacterPicker(this._pickerPane, mode, forceCat);
        }
        
        // Make emoji pane reference point to picker pane for compatibility
        this._emojiPane = this._pickerPane;
        this._container.add_child(this._pickerPane);
    }
    
    _renderCharacterPicker(pane, mode, forceCat) {
        let categories, tabMeta, dataSource, searchHint, emptyMsg;
        
        if (mode === 'emoji') {
            categories = EMOJI_TAB_META;
            dataSource = EMOJI_CATEGORIES;
            searchHint = 'Search emoji';
            emptyMsg = 'No emoji found';
        } else if (mode === 'kaomoji') {
            categories = KAOMOJI_TAB_META;
            dataSource = KAOMOJI_CATEGORIES;
            searchHint = 'Search kaomoji';
            emptyMsg = 'No kaomoji found';
        } else if (mode === 'symbols') {
            categories = SYMBOL_TAB_META;
            dataSource = SYMBOL_CATEGORIES;
            searchHint = 'Search symbols';
            emptyMsg = 'No symbols found';
        } else {
            return;
        }
        
        const tabs = new St.BoxLayout({vertical: false, style_class: 'emoji-tabs'});
        const search = new St.Entry({hint_text: searchHint, can_focus: true, x_expand: true, style_class: 'popup-menu-item'});
        const list = new St.BoxLayout({vertical: true, style_class: 'emoji-list'});
        const scroll = new St.ScrollView({style_class: 'scroll-view', overlay_scrollbars: true, height: 200});
        scroll.set_child(list);

        const catIds = mode === 'emoji' ? categories.map(m => m.id) : categories.map(m => m.id);
        const defaultCat = mode === 'emoji' && this._emojiRecents?.length ? 'Recents' : catIds[0];
        
        if (!this._activeCats) this._activeCats = {};
        if (forceCat && catIds.includes(forceCat)) {
            this._activeCats[mode] = forceCat;
        }
        if (!this._activeCats[mode] || !catIds.includes(this._activeCats[mode])) {
            this._activeCats[mode] = defaultCat;
        }
        
        const tabButtons = new Map();

        const render = () => {
            list.destroy_all_children();
            const q = search.get_text().toLowerCase();
            const isKaomoji = mode === 'kaomoji';
            const itemsPerRow = isKaomoji ? 4 : 8;
            const btnClass = isKaomoji ? 'kaomoji-btn popup-menu-item' : 'emoji-btn popup-menu-item';

            const addSection = (title, items) => {
                if (!items.length) return;
                list.add_child(new St.Label({text: title, style_class: 'emoji-section-title', x_align: Clutter.ActorAlign.START}));
                const grid = new St.BoxLayout({vertical: true, style_class: 'emoji-grid', x_expand: true});
                let row = null;
                items.forEach((item, idx) => {
                    if (idx % itemsPerRow === 0) {
                        row = new St.BoxLayout({vertical: false, style_class: 'emoji-grid-row', x_expand: true});
                        grid.add_child(row);
                    }
                    const btn = new St.Button({label: item.ch, style_class: btnClass, can_focus: true, accessible_name: `${item.ch} ${item.cat}`});
                    btn.connect('clicked', () => {
                        const source = {appName: mode.charAt(0).toUpperCase() + mode.slice(1), appId: mode, wmClass: mode};
                        this._history.addText(item.ch, source, null, null);
                        if (mode === 'emoji') this._recordEmojiRecent(item.ch);
                        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, item.ch);
                        this._clipboard.set_text(St.ClipboardType.PRIMARY, item.ch);
                        this.hide();
                    });
                    row.add_child(btn);
                });
                list.add_child(grid);
            };

            if (q) {
                // Search all categories
                if (mode === 'emoji' && this._emojiRecents?.length) {
                    const recentsPool = this._emojiRecents
                        .map(ch => ({cat: 'Recents', ch}))
                        .filter(item => item.ch.toLowerCase().includes(q));
                    addSection('Recents', recentsPool);
                }
                categories.filter(m => m.id !== 'Recents').forEach(meta => {
                    const items = (dataSource[meta.id] || [])
                        .map(e => ({cat: meta.label, ch: e}))
                        .filter(item => item.ch.toLowerCase().includes(q));
                    addSection(meta.label, items);
                });
            } else {
                const activeCat = this._activeCats[mode];
                if (mode === 'emoji' && activeCat === 'Recents') {
                    const items = (this._emojiRecents || []).map(ch => ({cat: 'Recents', ch}));
                    if (items.length) addSection('Recents', items);
                    else list.add_child(new St.Label({text: 'No recent emoji yet', x_align: Clutter.ActorAlign.START}));
                } else {
                    const items = (dataSource[activeCat] || []).map(e => ({cat: activeCat, ch: e}));
                    const meta = categories.find(m => m.id === activeCat);
                    addSection(meta?.label || activeCat, items);
                }
            }

            if (!list.get_children().length) {
                list.add_child(new St.Label({text: emptyMsg, x_align: Clutter.ActorAlign.START}));
            }
        };

        const updateTabs = () => {
            tabButtons.forEach((btn, cat) => {
                if (cat === this._activeCats[mode]) btn.add_style_class_name('active');
                else btn.remove_style_class_name('active');
            });
        };

        categories.forEach(meta => {
            const tabIcon = new St.Icon({icon_name: meta.icon, icon_size: 16});
            const tab = new St.Button({child: tabIcon, style_class: 'emoji-tab popup-menu-item', can_focus: true, accessible_name: `${meta.label} category`});
            tabButtons.set(meta.id, tab);
            tab.connect('clicked', () => {
                this._activeCats[mode] = meta.id;
                updateTabs();
                render();
            });
            tabs.add_child(tab);
        });

        pane.add_child(tabs);
        pane.add_child(search);
        pane.add_child(scroll);
        search.clutter_text.connect('text-changed', render);
        search.grab_key_focus();
        updateTabs();
        render();
    }
    
    _renderGifPicker(pane) {
        const search = new St.Entry({hint_text: 'Search GIFs (powered by Tenor)', can_focus: true, x_expand: true, style_class: 'popup-menu-item'});
        const list = new St.BoxLayout({vertical: true, style_class: 'emoji-list'});
        const scroll = new St.ScrollView({style_class: 'scroll-view', overlay_scrollbars: true, height: 200});
        scroll.set_child(list);
        
        const statusLabel = new St.Label({text: 'Type to search for GIFs', x_align: Clutter.ActorAlign.START, style_class: 'emoji-section-title'});
        list.add_child(statusLabel);
        
        let searchTimeout = null;
        
        const doSearch = () => {
            const q = search.get_text().trim();
            if (!q) {
                list.destroy_all_children();
                list.add_child(new St.Label({text: 'Type to search for GIFs', x_align: Clutter.ActorAlign.START}));
                return;
            }
            
            list.destroy_all_children();
            list.add_child(new St.Label({text: 'Searching...', x_align: Clutter.ActorAlign.START}));
            
            // Tenor API (free tier, limited)
            // Note: For production, you should get your own API key from https://developers.google.com/tenor
            const apiKey = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google's public Tenor API key
            const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${apiKey}&limit=20&media_filter=tinygif`;
            
            const session = new Soup.Session();
            const message = Soup.Message.new('GET', url);
            
            session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (sess, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    const text = new TextDecoder().decode(bytes.get_data());
                    const data = JSON.parse(text);
                    
                    list.destroy_all_children();
                    
                    if (!data.results || data.results.length === 0) {
                        list.add_child(new St.Label({text: 'No GIFs found', x_align: Clutter.ActorAlign.START}));
                        return;
                    }
                    
                    const grid = new St.BoxLayout({vertical: true, style_class: 'emoji-grid gif-grid', x_expand: true});
                    let row = null;
                    
                    data.results.forEach((gif, idx) => {
                        if (idx % 3 === 0) {
                            row = new St.BoxLayout({vertical: false, style_class: 'emoji-grid-row gif-row', x_expand: true});
                            grid.add_child(row);
                        }
                        
                        const gifUrl = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
                        const previewUrl = gif.media_formats?.nanogif?.url || gif.media_formats?.tinygif?.url || gifUrl;
                        
                        const btn = new St.Button({style_class: 'gif-btn popup-menu-item', can_focus: true, accessible_name: gif.content_description || 'GIF'});
                        
                        // Load GIF thumbnail
                        const box = new St.BoxLayout({vertical: true});
                        const spinner = new St.Label({text: '⏳', style: 'font-size: 20px;'});
                        box.add_child(spinner);
                        btn.set_child(box);
                        
                        // Async load the preview image
                        if (previewUrl) {
                            const imgSession = new Soup.Session();
                            const imgMsg = Soup.Message.new('GET', previewUrl);
                            imgSession.send_and_read_async(imgMsg, GLib.PRIORITY_DEFAULT, null, (imgSess, imgRes) => {
                                try {
                                    const imgBytes = imgSession.send_and_read_finish(imgRes);
                                    const gbytes = GLib.Bytes.new(imgBytes.get_data());
                                    const stream = Gio.MemoryInputStream.new_from_bytes(gbytes);
                                    const pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream, null);
                                    const scaled = pixbuf.scale_simple(80, 60, GdkPixbuf.InterpType.BILINEAR);
                                    const [, buf] = scaled.save_to_bufferv('png', [], []);
                                    const iconBytes = GLib.Bytes.new(buf);
                                    const gicon = new Gio.BytesIcon({bytes: iconBytes});
                                    box.destroy_all_children();
                                    box.add_child(new St.Icon({gicon, icon_size: 60}));
                                } catch (imgErr) {
                                    box.destroy_all_children();
                                    box.add_child(new St.Label({text: 'GIF', style: 'font-size: 12px;'}));
                                }
                            });
                        }
                        
                        btn.connect('clicked', () => {
                            // Copy GIF URL to clipboard (most apps accept URLs)
                            const source = {appName: 'GIF', appId: 'gif', wmClass: 'gif'};
                            this._history.addText(gifUrl, source, null, null);
                            this._clipboard.set_text(St.ClipboardType.CLIPBOARD, gifUrl);
                            this._clipboard.set_text(St.ClipboardType.PRIMARY, gifUrl);
                            Main.notify('GIF URL copied to clipboard');
                            this.hide();
                        });
                        
                        row.add_child(btn);
                    });
                    
                    list.add_child(grid);
                    list.add_child(new St.Label({text: 'Click a GIF to copy its URL', x_align: Clutter.ActorAlign.START, style_class: 'emoji-section-title'}));
                } catch (e) {
                    list.destroy_all_children();
                    list.add_child(new St.Label({text: 'Failed to search GIFs. Check your connection.', x_align: Clutter.ActorAlign.START}));
                    log(`clipboardpopup: GIF search error: ${e}`);
                }
            });
        };
        
        search.clutter_text.connect('text-changed', () => {
            if (searchTimeout) GLib.source_remove(searchTimeout);
            searchTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                searchTimeout = null;
                doSearch();
                return GLib.SOURCE_REMOVE;
            });
        });
        
        pane.add_child(search);
        pane.add_child(scroll);
        search.grab_key_focus();
    }

    _togglePause() {
        const paused = !this._settings.get_boolean('pause-capture');
        this._settings.set_boolean('pause-capture', paused);
        this._updatePauseIcon();
        Main.notify(paused ? 'Clipboard capture paused' : 'Clipboard capture resumed');
    }

    _updatePauseIcon() {
        if (!this._pauseButton)
            return;
        const paused = this._settings.get_boolean('pause-capture');
        const icon = paused ? 'media-playback-start-symbolic' : 'media-playback-pause-symbolic';
        this._pauseButton.get_child().set_icon_name(icon);
        this._pauseButton.accessible_name = paused ? 'Resume capture' : 'Pause capture';
        if (this._pauseBadge)
            this._pauseBadge.visible = paused;
    }

    _setImage(entry) {
        try {
            const bytes = GLib.base64_decode(entry.data);
            const gbytes = GLib.Bytes.new(bytes);
            const stream = Gio.MemoryInputStream.new_from_bytes(gbytes);
            const pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream, null);
            if (this._clipboard.set_image) {
                this._clipboard.set_image(St.ClipboardType.CLIPBOARD, pixbuf);
                this._clipboard.set_image(St.ClipboardType.PRIMARY, pixbuf);
            } else {
                // Fallback: set PNG data directly.
                this._clipboard.set_content(St.ClipboardType.CLIPBOARD, 'image/png', gbytes);
                this._clipboard.set_content(St.ClipboardType.PRIMARY, 'image/png', gbytes);
            }
        } catch (e) {
            log(`clipboardpopup: failed to set image ${e}`);
            Main.notify('Failed to set image to clipboard.');
        }
    }
}

export default class ClipboardPopupExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._clipboard = St.Clipboard.get_default();
        this._history = new HistoryStore(this._settings);
        this._popup = new ClipboardPopup(this, this._clipboard, this._history, this._settings);
        this._lastText = null;
        this._lastImage = null;
        this._pollId = 0;
        this._settingsSignals = [];

        // Normalize shortcut to the format expected by Shell (e.g., '<Super>v').
        const shortcuts = this._settings.get_strv('shortcut');
        const normalized = shortcuts.map(s => s.replace(/^super\+/i, '<Super>').replace(/^<super>/i, '<Super>'));
        if (JSON.stringify(shortcuts) !== JSON.stringify(normalized) || normalized.length === 0) {
            this._settings.set_strv('shortcut', normalized.length ? normalized : ['<Super>v']);
        }

        this._bindShortcut();
        this._startPolling();
        this._addQuickToggle();
        this._settingsSignals.push(this._settings.connect('changed::pause-capture', () => {
            this._syncQuickToggle();
            this._showOsd();
        }));
        this._syncQuickToggle();
    }

    _addQuickToggle() {
        this._quickIndicator = new QuickSettings.SystemIndicator();
        this._quickToggle = new QuickSettings.QuickToggle({
            iconName: 'edit-paste-symbolic',
            title: 'Clipboard',
        });
        this._quickToggle.connect('clicked', btn => {
            const enabled = btn.checked;
            this._settings.set_boolean('pause-capture', !enabled);
            if (!enabled) {
                this._popup.hide();
            }
            this._showOsd();
        });
        this._quickIndicator.quickSettingsItems.push(this._quickToggle);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._quickIndicator);
    }

    _removeQuickToggle() {
        if (this._quickIndicator) {
            this._quickIndicator.quickSettingsItems?.forEach(item => item.destroy?.());
            this._quickIndicator.destroy();
        }
        this._quickIndicator = null;
        this._quickToggle = null;
    }

    _syncQuickToggle() {
        if (!this._quickToggle)
            return;
        const enabled = !this._settings.get_boolean('pause-capture');
        this._quickToggle.checked = enabled;
    }

    _showOsd() {
        const enabled = !this._settings.get_boolean('pause-capture');
        const label = enabled ? 'Clipboard history enabled' : 'Clipboard history paused';
        const icon = 'edit-paste-symbolic';
        try {
            Main.osdWindowManager?.show?.(-1, icon, label, enabled ? 1 : 0);
        } catch (e) {
            Main.notify(label);
        }
    }

    disable() {
        this._removeShortcut();
        this._stopPolling();
        this._removeQuickToggle();
        this._settingsSignals?.forEach(id => this._settings.disconnect(id));
        this._settingsSignals = [];
        this._popup?.hide();
        this._popup = null;
        this._history = null;
        this._clipboard = null;
        this._settings = null;
    }

    _bindShortcut() {
        const modes = Shell.ActionMode ? Shell.ActionMode.ALL : (Shell.KeyBindingMode ? Shell.KeyBindingMode.ALL : 1);
        this._removeShortcut();
        const ok = Main.wm.addKeybinding(
            'shortcut',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            modes,
            () => this._popup.toggle()
        );
        if (!ok) {
            log(`clipboardpopup: failed to bind shortcut ${JSON.stringify(this._settings.get_strv('shortcut'))}`);
            Main.notify('Clipboard Popup: failed to bind shortcut. Set one in Preferences (e.g., Super+V).');
        }
    }

    _removeShortcut() {
        if (Main.wm.removeKeybinding) {
            Main.wm.removeKeybinding('shortcut');
        }
    }

    _startPolling() {
        const interval = this._settings.get_int('poll-interval-ms');
        this._pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            this._pollClipboard();
            if (this._settings.get_boolean('track-primary')) {
                this._pollClipboard(St.ClipboardType.PRIMARY);
            }
            this._pollImages();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopPolling() {
        if (this._pollId) {
            GLib.source_remove(this._pollId);
            this._pollId = 0;
        }
    }

    _pollClipboard(type = St.ClipboardType.CLIPBOARD) {
        if (!this._clipboard) {
            return;
        }
        if (this._settings.get_boolean('pause-capture')) {
            return;
        }
        if (this._shouldSkipSecure()) {
            return;
        }
        this._clipboard.get_text(type, (_clip, text) => {
            if (!text) {
                return;
            }
            const fingerprint = `${type}:${text}`;
            if (fingerprint === this._lastText) {
                return;
            }
            this._lastText = fingerprint;
            const source = this._getSourceMeta();
            const cap = this._settings.get_int('max-rich-bytes');
            this._clipboard.get_content(type, 'text/html', (_c2, bytesHtml) => {
                let html = null;
                if (bytesHtml) {
                    try {
                        const arr = ByteArray.toUint8Array(bytesHtml);
                        if (arr.length <= cap)
                            html = ByteArray.toString(bytesHtml);
                    } catch (e) {
                        html = null;
                    }
                }
                this._clipboard.get_content(type, 'text/rtf', (_c3, bytesRtf) => {
                    let rtf = null;
                    if (bytesRtf) {
                        try {
                            const arr = ByteArray.toUint8Array(bytesRtf);
                            if (arr.length <= cap)
                                rtf = ByteArray.toString(bytesRtf);
                        } catch (e) {
                            rtf = null;
                        }
                    }
                    this._history.addText(text, source, html, rtf);
                });
            });
        });
    }

    _pollImages() {
        if (!this._clipboard) {
            return;
        }
        if (this._settings.get_boolean('pause-capture')) {
            return;
        }
        if (this._shouldSkipSecure()) {
            return;
        }
        // Request PNG; on Wayland/X11 this returns bytes when an image is present.
        this._clipboard.get_content(St.ClipboardType.CLIPBOARD, 'image/png', (_clip, bytes) => {
            if (!bytes) {
                return;
            }
            try {
                const arr = ByteArray.toUint8Array(bytes);
                if (!arr || arr.length === 0 || arr.length > MAX_IMAGE_BYTES) {
                    return; // Skip empty or too large.
                }
                const hash = GLib.compute_checksum_for_data(GLib.ChecksumType.MD5, arr);
                const fingerprint = `img:${hash}`;
                if (this._lastImage === fingerprint) {
                    return;
                }
                this._lastImage = fingerprint;
                const gbytes = GLib.Bytes.new(arr);
                const stream = Gio.MemoryInputStream.new_from_bytes(gbytes);
                const pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream, null);
                const b64 = GLib.base64_encode(arr);
                const source = this._getSourceMeta();
                this._history.addImage(b64, {width: pixbuf.get_width(), height: pixbuf.get_height()}, source, hash);
            } catch (e) {
                // Ignore failures quietly to avoid spam.
                return;
            }
        });
    }

    _getSourceMeta() {
        try {
            const tracker = Shell.WindowTracker.get_default();
            const win = global.display?.get_focus_window ? global.display.get_focus_window() : null;
            if (!win) {
                return null;
            }
            const app = tracker.get_window_app(win);
            const appName = app?.get_name();
            const appId = app?.get_id();
            const wmClass = win.get_wm_class();
            if (appName || appId || wmClass) {
                return {appName, appId, wmClass};
            }
        } catch (e) {
            // Swallow; metadata is optional.
        }
        return null;
    }

    _shouldSkipSecure() {
        if (!this._settings.get_boolean('enable-secure-heuristics'))
            return false;
        try {
            const win = global.display?.get_focus_window ? global.display.get_focus_window() : null;
            if (!win) return false;
            const wmClass = (win.get_wm_class() || '').toLowerCase();
            const title = (win.get_title?.() || '').toLowerCase();
            const skip = this._settings.get_strv('skip-wm-classes').map(s => s.toLowerCase());
            const known = [
                'polkit-gnome-authentication-agent-1',
                'gnome-shell',
                'gdm-password',
                'org.gnome.seahorse.application',
                'gnome-keyring-ask',
                '1password',
                '1password-beta',
                'bitwarden',
                'keepass',
                'keepassxc',
                'kwalletd',
                'kwallet5',
                'lastpass',
            ];
            const suspiciousTokens = ['auth', 'password', 'pin', 'unlock', 'login', 'keyring'];
            const matchesToken = token => wmClass.includes(token) || title.includes(token);
            return skip.includes(wmClass) || known.includes(wmClass) || suspiciousTokens.some(matchesToken);
        } catch (e) {
            return false;
        }
    }
}
