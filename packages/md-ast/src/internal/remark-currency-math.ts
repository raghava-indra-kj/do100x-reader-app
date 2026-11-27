import remarkMath from "remark-math";
import type { Plugin } from "unified";

const dollar = 36;
const startsWithAmount = /^\$[-−]?(?:\d|\.\d)/;
const spaceBeforeClosingDollar = /\s\$$/;
const startsFormula = /[\p{L}\p{N}\\([{+\-−]/u;

/** Keep currency in Markdown prose while retaining explicit inline and display math. */
export const remarkCurrencyMath: Plugin = function () {
    remarkMath.call(this);
    const extension = this.data("micromarkExtensions")?.at(-1);
    const inlineMath = extension?.text?.[dollar];
    if (!inlineMath || Array.isArray(inlineMath)) return;

    const tokenizeMath = inlineMath.tokenize;
    inlineMath.tokenize = function (effects, ok, nok) {
        const start = this.now();
        return tokenizeMath.call(this, effects, code => {
            const source = this.sliceSerialize({ start, end: this.now() });
            if (source.startsWith("$$")) return ok(code);

            const next = code !== null && code >= 0 ? String.fromCharCode(code) : "";
            if (/\d/.test(next)) return nok(code);
            if (!startsWithAmount.test(source)) return ok(code);

            // A currency sign must not claim the opening delimiter of a later formula.
            if (spaceBeforeClosingDollar.test(source) || startsFormula.test(next)) return nok(code);
            if (next !== ".") return ok(code);

            // A period can end the sentence or start a price such as $.50.
            return effects.check({
                partial: true,
                tokenize(lookahead, match, fail) {
                    return period => {
                        lookahead.enter("data");
                        lookahead.consume(period);
                        lookahead.exit("data");
                        return afterPeriod => afterPeriod !== null && afterPeriod >= 48 && afterPeriod <= 57
                            ? match(afterPeriod)
                            : fail(afterPeriod);
                    };
                },
            }, nok, ok)(code);
        }, nok);
    };
};
