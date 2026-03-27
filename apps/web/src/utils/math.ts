export function clamp({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}): number {
	return Math.max(min, Math.min(max, value));
}

export function clampRound({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}): number {
	return Math.round(clamp({ value, min, max }));
}

export function getFractionDigitsForStep({ step }: { step: number }): number {
	const normalizedStep = step.toString().toLowerCase();
	if (normalizedStep.includes("e-")) {
		return Number(normalizedStep.split("e-")[1] ?? 0);
	}
	const [, fractionalPart = ""] = normalizedStep.split(".");
	return fractionalPart.length;
}

export function snapToStep({
	value,
	step,
}: {
	value: number;
	step: number;
}): number {
	if (step <= 0) return value;
	const snappedValue = Math.round(value / step) * step;
	return Number(
		snappedValue.toFixed(getFractionDigitsForStep({ step })),
	);
}

export function isNearlyEqual({
	leftValue,
	rightValue,
	epsilon = 0.0001,
}: {
	leftValue: number;
	rightValue: number;
	epsilon?: number;
}): boolean {
	return Math.abs(leftValue - rightValue) <= epsilon;
}

export function formatNumberForDisplay({
	value,
	fractionDigits,
	minFractionDigits = 0,
	maxFractionDigits = 6,
}: {
	value: number;
	fractionDigits?: number;
	minFractionDigits?: number;
	maxFractionDigits?: number;
}): string {
	const resolvedMaxFractionDigits = Math.max(
		0,
		fractionDigits ?? maxFractionDigits,
	);
	const resolvedMinFractionDigits = Math.min(
		Math.max(0, fractionDigits ?? minFractionDigits),
		resolvedMaxFractionDigits,
	);
	const fixedValue = value.toFixed(resolvedMaxFractionDigits);

	if (resolvedMaxFractionDigits === 0) {
		return Number(fixedValue) === 0 ? "0" : fixedValue;
	}

	const [integerPart, fractionPart = ""] = fixedValue.split(".");
	const normalizedIntegerPart = Number(fixedValue) === 0 ? "0" : integerPart;
	let trimmedFractionPart = fractionPart;

	while (
		trimmedFractionPart.length > resolvedMinFractionDigits &&
		trimmedFractionPart.endsWith("0")
	) {
		trimmedFractionPart = trimmedFractionPart.slice(0, -1);
	}

	return trimmedFractionPart
		? `${normalizedIntegerPart}.${trimmedFractionPart}`
		: normalizedIntegerPart;
}

export function evaluateMathExpression({
	input,
}: {
	input: string;
}): number | null {
	const sanitized = input.trim();
	if (!/^[\d.\s+\-*/()]+$/.test(sanitized)) return null;
	try {
		const result = new Function(`return (${sanitized})`)();
		if (typeof result !== "number" || !Number.isFinite(result)) return null;
		return result;
	} catch {
		return null;
	}
}
