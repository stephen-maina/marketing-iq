import { requireThat, text } from "./json.js";

// DateTimeOffset stores 100 ns ticks; Date alone would erase replay and boundary precision.
export function instant(value: unknown): { utc: string; ticks: bigint } {
    const input = text(value, 64);
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,16}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(input);
    requireThat(match);
    const date = match[1]!, hour = Number(match[2]), minute = Number(match[3]), second = Number(match[4]);
    const midnight = Date.parse(`${date}T00:00:00Z`);
    requireThat(date >= "0001-01-01" && Number.isFinite(midnight) &&
        new Date(midnight).toISOString().slice(0, 10) === date && hour < 24 && minute < 60 && second < 60);
    const offsetHour = Number(match[8] ?? 0), offsetMinute = Number(match[9] ?? 0);
    requireThat(offsetHour <= 14 && offsetMinute < 60 && (offsetHour < 14 || offsetMinute === 0));
    const offset = (offsetHour * 60 + offsetMinute) * (match[7] === "-" ? -1 : 1);
    const digits = match[5] ?? "";
    const rounded = BigInt(digits.padEnd(7, "0").slice(0, 7)) + (Number(digits[7] ?? 0) >= 5 ? 1n : 0n);
    const carry = Number(rounded / 10000000n) * 1000;
    const localMilliseconds = midnight + ((hour * 60 + minute) * 60 + second) * 1000 + carry;
    const milliseconds = localMilliseconds - offset * 60000;
    requireThat(milliseconds >= Date.parse("0001-01-01T00:00:00Z") &&
        milliseconds <= Date.parse("9999-12-31T23:59:59Z") &&
        localMilliseconds <= Date.parse("9999-12-31T23:59:59Z"));
    const fraction = (rounded % 10000000n).toString().padStart(7, "0");
    const suffix = fraction.replace(/0+$/, "");
    return {
        utc: new Date(milliseconds).toISOString().slice(0, 19) + (suffix ? `.${suffix}` : "") + "+00:00",
        ticks: BigInt(milliseconds) * 10000n + BigInt(fraction)
    };
}
