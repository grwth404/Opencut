#![cfg(target_arch = "wasm32")]

use std::cell::RefCell;

use gpu::{EffectPass, GpuContext, UniformValue, wgpu};
use js_sys::{Object, Reflect};
use serde::Deserialize;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

thread_local! {
    static GPU_CONTEXT: RefCell<Option<GpuContext>> = const { RefCell::new(None) };
}

struct ApplyEffectPassesOptions {
    source: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    passes: Vec<EffectPassInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EffectPassInput {
    shader: String,
    uniforms: Vec<EffectUniformInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EffectUniformInput {
    name: String,
    value: Vec<f32>,
}

struct ApplyMaskFeatherOptions {
    mask: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    feather: f32,
}

#[wasm_bindgen(js_name = initializeGpu)]
pub async fn initialize_gpu() -> Result<(), JsValue> {
    if GPU_CONTEXT.with(|context| context.borrow().is_some()) {
        return Ok(());
    }

    let context = GpuContext::new()
        .await
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    GPU_CONTEXT.with(|gpu_context| {
        gpu_context.replace(Some(context));
    });
    Ok(())
}

#[wasm_bindgen(js_name = applyEffectPasses)]
pub fn apply_effect_passes(
    options: JsValue,
) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let ApplyEffectPassesOptions {
        source,
        width,
        height,
        passes,
    } = parse_apply_effect_passes_options(options)?;

    with_gpu_context(|context| {
        let source_texture = import_canvas_texture(context, &source, width, height)?;
        let effect_passes = map_effect_passes(passes);
        let result_texture = context
            .apply_effects(gpu::ApplyEffectsOptions {
                source: &source_texture,
                width,
                height,
                passes: &effect_passes,
            })
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        let output_canvas = wgpu::web_sys::OffscreenCanvas::new(width, height)?;
        let surface = context
            .instance()
            .create_surface(wgpu::SurfaceTarget::OffscreenCanvas(output_canvas.clone()))
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        context
            .render_texture_to_surface(&result_texture, &surface, width, height)
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        Ok(output_canvas)
    })
}

#[wasm_bindgen(js_name = applyMaskFeather)]
pub fn apply_mask_feather(
    options: JsValue,
) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let ApplyMaskFeatherOptions {
        mask,
        width,
        height,
        feather,
    } = parse_apply_mask_feather_options(options)?;

    with_gpu_context(|context| {
        let mask_texture = import_canvas_texture(context, &mask, width, height)?;
        let result_texture = context.apply_mask_feather(gpu::ApplyMaskFeatherOptions {
            mask: &mask_texture,
            width,
            height,
            feather,
        });
        let output_canvas = wgpu::web_sys::OffscreenCanvas::new(width, height)?;
        let surface = context
            .instance()
            .create_surface(wgpu::SurfaceTarget::OffscreenCanvas(output_canvas.clone()))
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        context
            .render_texture_to_surface(&result_texture, &surface, width, height)
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        Ok(output_canvas)
    })
}

fn with_gpu_context<T>(
    action: impl FnOnce(&GpuContext) -> Result<T, JsValue>,
) -> Result<T, JsValue> {
    GPU_CONTEXT.with(|context| {
        let borrow = context.borrow();
        let Some(gpu_context) = borrow.as_ref() else {
            return Err(JsValue::from_str(
                "GPU context not initialized. Call initializeGpu() first.",
            ));
        };
        action(gpu_context)
    })
}

fn import_canvas_texture(
    context: &GpuContext,
    canvas: &wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
) -> Result<wgpu::Texture, JsValue> {
    let texture = context.create_render_texture(width, height, "gpu-bridge-input-texture");
    context.queue().copy_external_image_to_texture(
        &wgpu::CopyExternalImageSourceInfo {
            source: wgpu::ExternalImageSource::OffscreenCanvas(canvas.clone()),
            origin: wgpu::Origin2d::ZERO,
            flip_y: true,
        },
        wgpu::CopyExternalImageDestInfo {
            texture: &texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
            color_space: wgpu::PredefinedColorSpace::Srgb,
            premultiplied_alpha: false,
        },
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );
    Ok(texture)
}

fn map_effect_passes(effect_passes: Vec<EffectPassInput>) -> Vec<EffectPass> {
    effect_passes
        .into_iter()
        .map(|pass| EffectPass {
            shader: pass.shader,
            uniforms: pass
                .uniforms
                .into_iter()
                .map(|uniform| {
                    let value = if uniform.value.len() == 1 {
                        UniformValue::Number(uniform.value[0])
                    } else {
                        UniformValue::Vector(uniform.value)
                    };
                    (uniform.name, value)
                })
                .collect(),
        })
        .collect()
}

fn parse_apply_effect_passes_options(value: JsValue) -> Result<ApplyEffectPassesOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyEffectPasses expects an options object"))?;

    Ok(ApplyEffectPassesOptions {
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        passes: read_serde_property(&object, "passes")?,
    })
}

fn parse_apply_mask_feather_options(value: JsValue) -> Result<ApplyMaskFeatherOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyMaskFeather expects an options object"))?;

    Ok(ApplyMaskFeatherOptions {
        mask: read_offscreen_canvas_property(&object, "mask")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        feather: read_f32_property(&object, "feather")?,
    })
}

fn read_property(object: &Object, name: &str) -> Result<JsValue, JsValue> {
    Reflect::get(object, &JsValue::from_str(name))
        .map_err(|_| JsValue::from_str(&format!("Missing property '{name}'")))
}

fn read_offscreen_canvas_property(
    object: &Object,
    name: &str,
) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    read_property(object, name)?
        .dyn_into::<wgpu::web_sys::OffscreenCanvas>()
        .map_err(|_| JsValue::from_str(&format!("Property '{name}' must be an OffscreenCanvas")))
}

fn read_u32_property(object: &Object, name: &str) -> Result<u32, JsValue> {
    let value = read_property(object, name)?;
    let Some(number) = value.as_f64() else {
        return Err(JsValue::from_str(&format!(
            "Property '{name}' must be a number"
        )));
    };
    Ok(number as u32)
}

fn read_f32_property(object: &Object, name: &str) -> Result<f32, JsValue> {
    let value = read_property(object, name)?;
    let Some(number) = value.as_f64() else {
        return Err(JsValue::from_str(&format!(
            "Property '{name}' must be a number"
        )));
    };
    Ok(number as f32)
}

fn read_serde_property<T>(object: &Object, name: &str) -> Result<T, JsValue>
where
    T: for<'de> Deserialize<'de>,
{
    let value = read_property(object, name)?;
    serde_wasm_bindgen::from_value(value)
        .map_err(|error| JsValue::from_str(&format!("Invalid property '{name}': {error}")))
}
