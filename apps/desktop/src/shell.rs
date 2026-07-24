use gpui::{div, prelude::*, App, Context, Entity, Window};

use crate::panels::{Browser, Inspector, Preview, Timeline};
use crate::theme::ActiveTheme;

// Panels are entities created once in `new`, not via `cx.new` inline in
// `render`, so each keeps its own state across renders instead of being
// torn down and rebuilt on every frame.
pub(crate) struct Shell {
    browser: Entity<Browser>,
    preview: Entity<Preview>,
    inspector: Entity<Inspector>,
    timeline: Entity<Timeline>,
}

impl Shell {
    pub(crate) fn new(cx: &mut App) -> Self {
        Self {
            browser: cx.new(|_| Browser),
            preview: cx.new(|_| Preview),
            inspector: cx.new(|_| Inspector),
            timeline: cx.new(|_| Timeline),
        }
    }
}

impl Render for Shell {
    fn render(&mut self, window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let colors = window.theme().colors;

        div()
            .flex()
            .flex_col()
            .size_full()
            .bg(colors.background)
            .text_color(colors.foreground)
            .child(
                div()
                    .flex()
                    .h_2_3()
                    .border_b_1()
                    .border_color(colors.border)
                    .child(self.browser.clone())
                    .child(self.preview.clone())
                    .child(self.inspector.clone()),
            )
            .child(self.timeline.clone())
    }
}
