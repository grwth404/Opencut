import { drawCssBackground } from "@/lib/gradients";
import { masksRegistry } from "@/lib/masks";
import type { AnyBaseNode } from "../nodes/base-node";
import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import { BlurBackgroundNode } from "../nodes/blur-background-node";
import { ColorNode } from "../nodes/color-node";
import { EffectLayerNode } from "../nodes/effect-layer-node";
import { GraphicNode, type ResolvedGraphicNodeState } from "../nodes/graphic-node";
import { ImageNode } from "../nodes/image-node";
import { RootNode } from "../nodes/root-node";
import { StickerNode } from "../nodes/sticker-node";
import { renderTextToContext, TextNode } from "../nodes/text-node";
import { VideoNode } from "../nodes/video-node";
import type { ResolvedVisualSourceNodeState } from "../nodes/visual-node";
import type {
	FrameDescriptor,
	FrameItemDescriptor,
	LayerMaskDescriptor,
	QuadTransformDescriptor,
} from "./types";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";

export type TextureUploadDescriptor = {
	id: string;
	source: CanvasImageSource;
	width: number;
	height: number;
};

export async function buildFrameDescriptor({
	node,
	renderer,
}: {
	node: AnyBaseNode;
	renderer: CanvasRenderer;
}): Promise<{
	frame: FrameDescriptor;
	textures: TextureUploadDescriptor[];
}> {
	const items: FrameItemDescriptor[] = [];
	const textures = new Map<string, TextureUploadDescriptor>();

	await collectNode({
		node,
		renderer,
		path: "root",
		items,
		textures,
	});

	return {
		frame: {
			width: renderer.width,
			height: renderer.height,
			clear: {
				color: [0, 0, 0, 1],
			},
			items,
		},
		textures: [...textures.values()],
	};
}

async function collectNode({
	node,
	renderer,
	path,
	items,
	textures,
}: {
	node: AnyBaseNode;
	renderer: CanvasRenderer;
	path: string;
	items: FrameItemDescriptor[];
	textures: Map<string, TextureUploadDescriptor>;
}): Promise<void> {
	if (node instanceof RootNode) {
		for (let index = 0; index < node.children.length; index++) {
			await collectNode({
				node: node.children[index],
				renderer,
				path: `${path}:${index}`,
				items,
				textures,
			});
		}
		return;
	}

	if (node instanceof ColorNode) {
		const textureId = `${path}:color`;
		const canvas = createOffscreenCanvas({
			width: renderer.width,
			height: renderer.height,
		});
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) return;
		if (/gradient\(/i.test(node.params.color)) {
			drawCssBackground({
				ctx,
				width: renderer.width,
				height: renderer.height,
				css: node.params.color,
			});
		} else {
			ctx.fillStyle = node.params.color;
			ctx.fillRect(0, 0, renderer.width, renderer.height);
		}
		textures.set(textureId, {
			id: textureId,
			source: canvas,
			width: renderer.width,
			height: renderer.height,
		});
		items.push({
			type: "layer",
			textureId,
			transform: fullCanvasTransform(renderer),
			opacity: 1,
			blendMode: "normal",
			effectPassGroups: [],
			mask: null,
		});
		return;
	}

	if (node instanceof EffectLayerNode) {
		if (!node.resolved || node.resolved.passes.length === 0) {
			return;
		}
		items.push({
			type: "sceneEffect",
			effectPassGroups: [node.resolved.passes],
		});
		return;
	}

	if (node instanceof BlurBackgroundNode) {
		if (!node.resolved) {
			return;
		}
		const textureId = `${path}:blur-background`;
		const backdropCanvas = createOffscreenCanvas({
			width: renderer.width,
			height: renderer.height,
		});
		const backdropCtx = backdropCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!backdropCtx) return;
		const { backdropSource, passes } = node.resolved;
		const coverScale = Math.max(
			renderer.width / backdropSource.width,
			renderer.height / backdropSource.height,
		);
		const scaledWidth = backdropSource.width * coverScale;
		const scaledHeight = backdropSource.height * coverScale;
		const offsetX = (renderer.width - scaledWidth) / 2;
		const offsetY = (renderer.height - scaledHeight) / 2;
		backdropCtx.drawImage(
			backdropSource.source,
			offsetX,
			offsetY,
			scaledWidth,
			scaledHeight,
		);
		textures.set(textureId, {
			id: textureId,
			source: backdropCanvas,
			width: renderer.width,
			height: renderer.height,
		});
		items.push({
			type: "layer",
			textureId,
			transform: fullCanvasTransform(renderer),
			opacity: 1,
			blendMode: "normal",
			effectPassGroups: [passes],
			mask: null,
		});
		return;
	}

	if (
		node instanceof VideoNode ||
		node instanceof ImageNode ||
		node instanceof StickerNode ||
		node instanceof GraphicNode
	) {
		await collectVisualSourceNode({
			node,
			renderer,
			path,
			items,
			textures,
		});
		return;
	}

	if (node instanceof TextNode) {
		collectTextNode({
			node,
			renderer,
			path,
			items,
			textures,
		});
	}
}

async function collectVisualSourceNode({
	node,
	renderer,
	path,
	items,
	textures,
}: {
	node: VideoNode | ImageNode | StickerNode | GraphicNode;
	renderer: CanvasRenderer;
	path: string;
	items: FrameItemDescriptor[];
	textures: Map<string, TextureUploadDescriptor>;
}) {
	if (!node.resolved) {
		return;
	}

	const source =
		node instanceof GraphicNode
			? node.getSource({ resolvedParams: node.resolved.resolvedParams })
			: node.resolved.source;
	if (!source) {
		return;
	}

	const sourceWidth =
		node instanceof GraphicNode
			? DEFAULT_GRAPHIC_SOURCE_SIZE
			: (node.resolved as ResolvedVisualSourceNodeState).sourceWidth;
	const sourceHeight =
		node instanceof GraphicNode
			? DEFAULT_GRAPHIC_SOURCE_SIZE
			: (node.resolved as ResolvedVisualSourceNodeState).sourceHeight;

	const textureId = `${path}:source`;
	textures.set(textureId, {
		id: textureId,
		source,
		width: sourceWidth,
		height: sourceHeight,
	});

	const transform = computeVisualTransform({
		renderer,
		resolved: node.resolved,
		sourceWidth,
		sourceHeight,
	});
	const { mask, strokeLayer } = buildMaskArtifacts({
		node,
		renderer,
		path,
		transform,
		textures,
	});

	items.push({
		type: "layer",
		textureId,
		transform,
		opacity: node.resolved.opacity,
		blendMode: node.params.blendMode ?? "normal",
		effectPassGroups: node.resolved.effectPasses,
		mask,
	});
	if (strokeLayer) {
		items.push(strokeLayer);
	}
}

function collectTextNode({
	node,
	renderer,
	path,
	items,
	textures,
}: {
	node: TextNode;
	renderer: CanvasRenderer;
	path: string;
	items: FrameItemDescriptor[];
	textures: Map<string, TextureUploadDescriptor>;
}) {
	if (!node.resolved) {
		return;
	}

	const textureId = `${path}:text`;
	const canvas = createOffscreenCanvas({
		width: renderer.width,
		height: renderer.height,
	});
	const ctx = canvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!ctx) {
		return;
	}

	renderTextToContext({
		node,
		ctx,
	});

	textures.set(textureId, {
		id: textureId,
		source: canvas,
		width: renderer.width,
		height: renderer.height,
	});
	items.push({
		type: "layer",
		textureId,
		transform: fullCanvasTransform(renderer),
		opacity: node.resolved.opacity,
		blendMode: node.params.blendMode ?? "normal",
		effectPassGroups: node.resolved.effectPasses,
		mask: null,
	});
}

function computeVisualTransform({
	renderer,
	resolved,
	sourceWidth,
	sourceHeight,
}: {
	renderer: CanvasRenderer;
	resolved: ResolvedVisualSourceNodeState | ResolvedGraphicNodeState;
	sourceWidth: number;
	sourceHeight: number;
}): QuadTransformDescriptor {
	const containScale = Math.min(
		renderer.width / sourceWidth,
		renderer.height / sourceHeight,
	);
	const scaledWidth = sourceWidth * containScale * resolved.transform.scaleX;
	const scaledHeight = sourceHeight * containScale * resolved.transform.scaleY;
	const absWidth = Math.abs(scaledWidth);
	const absHeight = Math.abs(scaledHeight);

	return {
		centerX: renderer.width / 2 + resolved.transform.position.x,
		centerY: renderer.height / 2 + resolved.transform.position.y,
		width: absWidth,
		height: absHeight,
		rotationDegrees: resolved.transform.rotate,
		flipX: scaledWidth < 0,
		flipY: scaledHeight < 0,
	};
}

function fullCanvasTransform(renderer: CanvasRenderer): QuadTransformDescriptor {
	return {
		centerX: renderer.width / 2,
		centerY: renderer.height / 2,
		width: renderer.width,
		height: renderer.height,
		rotationDegrees: 0,
		flipX: false,
		flipY: false,
	};
}

function buildMaskArtifacts({
	node,
	renderer,
	path,
	transform,
	textures,
}: {
	node: VideoNode | ImageNode | StickerNode | GraphicNode;
	renderer: CanvasRenderer;
	path: string;
	transform: QuadTransformDescriptor;
	textures: Map<string, TextureUploadDescriptor>;
}): {
	mask: LayerMaskDescriptor | null;
	strokeLayer: FrameItemDescriptor | null;
} {
	const mask = node.params.masks?.[0];
	if (!mask) {
		return { mask: null, strokeLayer: null };
	}

	const definition = masksRegistry.get(mask.type);
	const elementMaskCanvas = createOffscreenCanvas({
		width: Math.round(transform.width),
		height: Math.round(transform.height),
	});
	const elementMaskCtx = elementMaskCanvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!elementMaskCtx) {
		return { mask: null, strokeLayer: null };
	}
	elementMaskCtx.clearRect(0, 0, transform.width, transform.height);

	let strokePath: Path2D | null = null;
	let feather = mask.params.feather;
	if (mask.params.feather > 0 && definition.renderer.renderMask) {
		definition.renderer.renderMask({
			resolvedParams: mask.params,
			ctx: elementMaskCtx,
			width: Math.round(transform.width),
			height: Math.round(transform.height),
			feather: mask.params.feather,
		});
		feather = 0;
		strokePath = definition.renderer.buildStrokePath?.({
			resolvedParams: mask.params,
			width: transform.width,
			height: transform.height,
		}) ?? null;
	} else {
		const path2d = definition.renderer.buildPath({
			resolvedParams: mask.params,
			width: transform.width,
			height: transform.height,
		});
		elementMaskCtx.fillStyle = "white";
		elementMaskCtx.fill(path2d);
		strokePath =
			definition.renderer.buildStrokePath?.({
				resolvedParams: mask.params,
				width: transform.width,
				height: transform.height,
			}) ?? path2d;
	}

	const fullMaskCanvas = createOffscreenCanvas({
		width: renderer.width,
		height: renderer.height,
	});
	const fullMaskCtx = fullMaskCanvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!fullMaskCtx) {
		return { mask: null, strokeLayer: null };
	}
	drawTransformedCanvas({
		ctx: fullMaskCtx,
		source: elementMaskCanvas,
		transform,
	});

	const maskTextureId = `${path}:mask`;
	textures.set(maskTextureId, {
		id: maskTextureId,
		source: fullMaskCanvas,
		width: renderer.width,
		height: renderer.height,
	});

	let strokeLayer: FrameItemDescriptor | null = null;
	if (mask.params.strokeWidth > 0 && strokePath) {
		const strokeCanvas = createOffscreenCanvas({
			width: Math.round(transform.width),
			height: Math.round(transform.height),
		});
		const strokeCtx = strokeCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (strokeCtx) {
			strokeCtx.strokeStyle = mask.params.strokeColor;
			strokeCtx.lineWidth = mask.params.strokeWidth;
			strokeCtx.stroke(strokePath);

			const fullStrokeCanvas = createOffscreenCanvas({
				width: renderer.width,
				height: renderer.height,
			});
			const fullStrokeCtx = fullStrokeCanvas.getContext("2d") as
				| CanvasRenderingContext2D
				| OffscreenCanvasRenderingContext2D
				| null;
			if (fullStrokeCtx) {
				drawTransformedCanvas({
					ctx: fullStrokeCtx,
					source: strokeCanvas,
					transform,
				});
				const strokeTextureId = `${path}:mask-stroke`;
				textures.set(strokeTextureId, {
					id: strokeTextureId,
					source: fullStrokeCanvas,
					width: renderer.width,
					height: renderer.height,
				});
				strokeLayer = {
					type: "layer",
					textureId: strokeTextureId,
					transform: fullCanvasTransform(renderer),
					opacity: 1,
					blendMode: "normal",
					effectPassGroups: [],
					mask: null,
				};
			}
		}
	}

	return {
		mask: {
			textureId: maskTextureId,
			feather,
			inverted: mask.params.inverted,
		},
		strokeLayer,
	};
}

function drawTransformedCanvas({
	ctx,
	source,
	transform,
}: {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	source: CanvasImageSource;
	transform: QuadTransformDescriptor;
}) {
	const x = transform.centerX - transform.width / 2;
	const y = transform.centerY - transform.height / 2;
	const flipX = transform.flipX ? -1 : 1;
	const flipY = transform.flipY ? -1 : 1;
	const requiresTransform =
		transform.rotationDegrees !== 0 || flipX !== 1 || flipY !== 1;

	ctx.save();
	if (requiresTransform) {
		ctx.translate(transform.centerX, transform.centerY);
		ctx.rotate((transform.rotationDegrees * Math.PI) / 180);
		ctx.scale(flipX, flipY);
		ctx.translate(-transform.centerX, -transform.centerY);
	}
	ctx.drawImage(source, x, y, transform.width, transform.height);
	ctx.restore();
}

