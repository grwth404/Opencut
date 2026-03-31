use bridge::export;
use serde::{Deserialize, Serialize};

const SECONDS_PER_HOUR: f64 = 3600.0;
const SECONDS_PER_MINUTE: f64 = 60.0;
const CENTISECONDS_PER_SECOND: f64 = 100.0;

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi, into_wasm_abi))]
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TimeCodeFormat {
    #[serde(rename = "MM:SS")]
    MmSs,
    #[serde(rename = "HH:MM:SS")]
    HhMmSs,
    #[serde(rename = "HH:MM:SS:CS")]
    HhMmSsCs,
    #[serde(rename = "HH:MM:SS:FF")]
    HhMmSsFf,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundToFrameOptions {
    pub time: f64,
    pub fps: f64,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatTimeCodeOptions {
    pub time_in_seconds: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<TimeCodeFormat>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fps: Option<f64>,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseTimeCodeOptions {
    pub time_code: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<TimeCodeFormat>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fps: Option<f64>,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuessTimeCodeFormatOptions {
    pub time_code: String,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeToFrameOptions {
    pub time: f64,
    pub fps: f64,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameToTimeOptions {
    pub frame: f64,
    pub fps: f64,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapTimeToFrameOptions {
    pub time: f64,
    pub fps: f64,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSnappedSeekTimeOptions {
    pub raw_time: f64,
    pub duration: f64,
    pub fps: f64,
}

#[cfg_attr(feature = "wasm", derive(tsify_next::Tsify))]
#[cfg_attr(feature = "wasm", tsify(from_wasm_abi))]
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLastFrameTimeOptions {
    pub duration: f64,
    pub fps: f64,
}

#[export]
pub fn round_to_frame(RoundToFrameOptions { time, fps }: RoundToFrameOptions) -> f64 {
    (time * fps).round() / fps
}

#[export]
pub fn format_time_code(
    FormatTimeCodeOptions {
        time_in_seconds,
        format,
        fps,
    }: FormatTimeCodeOptions,
) -> Option<String> {
    let format = format.unwrap_or(TimeCodeFormat::HhMmSsCs);
    let hours = (time_in_seconds / SECONDS_PER_HOUR).floor() as u64;
    let minutes = ((time_in_seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE).floor() as u64;
    let seconds = (time_in_seconds % SECONDS_PER_MINUTE).floor() as u64;
    let centiseconds = ((time_in_seconds % 1.0) * CENTISECONDS_PER_SECOND).floor() as u64;

    match format {
        TimeCodeFormat::MmSs => Some(format!("{minutes:02}:{seconds:02}")),
        TimeCodeFormat::HhMmSs => Some(format!("{hours:02}:{minutes:02}:{seconds:02}")),
        TimeCodeFormat::HhMmSsCs => Some(format!(
            "{hours:02}:{minutes:02}:{seconds:02}:{centiseconds:02}",
        )),
        TimeCodeFormat::HhMmSsFf => {
            let fps = fps?;
            if fps <= 0.0 {
                return None;
            }

            let frames = ((time_in_seconds % 1.0) * fps).floor() as u64;
            Some(format!(
                "{hours:02}:{minutes:02}:{seconds:02}:{frames:02}",
            ))
        }
    }
}

#[export]
pub fn parse_time_code(
    ParseTimeCodeOptions {
        time_code,
        format,
        fps,
    }: ParseTimeCodeOptions,
) -> Option<f64> {
    if time_code.trim().is_empty() {
        return None;
    }

    let format = format.unwrap_or(TimeCodeFormat::HhMmSsCs);
    let parts = time_code
        .trim()
        .split(':')
        .map(|part| part.parse::<u32>().ok())
        .collect::<Option<Vec<_>>>()?;

    match format {
        TimeCodeFormat::MmSs => {
            let [minutes, seconds] = parts.as_slice() else {
                return None;
            };
            if *seconds >= SECONDS_PER_MINUTE as u32 {
                return None;
            }

            Some((*minutes as f64 * SECONDS_PER_MINUTE) + *seconds as f64)
        }
        TimeCodeFormat::HhMmSs => {
            let [hours, minutes, seconds] = parts.as_slice() else {
                return None;
            };
            if *minutes >= SECONDS_PER_MINUTE as u32 || *seconds >= SECONDS_PER_MINUTE as u32 {
                return None;
            }

            Some(
                (*hours as f64 * SECONDS_PER_HOUR)
                    + (*minutes as f64 * SECONDS_PER_MINUTE)
                    + *seconds as f64,
            )
        }
        TimeCodeFormat::HhMmSsCs => {
            let [hours, minutes, seconds, centiseconds] = parts.as_slice() else {
                return None;
            };
            if *minutes >= SECONDS_PER_MINUTE as u32
                || *seconds >= SECONDS_PER_MINUTE as u32
                || *centiseconds >= CENTISECONDS_PER_SECOND as u32
            {
                return None;
            }

            Some(
                (*hours as f64 * SECONDS_PER_HOUR)
                    + (*minutes as f64 * SECONDS_PER_MINUTE)
                    + *seconds as f64
                    + (*centiseconds as f64 / CENTISECONDS_PER_SECOND),
            )
        }
        TimeCodeFormat::HhMmSsFf => {
            let fps = fps?;
            if fps <= 0.0 {
                return None;
            }

            let [hours, minutes, seconds, frames] = parts.as_slice() else {
                return None;
            };
            if *minutes >= SECONDS_PER_MINUTE as u32
                || *seconds >= SECONDS_PER_MINUTE as u32
                || *frames as f64 >= fps
            {
                return None;
            }

            Some(
                (*hours as f64 * SECONDS_PER_HOUR)
                    + (*minutes as f64 * SECONDS_PER_MINUTE)
                    + *seconds as f64
                    + (*frames as f64 / fps),
            )
        }
    }
}

#[export]
pub fn guess_time_code_format(
    GuessTimeCodeFormatOptions { time_code }: GuessTimeCodeFormatOptions,
) -> Option<TimeCodeFormat> {
    if time_code.trim().is_empty() {
        return None;
    }

    let part_count = time_code
        .split(':')
        .try_fold(0usize, |count, part| {
            part.parse::<u32>().ok().map(|_| count + 1)
        })?;

    match part_count {
        2 => Some(TimeCodeFormat::MmSs),
        3 => Some(TimeCodeFormat::HhMmSs),
        4 => Some(TimeCodeFormat::HhMmSsFf),
        _ => None,
    }
}

#[export]
pub fn time_to_frame(TimeToFrameOptions { time, fps }: TimeToFrameOptions) -> f64 {
    (time * fps).round()
}

#[export]
pub fn frame_to_time(FrameToTimeOptions { frame, fps }: FrameToTimeOptions) -> f64 {
    frame / fps
}

#[export]
pub fn snap_time_to_frame(SnapTimeToFrameOptions { time, fps }: SnapTimeToFrameOptions) -> f64 {
    if fps <= 0.0 {
        return time;
    }

    frame_to_time(FrameToTimeOptions {
        frame: time_to_frame(TimeToFrameOptions { time, fps }),
        fps,
    })
}

#[export]
pub fn get_snapped_seek_time(
    GetSnappedSeekTimeOptions {
        raw_time,
        duration,
        fps,
    }: GetSnappedSeekTimeOptions,
) -> f64 {
    let snapped_time = snap_time_to_frame(SnapTimeToFrameOptions { time: raw_time, fps });
    let last_frame = get_last_frame_time(GetLastFrameTimeOptions { duration, fps });
    snapped_time.clamp(0.0, last_frame)
}

#[export]
pub fn get_last_frame_time(
    GetLastFrameTimeOptions { duration, fps }: GetLastFrameTimeOptions,
) -> f64 {
    if duration <= 0.0 {
        return 0.0;
    }

    if fps <= 0.0 {
        return duration;
    }

    let frame_offset = 1.0 / fps;
    (duration - frame_offset).max(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounds_to_the_nearest_frame() {
        assert_eq!(round_to_frame(RoundToFrameOptions { time: 1.24, fps: 10.0 }), 1.2);
        assert_eq!(round_to_frame(RoundToFrameOptions { time: 1.26, fps: 10.0 }), 1.3);
    }

    #[test]
    fn formats_default_time_codes() {
        assert_eq!(
            format_time_code(FormatTimeCodeOptions {
                time_in_seconds: 3723.45,
                format: None,
                fps: None,
            }),
            Some("01:02:03:44".to_string()),
        );
        assert_eq!(
            format_time_code(FormatTimeCodeOptions {
                time_in_seconds: 65.0,
                format: Some(TimeCodeFormat::MmSs),
                fps: None,
            }),
            Some("01:05".to_string()),
        );
    }

    #[test]
    fn formats_frame_based_time_codes() {
        assert_eq!(
            format_time_code(FormatTimeCodeOptions {
                time_in_seconds: 1.5,
                format: Some(TimeCodeFormat::HhMmSsFf),
                fps: Some(30.0),
            }),
            Some("00:00:01:15".to_string()),
        );
        assert_eq!(
            format_time_code(FormatTimeCodeOptions {
                time_in_seconds: 1.5,
                format: Some(TimeCodeFormat::HhMmSsFf),
                fps: None,
            }),
            None,
        );
    }

    #[test]
    fn parses_time_codes() {
        assert_eq!(
            parse_time_code(ParseTimeCodeOptions {
                time_code: "01:05".to_string(),
                format: Some(TimeCodeFormat::MmSs),
                fps: None,
            }),
            Some(65.0),
        );
        assert_eq!(
            parse_time_code(ParseTimeCodeOptions {
                time_code: "00:00:01:15".to_string(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                fps: Some(30.0),
            }),
            Some(1.5),
        );
        assert_eq!(
            parse_time_code(ParseTimeCodeOptions {
                time_code: "00:00:01:30".to_string(),
                format: Some(TimeCodeFormat::HhMmSsFf),
                fps: Some(30.0),
            }),
            None,
        );
    }

    #[test]
    fn guesses_time_code_formats() {
        assert_eq!(
            guess_time_code_format(GuessTimeCodeFormatOptions { time_code: "01:05".to_string() }),
            Some(TimeCodeFormat::MmSs),
        );
        assert_eq!(
            guess_time_code_format(GuessTimeCodeFormatOptions {
                time_code: "00:00:01".to_string(),
            }),
            Some(TimeCodeFormat::HhMmSs),
        );
        assert_eq!(
            guess_time_code_format(GuessTimeCodeFormatOptions {
                time_code: "00:00:01:15".to_string(),
            }),
            Some(TimeCodeFormat::HhMmSsFf),
        );
    }

    #[test]
    fn snaps_and_clamps_seek_time() {
        assert_eq!(time_to_frame(TimeToFrameOptions { time: 1.26, fps: 10.0 }), 13.0);
        assert_eq!(frame_to_time(FrameToTimeOptions { frame: 13.0, fps: 10.0 }), 1.3);
        assert_eq!(snap_time_to_frame(SnapTimeToFrameOptions { time: 1.26, fps: 10.0 }), 1.3);
        assert_eq!(get_last_frame_time(GetLastFrameTimeOptions { duration: 10.0, fps: 5.0 }), 9.8);
        assert_eq!(
            get_snapped_seek_time(GetSnappedSeekTimeOptions {
                raw_time: 10.0,
                duration: 10.0,
                fps: 5.0,
            }),
            9.8,
        );
    }
}
