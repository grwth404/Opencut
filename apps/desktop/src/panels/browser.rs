use gpui::{div, prelude::*, Context, Window};

use crate::theme::ActiveTheme;

pub(crate) struct Browser;

impl Render for Browser {
    fn render(&mut self, window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let colors = window.theme().colors;

        div()
            .flex()
            .w_1_4()
            .h_full()
            .items_center()
            .justify_center()
            .border_r_1()
            .border_color(colors.sidebar_border)
            .bg(colors.sidebar)
            .text_color(colors.sidebar_foreground)
            .child("Browser")
    }
}
