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

function getFractionDigitsForStep({ step }: { step: number }): number {
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
	maxFractionDigits = 6,
}: {
	value: number;
	maxFractionDigits?: number;
}): string {
	return Number(value.toFixed(maxFractionDigits)).toString();
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
