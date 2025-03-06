const Reset = "\x1b[0m"
const Bright = "\x1b[1m"
// const Dim = "\x1b[2m"
// const Underscore = "\x1b[4m"
// const Blink = "\x1b[5m"
// const Reverse = "\x1b[7m"
// const Hidden = "\x1b[8m"

// const FgBlack = "\x1b[30m"
const FgRed = "\x1b[31m"
const FgGreen = "\x1b[32m"
const FgYellow = "\x1b[33m"
const FgBlue = "\x1b[34m"
// const FgMagenta = "\x1b[35m"
const FgCyan = "\x1b[36m"
const FgWhite = "\x1b[37m"
const FgGray = "\x1b[90m"

// const BgBlack = "\x1b[40m"
const BgRed = "\x1b[41m"
const BgGreen = "\x1b[42m"
const BgYellow = "\x1b[43m"
const BgBlue = "\x1b[44m"
// const BgMagenta = "\x1b[45m"
// const BgCyan = "\x1b[46m"
// const BgWhite = "\x1b[47m"
const BgGray = "\x1b[100m"

// Colored console wrapper
export class Logger {
    private readonly _prefix: string;

    constructor(prefix: string) {
        this._prefix = prefix;
    }

    public info(...message: any[]) {
        console.log(`[${FgCyan}${this._prefix}${Reset}] ${BgBlue} ${FgWhite}i ${Reset}${Bright}${FgBlue}`, ...message, Reset);
    }

    public warn(...message: any[]) {
        console.warn(`[${FgCyan}${this._prefix}${Reset}] ${BgYellow} ${FgWhite}⚠️ ${Reset}${Bright}${FgYellow}`, ...message, Reset);
    }

    public error(...message: any[]) {
        console.error(`[${FgCyan}${this._prefix}${Reset}] ${BgRed} ${FgWhite}❌ ${Reset}${Bright}${FgRed}`, ...message, Reset);
    }

    public success(...message: any[]) {
        console.log(`[${FgCyan}${this._prefix}${Reset}] ${BgGreen} ${FgWhite}✅ ${Reset}${Bright}${FgGreen}`, ...message, Reset);
    }

    public debug(...message: any[]) {
        console.debug(`[${FgCyan}${this._prefix}${Reset}] ${BgGray} ${FgWhite}⚙️ ${Reset}${Bright}${FgGray}`, ...message, Reset);
    }

    // Should only be used if something is an unexpected end state (i.e. program will exit afterward)
    // This does not exit the program, because I feel that the calling code should handle that instead as sometimes we may not want to exit the program
    public fatal(...message: any[]) {
        if (message.length === 0) {
            console.error(`[${FgCyan}${this._prefix}${Reset}] ${BgRed} ${FgWhite}‼ ${Reset} ${Bright}${FgWhite}${BgRed}Fatal error`, Reset);
        } else if (message.length === 1) {
            console.error(`[${FgCyan}${this._prefix}${Reset}] ${BgRed} ${FgWhite}‼ ${Reset} ${Bright}${FgWhite}${BgRed}${message[0]}${Reset}`);
        } else {
            console.error(`[${FgCyan}${this._prefix}${Reset}] ${BgRed} ${FgWhite}‼ ${Reset} ${Bright}${FgWhite}${BgRed}${message[0]}`, ...message.slice(1, message.length - 1), `${message[message.length - 1]}${Reset}`);
        }
    }
}