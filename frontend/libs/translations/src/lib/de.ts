import type { en } from "./en";
import type { ReplaceConstStringWithString, DeepPartial } from "./util";

type EnglishTranslations = DeepPartial<ReplaceConstStringWithString<(typeof en)["translations"]>>;

const translations = {
    app: {
        name: "Abrechnung",
    },
    common: {
        username: "Username",
        server: "Server",
        email: "E-Mail",
        password: "Passwort",
        repeatPassword: "Passwort wiederholen",
        save: "Speichern",
        yes: "Ja",
        ok: "Ok",
        delete: "Löschen",
        add: "Hinzufügen",
        cancel: "Abbrechen",
        search: "Suche ...",
        name: "Name",
        lastChanged: "Zuletzt geändert",
        lastChangedWithTime: "zuletzt geändert: {{datetime}}",
        value: "Wert",
        date: "Datum",
        description: "Beschreibung",
        sortBy: "Sortieren nach",
        filterByTags: "Nach Tags filtern",
        tag_one: "Tag",
        tag_other: "Tags",
        total: "Summe",
        totalWithColon: "Summe:",
        shared: "Geteilt",
        advanced: "Erweitert",
        price: "Preis",
    },
    groups: {
        addGroup: "Gruppe hinzufügen",
    },
    images: {
        uploadImage: "Bild hochladen",
        chooseImage: "Bild auswählen",
        compressing: "komprimieren ..",
        filename: "Dateiname",
    },
    transactions: {
        createTransaction: "Transaktion erstellen",
        createPurchase: "Einkauf erstellen",
        createTransfer: "Überweisung erstellen",
        noTransactions: "Keine Transaktionen",
        purchase: "Einkauf",
        transfer: "Überweisung",
        transferredFrom: "Von",
        transferredTo: "An",
        paidBy: "Bezahlt von",
        paidFor: "Für wen",
        confirmDeleteTransaction: "Löschen der Transaktion bestätigen",
        confirmDeleteTransactionInfo:
            'Sind Sie sicher, dass Sie die Transaktion "{{transaction.name}}" löschen möchten?',
        list: {
            tabTitle: "{{groupName}} - Transaktionen",
        },
        byFor: "von {{by}}, für {{for}}",
        positions: {
            positions: "Positionen",
            sharedPlusRest: "Geteilt + Rest",
            addPositions: "Position hinzufügen",
            remaining: "Verbleibend:",
        },
    },
    accounts: {
        list: {
            tabTitle: "{{groupName}} - Konten",
        },
    },
    profile: {
        index: {
            tabTitle: "Abrechnung - Profil",
            pageTitle: "Profil",
            guestUserDisclaimer:
                "Sie sind ein Gastbenutzer auf dieser Abrechnung und daher nicht berechtigt, neue Gruppen oder Gruppeneinladungen zu erstellen.",
            registered: "Registriert",
        },
        settings: {
            tabTitle: "Abrechnung - Einstellungen",
            pageTitle: "Einstellungen",
            info: "Diese Einstellungen werden lokal auf Ihrem Gerät gespeichert. Das Löschen des lokalen Speichers Ihres Browsers setzt sie zurück.",
            theme: "Thema",
            themeSystemDefault: "Systemstandard",
            themeDarkMode: "Dark Theme",
            themeLightMode: "Light Theme",
            clearCache: "Cache leeren",
            confirmClearCache:
                "Diese Aktion wird Ihren lokalen Cache löschen. Alle Ihre Einstellungen (diese Seite) werden nicht zurückgesetzt.",
        },
        changePassword: {
            tabTitle: "Abrechnung - Passwort ändern",
            pageTitle: "Passwort ändern",
            success: "Passwort erfolgreich geändert",
            newPassword: "Neues Passwort",
        },
        changeEmail: {
            tabTitle: "Abrechnung - E-Mail ändern",
            pageTitle: "E-Mail ändern",
            success: "E-Mail-Änderung angefordert. Sie sollten bald eine E-Mail mit einem Bestätigungslink erhalten.",
            newEmail: "Neue E-Mail",
        },
    },
    auth: {
        register: {
            header: "Registrieren",
        },
    },
    languages: {
        en: "Englisch",
        de: "Deutsch",
    } as const,
} satisfies EnglishTranslations;

export const de = {
    translations,
} as const;
