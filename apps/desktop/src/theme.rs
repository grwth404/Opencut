use std::{f32::consts::PI, sync::OnceLock};

use gpui::{Hsla, Rems, Rgba, Window, WindowAppearance, rems};

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct SemanticColors {
    pub background: Hsla,
    pub foreground: Hsla,
    pub card: Hsla,
    pub card_foreground: Hsla,
    pub popover: Hsla,
    pub popover_foreground: Hsla,
    pub primary: Hsla,
    pub primary_foreground: Hsla,
    pub secondary: Hsla,
    pub secondary_foreground: Hsla,
    pub muted: Hsla,
    pub muted_foreground: Hsla,
    pub accent: Hsla,
    pub accent_foreground: Hsla,
    pub destructive: Hsla,
    pub border: Hsla,
    pub input: Hsla,
    pub ring: Hsla,
    pub chart_1: Hsla,
    pub chart_2: Hsla,
    pub chart_3: Hsla,
    pub chart_4: Hsla,
    pub chart_5: Hsla,
    pub sidebar: Hsla,
    pub sidebar_foreground: Hsla,
    pub sidebar_primary: Hsla,
    pub sidebar_primary_foreground: Hsla,
    pub sidebar_accent: Hsla,
    pub sidebar_accent_foreground: Hsla,
    pub sidebar_border: Hsla,
    pub sidebar_ring: Hsla,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Theme {
    pub colors: SemanticColors,
    pub radius: Rems,
}

static LIGHT_THEME: OnceLock<Theme> = OnceLock::new();
static DARK_THEME: OnceLock<Theme> = OnceLock::new();

impl Theme {
    pub fn for_appearance(appearance: WindowAppearance) -> &'static Self {
        match appearance {
            WindowAppearance::Light | WindowAppearance::VibrantLight => {
                LIGHT_THEME.get_or_init(Self::light)
            }
            WindowAppearance::Dark | WindowAppearance::VibrantDark => {
                DARK_THEME.get_or_init(Self::dark)
            }
        }
    }

    fn light() -> Self {
        Self {
            colors: SemanticColors {
                background: oklch(1.0, 0.0, 0.0),
                foreground: oklch(0.145, 0.0, 0.0),
                card: oklch(1.0, 0.0, 0.0),
                card_foreground: oklch(0.145, 0.0, 0.0),
                popover: oklch(1.0, 0.0, 0.0),
                popover_foreground: oklch(0.145, 0.0, 0.0),
                primary: oklch(0.205, 0.0, 0.0),
                primary_foreground: oklch(0.985, 0.0, 0.0),
                secondary: oklch(0.97, 0.0, 0.0),
                secondary_foreground: oklch(0.205, 0.0, 0.0),
                muted: oklch(0.97, 0.0, 0.0),
                muted_foreground: oklch(0.556, 0.0, 0.0),
                accent: oklch(0.97, 0.0, 0.0),
                accent_foreground: oklch(0.205, 0.0, 0.0),
                destructive: oklch(0.577, 0.245, 27.325),
                border: oklch(0.922, 0.0, 0.0),
                input: oklch(0.922, 0.0, 0.0),
                ring: oklch(0.708, 0.0, 0.0),
                chart_1: oklch(0.87, 0.0, 0.0),
                chart_2: oklch(0.556, 0.0, 0.0),
                chart_3: oklch(0.439, 0.0, 0.0),
                chart_4: oklch(0.371, 0.0, 0.0),
                chart_5: oklch(0.269, 0.0, 0.0),
                sidebar: oklch(0.985, 0.0, 0.0),
                sidebar_foreground: oklch(0.145, 0.0, 0.0),
                sidebar_primary: oklch(0.205, 0.0, 0.0),
                sidebar_primary_foreground: oklch(0.985, 0.0, 0.0),
                sidebar_accent: oklch(0.97, 0.0, 0.0),
                sidebar_accent_foreground: oklch(0.205, 0.0, 0.0),
                sidebar_border: oklch(0.922, 0.0, 0.0),
                sidebar_ring: oklch(0.708, 0.0, 0.0),
            },
            radius: rems(0.625),
        }
    }

    fn dark() -> Self {
        Self {
            colors: SemanticColors {
                background: oklch(0.145, 0.0, 0.0),
                foreground: oklch(0.985, 0.0, 0.0),
                card: oklch(0.205, 0.0, 0.0),
                card_foreground: oklch(0.985, 0.0, 0.0),
                popover: oklch(0.205, 0.0, 0.0),
                popover_foreground: oklch(0.985, 0.0, 0.0),
                primary: oklch(0.922, 0.0, 0.0),
                primary_foreground: oklch(0.205, 0.0, 0.0),
                secondary: oklch(0.269, 0.0, 0.0),
                secondary_foreground: oklch(0.985, 0.0, 0.0),
                muted: oklch(0.269, 0.0, 0.0),
                muted_foreground: oklch(0.708, 0.0, 0.0),
                accent: oklch(0.269, 0.0, 0.0),
                accent_foreground: oklch(0.985, 0.0, 0.0),
                destructive: oklch(0.704, 0.191, 22.216),
                border: oklch_with_alpha(1.0, 0.0, 0.0, 0.1),
                input: oklch_with_alpha(1.0, 0.0, 0.0, 0.15),
                ring: oklch(0.556, 0.0, 0.0),
                chart_1: oklch(0.87, 0.0, 0.0),
                chart_2: oklch(0.556, 0.0, 0.0),
                chart_3: oklch(0.439, 0.0, 0.0),
                chart_4: oklch(0.371, 0.0, 0.0),
                chart_5: oklch(0.269, 0.0, 0.0),
                sidebar: oklch(0.205, 0.0, 0.0),
                sidebar_foreground: oklch(0.985, 0.0, 0.0),
                sidebar_primary: oklch(0.488, 0.243, 264.376),
                sidebar_primary_foreground: oklch(0.985, 0.0, 0.0),
                sidebar_accent: oklch(0.269, 0.0, 0.0),
                sidebar_accent_foreground: oklch(0.985, 0.0, 0.0),
                sidebar_border: oklch_with_alpha(1.0, 0.0, 0.0, 0.1),
                sidebar_ring: oklch(0.556, 0.0, 0.0),
            },
            radius: rems(0.625),
        }
    }
}

pub trait ActiveTheme {
    fn theme(&self) -> &Theme;
}

impl ActiveTheme for Window {
    fn theme(&self) -> &Theme {
        Theme::for_appearance(self.appearance())
    }
}

fn oklch(lightness: f32, chroma: f32, hue_degrees: f32) -> Hsla {
    oklch_with_alpha(lightness, chroma, hue_degrees, 1.0)
}

fn oklch_with_alpha(lightness: f32, chroma: f32, hue_degrees: f32, alpha: f32) -> Hsla {
    let hue_radians = hue_degrees * PI / 180.0;
    let a = chroma * hue_radians.cos();
    let b = chroma * hue_radians.sin();

    let l = (lightness + 0.396_337_78 * a + 0.215_803_76 * b).powi(3);
    let m = (lightness - 0.105_561_346 * a - 0.063_854_17 * b).powi(3);
    let s = (lightness - 0.089_484_18 * a - 1.291_485_5 * b).powi(3);

    let red = linear_srgb_to_srgb(4.076_741_7 * l - 3.307_711_6 * m + 0.230_969_94 * s);
    let green = linear_srgb_to_srgb(-1.268_438 * l + 2.609_757_4 * m - 0.341_319_4 * s);
    let blue = linear_srgb_to_srgb(-0.004_196_086_3 * l - 0.703_418_6 * m + 1.707_614_7 * s);

    Hsla::from(Rgba {
        r: red.clamp(0.0, 1.0),
        g: green.clamp(0.0, 1.0),
        b: blue.clamp(0.0, 1.0),
        a: alpha.clamp(0.0, 1.0),
    })
}

fn linear_srgb_to_srgb(channel: f32) -> f32 {
    if channel >= 0.003_130_8 {
        1.055 * channel.powf(1.0 / 2.4) - 0.055
    } else {
        12.92 * channel
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_neutral_oklch_endpoints() {
        let black = Rgba::from(oklch(0.0, 0.0, 0.0));
        let white = Rgba::from(oklch(1.0, 0.0, 0.0));

        assert_eq!(
            black,
            Rgba {
                r: 0.0,
                g: 0.0,
                b: 0.0,
                a: 1.0,
            }
        );
        assert!((white.r - 1.0).abs() < f32::EPSILON);
        assert!((white.g - 1.0).abs() < f32::EPSILON);
        assert!((white.b - 1.0).abs() < f32::EPSILON);
        assert!((white.a - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn keeps_translucent_tokens_translucent() {
        assert_eq!(Theme::dark().colors.border.a, 0.1);
        assert_eq!(Theme::dark().colors.input.a, 0.15);
    }

    #[test]
    fn selects_theme_for_system_appearance() {
        let light = Theme::for_appearance(WindowAppearance::Light);
        let dark = Theme::for_appearance(WindowAppearance::Dark);

        assert!(std::ptr::eq(light, Theme::for_appearance(WindowAppearance::VibrantLight)));
        assert!(std::ptr::eq(dark, Theme::for_appearance(WindowAppearance::VibrantDark)));
        assert_ne!(light.colors.background, dark.colors.background);
    }
}
