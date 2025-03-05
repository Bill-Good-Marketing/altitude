'use no memo';
import DOMPurify from 'isomorphic-dompurify';
import {convert} from "html-to-text";

export function sanitize(str: string) {
    return DOMPurify.sanitize(str, {
        FORCE_BODY: true
    });
}

export function textFromHtml(html: string) {
    return convert(html, {
        wordwrap: false,
        preserveNewlines: true,
        selectors: [
            // Anchor elements
            {
                // CSS Selector
                selector: 'a',
                options: {
                    ignoreHref: true
                }
            },
            {
                selector: 'img',
                format: 'imageFormatter'
            }
        ],
        formatters: {
            imageFormatter: () => {
                return '';
            }
        }
    });
}

export function splitIntoSentences(text: string): string[] {
    const alphabets = "([A-Za-z])";
    const prefixes = "(Mr|St|Mrs|Ms|Dr)[.]";
    const suffixes = "(Inc|Ltd|Jr|Sr|Co)";
    const starters = "(Mr|Mrs|Ms|Dr|Prof|Capt|Cpt|Lt|He\\s|She\\s|It\\s|They\\s|Their\\s|Our\\s|We\\s|But\\s|However\\s|That\\s|This\\s|Wherever)";
    const acronyms = "([A-Z][.][A-Z][.](?:[A-Z][.])?)";
    const websites = "[.](com|net|org|io|gov|edu|me)";
    const digits = "([0-9])";
    const multipleDots = '\\.{2,}';

    text = " " + text + "  ";
    text = text.replace(/\n/g, " ");
    text = text.replace(new RegExp(prefixes, "g"), "$1{prd}");
    text = text.replace(new RegExp(websites, "g"), "{prd}$1");
    text = text.replace(new RegExp(digits + "[.]" + digits, "g"), "$1{prd}$2");
    text = text.replace(new RegExp(multipleDots, "g"), match => "{prd}".repeat(match.length) + "{stop}");
    if (text.includes("Ph.D")) text = text.replace("Ph.D.", "Ph{prd}D{prd}");
    text = text.replace(new RegExp("\\s" + alphabets + "[.] ", "g"), " $1{prd} ");
    text = text.replace(new RegExp(acronyms + " " + starters, "g"), "$1{stop} $2");
    text = text.replace(new RegExp(alphabets + "[.]" + alphabets + "[.]" + alphabets + "[.]", "g"), "$1{prd}$2{prd}$3{prd}");
    text = text.replace(new RegExp(alphabets + "[.]" + alphabets + "[.]", "g"), "$1{prd}$2{prd}");
    text = text.replace(new RegExp(" " + suffixes + "[.] " + starters, "g"), " $1{stop} $2");
    text = text.replace(new RegExp(" " + suffixes + "[.]", "g"), " $1{prd}");
    text = text.replace(new RegExp(" " + alphabets + "[.]", "g"), " $1{prd}");
    text = text.replace(/\./g, ".{stop}");
    text = text.replace(/\?/g, "?{stop}");
    text = text.replace(/!/g, "!{stop}");
    if (text.includes("”")) text = text.replace(/{stop}”/g, "”{stop}");
    if (text.includes("\"")) text = text.replace(/{stop}"/g, "\"{stop}");
    text = text.replace(/{prd}/g, ".");
    let sentences = text.split("{stop}");
    sentences = sentences.map(s => s.trim());
    if (sentences.length && !sentences[sentences.length - 1]) sentences.pop();
    return sentences;
}

export function splitCamelCase(str: string) {
    return str.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// All words capitalized except articles and short prepositions (i.e. "the cat In The Hat" becomes "The Cat in the Hat")
// Prepositions are capitalized if 5 or more characters long
export function toTitleCase(str: string) {
    str = str.replace(/(\s)(\S)/g, (match, p1, p2) => {
        if (p2.toLowerCase() === p2) {
            return p1 + p2.toUpperCase();
        }
        return p1 + p2;
    });

    str = str.replace(/\s(a|an|the|of|in|at|by|for|to|on|with|and|or|but|nor|not|from|into|onto|out|over|as|like|so|than|that|this|less|more|near|next|off|up|upon|via)(?:[.!?,"'@#$%^*()\-\+;:/\\\[\]{}\s]|$)/gi, (match, word) => word.toLowerCase());
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function englishList(strs: string[], connector = 'and') {
    if (strs.length === 0) return '';
    if (strs.length === 1) return strs[0];
    if (strs.length === 2) return strs.join(` ${connector} `);
    return strs.slice(0, -1).join(', ') + `, ${connector} ` + strs[strs.length - 1];
}

export function isEmptyString(str?: string | null) {
    return str == null || str.trim() === '';
}

export function formatPhoneNumber(phone?: string) {
    phone = phone?.replace(/\D/g, '');
    if (phone == null) {
        return null
    }
    if (phone.length === 10) {
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (phone.length > 10) {
        // +1 (123) 456-7890 or +11 (123) 456-7890
        return phone.replace(/(\d{1,3})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    } else {
        return phone;
    }
}

export function isPhoneNumber(phone: string) {
    const stripped = phone.replaceAll(/[\s.+\-()]/g, '');
    return stripped.length <= 15 && !isNaN(Number(stripped)) && stripped.length >= 3; // Partial or full phone number, and is a number
}

export function properArticle(str: string, capitalize?: boolean, lowercaseFirst?: boolean) {
    const a = capitalize ? 'A' : 'a';

    const first = lowercaseFirst ? str.charAt(0).toLowerCase() : str.charAt(0);
    const rest = str.slice(1);

    if ('aeiou'.includes(str.toLowerCase()[0])) {
        return `${a}n ${first}${rest}`;
    }
    return `${a} ${first}${rest}`
}

export function pluralize(str: string) {
    if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('ch') || str.endsWith('sh') || str.endsWith('ss') || str.endsWith('x')) {
        return str + 'es';
    }
    return str + 's';
}