export type ParamValues = Record<string, number | string | boolean>;

export type ParamGroup = "stroke";

interface BaseParamDefinition<TKey extends string = string> {
	key: TKey;
	label: string;
	group?: ParamGroup;
}

export interface NumberParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "number";
	default: number;
	min: number;
	max?: number;
	step: number;
	/** When set, min/max/step are in display space. display = stored * displayMultiplier. */
	displayMultiplier?: number;
	/** Show as percentage of max. min/max/step/default stay in stored space. */
	unit?: "percent";
	/** Short label shown as the scrub handle icon in the number field (e.g. "W", "R"). */
	shortLabel?: string;
}

export interface BooleanParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "boolean";
	default: boolean;
}

export interface ColorParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "color";
	default: string;
}

export interface SelectParamDefinition<TKey extends string = string>
	extends BaseParamDefinition<TKey> {
	type: "select";
	default: string;
	options: Array<{ value: string; label: string }>;
}

export type ParamDefinition<TKey extends string = string> =
	| NumberParamDefinition<TKey>
	| BooleanParamDefinition<TKey>
	| ColorParamDefinition<TKey>
	| SelectParamDefinition<TKey>;

