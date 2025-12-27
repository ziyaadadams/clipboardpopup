/* Preferences dialog for Clipboard Popup */
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ClipboardPopupPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // General page
        const generalPage = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });

        // History group
        const historyGroup = new Adw.PreferencesGroup({
            title: 'History',
            description: 'Configure clipboard history storage and behavior',
        });

        const historySizeRow = new Adw.SpinRow({
            title: 'History Size',
            subtitle: 'Maximum number of clipboard entries to keep',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 1,
                page_increment: 10,
            }),
        });
        settings.bind('history-size', historySizeRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        historyGroup.add(historySizeRow);

        const persistRow = new Adw.SwitchRow({
            title: 'Persist History',
            subtitle: 'Save clipboard history across sessions',
        });
        settings.bind('persist-history', persistRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        historyGroup.add(persistRow);

        const pollRow = new Adw.SpinRow({
            title: 'Poll Interval',
            subtitle: 'How often to check clipboard for changes (ms)',
            adjustment: new Gtk.Adjustment({
                lower: 200,
                upper: 5000,
                step_increment: 50,
                page_increment: 100,
            }),
        });
        settings.bind('poll-interval-ms', pollRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        historyGroup.add(pollRow);

        generalPage.add(historyGroup);

        // Capture group
        const captureGroup = new Adw.PreferencesGroup({
            title: 'Capture',
            description: 'Control what gets captured to history',
        });

        const primaryRow = new Adw.SwitchRow({
            title: 'Track Primary Selection',
            subtitle: 'Also record middle-click paste buffer (X11)',
        });
        settings.bind('track-primary', primaryRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        captureGroup.add(primaryRow);

        const pauseRow = new Adw.SwitchRow({
            title: 'Pause Capture',
            subtitle: 'Temporarily stop recording clipboard changes',
        });
        settings.bind('pause-capture', pauseRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        captureGroup.add(pauseRow);

        const richCapRow = new Adw.SpinRow({
            title: 'Rich Text Size Limit',
            subtitle: 'Maximum bytes for HTML/RTF content',
            adjustment: new Gtk.Adjustment({
                lower: 65536,
                upper: 1048576,
                step_increment: 8192,
                page_increment: 65536,
            }),
        });
        settings.bind('max-rich-bytes', richCapRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        captureGroup.add(richCapRow);

        generalPage.add(captureGroup);

        // Security group
        const securityGroup = new Adw.PreferencesGroup({
            title: 'Security',
            description: 'Protect sensitive data from being captured',
        });

        const secureRow = new Adw.SwitchRow({
            title: 'Skip Secure Contexts',
            subtitle: 'Avoid capturing from password dialogs and similar',
        });
        settings.bind('enable-secure-heuristics', secureRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        securityGroup.add(secureRow);

        const skipExpanderRow = new Adw.ExpanderRow({
            title: 'Window Classes to Skip',
            subtitle: 'Always skip capture from these applications',
        });

        const skipEntry = new Gtk.Entry({
            text: settings.get_strv('skip-wm-classes').join(', '),
            placeholder_text: 'e.g., 1password, keepassxc',
            hexpand: true,
            valign: Gtk.Align.CENTER,
            margin_start: 12,
            margin_end: 12,
            margin_top: 8,
            margin_bottom: 8,
        });
        skipEntry.connect('changed', () => {
            const parts = skipEntry.get_text().split(',').map(s => s.trim()).filter(Boolean);
            settings.set_strv('skip-wm-classes', parts);
        });
        const skipRow = new Adw.ActionRow({});
        skipRow.set_child(skipEntry);
        skipExpanderRow.add_row(skipRow);
        securityGroup.add(skipExpanderRow);

        generalPage.add(securityGroup);

        window.add(generalPage);

        // Behavior page
        const behaviorPage = new Adw.PreferencesPage({
            title: 'Behavior',
            icon_name: 'input-keyboard-symbolic',
        });

        // Paste group
        const pasteGroup = new Adw.PreferencesGroup({
            title: 'Pasting',
            description: 'Configure paste behavior',
        });

        const plainRow = new Adw.SwitchRow({
            title: 'Always Paste as Plain Text',
            subtitle: 'Strip formatting when pasting (Shift+Enter always pastes plain)',
        });
        settings.bind('paste-as-plain-text', plainRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        pasteGroup.add(plainRow);

        const autoPasteRow = new Adw.SwitchRow({
            title: 'Auto-paste After Selection',
            subtitle: 'Automatically paste after choosing an item (X11 only)',
        });
        settings.bind('auto-paste', autoPasteRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        pasteGroup.add(autoPasteRow);

        behaviorPage.add(pasteGroup);

        // Popup position group
        const positionGroup = new Adw.PreferencesGroup({
            title: 'Popup Position',
            description: 'Where the clipboard popup appears',
        });

        const positionModel = new Gtk.StringList();
        positionModel.append('Near focused window');
        positionModel.append('Near mouse cursor');

        const positionRow = new Adw.ComboRow({
            title: 'Position Mode',
            subtitle: 'Choose where the popup opens',
            model: positionModel,
        });

        // Set initial value
        const currentPos = settings.get_string('popup-position');
        positionRow.set_selected(currentPos === 'mouse' ? 1 : 0);

        positionRow.connect('notify::selected', () => {
            const sel = positionRow.get_selected();
            settings.set_string('popup-position', sel === 1 ? 'mouse' : 'window');
        });

        positionGroup.add(positionRow);
        behaviorPage.add(positionGroup);

        // Shortcut group
        const shortcutGroup = new Adw.PreferencesGroup({
            title: 'Keyboard Shortcut',
            description: 'Set the key combination to open clipboard history',
        });

        const currentShortcut = settings.get_strv('shortcut');
        const shortcutRow = new Adw.EntryRow({
            title: 'Shortcut',
        });
        shortcutRow.set_text(currentShortcut.length > 0 ? currentShortcut[0] : '<Super>v');
        shortcutRow.connect('changed', () => {
            const text = shortcutRow.get_text().trim();
            if (text) {
                settings.set_strv('shortcut', [text]);
            }
        });
        shortcutGroup.add(shortcutRow);

        const shortcutInfoRow = new Adw.ActionRow({
            title: 'Note',
            subtitle: 'Log out and back in after changing the shortcut. Super+V may be reserved by GNOME; try a different binding if it doesn\'t work.',
            icon_name: 'dialog-information-symbolic',
        });
        shortcutGroup.add(shortcutInfoRow);

        behaviorPage.add(shortcutGroup);

        window.add(behaviorPage);

        // About page
        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });

        const aboutGroup = new Adw.PreferencesGroup();

        const titleRow = new Adw.ActionRow({
            title: 'Clipboard Popup',
            subtitle: 'Windows-style clipboard history for GNOME',
        });
        aboutGroup.add(titleRow);

        const versionRow = new Adw.ActionRow({
            title: 'Version',
            subtitle: '6',
        });
        aboutGroup.add(versionRow);

        const keysRow = new Adw.ExpanderRow({
            title: 'Keyboard Shortcuts',
            subtitle: 'Quick reference for popup controls',
        });

        const keys = [
            ['Enter', 'Copy (with rich text if available)'],
            ['Shift+Enter', 'Copy as plain text'],
            ['Right-click', 'Copy as plain text'],
            ['Ctrl+P', 'Pin/unpin item'],
            ['Delete', 'Remove item'],
            ['Escape', 'Close popup'],
            ['↑/↓', 'Navigate items'],
        ];

        keys.forEach(([key, desc]) => {
            const keyRow = new Adw.ActionRow({
                title: key,
                subtitle: desc,
            });
            keysRow.add_row(keyRow);
        });

        aboutGroup.add(keysRow);

        aboutPage.add(aboutGroup);

        window.add(aboutPage);
    }
}
