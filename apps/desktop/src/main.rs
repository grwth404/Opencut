use gpui::{
    App, Application, Bounds, Context, SharedString, TitlebarOptions, Window, WindowBounds,
    WindowOptions, div, prelude::*, px, size,
};

mod theme;

use theme::ActiveTheme;

struct Root {
    status: SharedString,
}

impl Render for Root {
    fn render(&mut self, window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let colors = window.theme().colors;

        div()
            .flex()
            .flex_col()
            .gap_2()
            .size_full()
            .justify_center()
            .items_center()
            .bg(colors.background)
            .text_color(colors.foreground)
            .child(div().text_xl().child("OpenCut"))
            .child(
                div()
                    .text_sm()
                    .text_color(colors.muted_foreground)
                    .child(self.status.clone()),
            )
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        let is_wsl = std::fs::read_to_string("/proc/sys/kernel/osrelease")
            .is_ok_and(|release| release.to_ascii_lowercase().contains("microsoft"));
        let x11_configured =
            std::env::var_os("DISPLAY").is_some_and(|display| !display.is_empty());
        let wayland_configured =
            std::env::var_os("WAYLAND_DISPLAY").is_some_and(|display| !display.is_empty());

        if is_wsl && x11_configured && wayland_configured {
            // GPUI 0.2.2 requires xdg_wm_base v2+, while current WSLg advertises v1 and panics.
            // Safety: this is the first statement in `main`, before GPUI or anything
            // else has spawned a thread. No other thread exists yet, so keep this
            // block first if anything is added above it.
            unsafe {
                std::env::remove_var("WAYLAND_DISPLAY");
            }
        }
    }

    Application::new().run(|cx: &mut App| {
        let bounds = Bounds::centered(None, size(px(960.), px(600.)), cx);
        cx.open_window(
            WindowOptions {
                titlebar: Some(TitlebarOptions {
                    title: Some(SharedString::from("OpenCut")),
                    ..Default::default()
                }),
                window_bounds: Some(WindowBounds::Maximized(bounds)),
                ..Default::default()
            },
            |window, cx| {
                cx.new(|cx| {
                    cx.observe_window_appearance(window, |_, window, _| {
                        window.refresh();
                    })
                    .detach();

                    Root {
                        status: "desktop shell scaffold".into(),
                    }
                })
            },
        )
        .expect("failed to open the main window");
    });
}
