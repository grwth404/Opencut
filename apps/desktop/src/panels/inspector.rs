use gpui::{div, prelude::*, Context, Window};

use crate::theme::ActiveTheme;

pub(crate) struct Inspector;

impl Render for Inspector {
    fn render(&mut self, window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let colors = window.theme().colors;

        div()
            .flex()
            .w_1_4()
            .h_full()
            .items_center()
            .justify_center()
            .border_l_1()
            .border_color(colors.border)
            .bg(colors.card)
            .text_color(colors.card_foreground)
            .child("Inspector")
    }
}
