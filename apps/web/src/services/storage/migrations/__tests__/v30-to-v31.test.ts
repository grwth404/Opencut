import { describe, expect, test } from "bun:test";
import { transformProjectV30ToV31 } from "../transformers/v30-to-v31";
import { asRecord, asRecordArray } from "./helpers";

describe("V30 to V31 Migration", () => {
	test("renames custom masks to freeform without changing params", () => {
		const params = {
			feather: 0,
			inverted: false,
			strokeColor: "#ffffff",
			strokeWidth: 0,
			strokeAlign: "center",
			path: [{ id: "p1", x: 0, y: 0, inX: 0, inY: 0, outX: 0, outY: 0 }],
			closed: true,
			centerX: 0,
			centerY: 0,
			rotation: 0,
			scale: 1,
		};

		const result = transformProjectV30ToV31({
			project: {
				id: "project-v30-freeform",
				version: 30,
				scenes: [
					{
						tracks: {
							main: {
								elements: [
									{
										id: "image-1",
										type: "image",
										masks: [{ id: "mask-1", type: "custom", params }],
									},
								],
							},
						},
					},
				],
			},
		});

		expect(result.skipped).toBe(false);
		expect(result.project.version).toBe(31);
		const scene = asRecordArray(result.project.scenes)[0];
		const tracks = asRecord(scene.tracks);
		const main = asRecord(tracks.main);
		const element = asRecordArray(main.elements)[0];
		const mask = asRecordArray(asRecord(element).masks)[0];
		expect(mask).toMatchObject({
			id: "mask-1",
			type: "freeform",
			legacyType: "custom",
			params,
		});
	});
});
