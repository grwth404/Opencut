use bridge::export;

const DEFAULT_TIME_CODE_FORMAT: &str = "HH:MM:SS:CS";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum TimeCodeFormat {
    MmSs,
    HhMmSs,
    HhMmSsCs,
    HhMmSsFf,
}

impl TimeCodeFormat {
    fn parse(format: Option<&str>) -> Option<Self> {
        match format.unwrap_or(DEFAULT_TIME_CODE_FORMAT) {
            "MM:SS" => Some(Self::MmSs),
            "HH:MM:SS" => Some(Self::HhMmSs),
            "HH:MM:SS:CS" => Some(Self::HhMmSsCs),
            "HH:MM:SS:FF" => Some(Self::HhMmSsFf),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::MmSs => "MM:SS",
            Self::HhMmSs => "HH:MM:SS",
            Self::HhMmSsCs => "HH:MM:SS:CS",
            Self::HhMmSsFf => "HH:MM:SS:FF",
        }
    }
}

#[export]
pub fn round_to_frame(time: f64, fps: f64) -> f64 {
    (time * fps).round() / fps
}

#[export]
pub fn format_time_code(
    time_in_seconds: f64,
    format: Option<String>,
    fps: Option<f64>,
) -> Option<String> {
    let format = TimeCodeFormat::parse(format.as_deref())?;
    let hours = (time_in_seconds / 3600.0).floor() as u64;
    let minutes = ((time_in_seconds % 3600.0) / 60.0).floor() as u64;
    let seconds = (time_in_seconds % 60.0).floor() as u64;
    let centiseconds = ((time_in_seconds % 1.0) * 100.0).floor() as u64;

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
pub fn parse_time_code(time_code: &str, format: Option<String>, fps: Option<f64>) -> Option<f64> {
    if time_code.trim().is_empty() {
        return None;
    }

    let format = TimeCodeFormat::parse(format.as_deref())?;
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
            if *seconds >= 60 {
                return None;
            }

            Some((*minutes as f64 * 60.0) + *seconds as f64)
        }
        TimeCodeFormat::HhMmSs => {
            let [hours, minutes, seconds] = parts.as_slice() else {
                return None;
            };
            if *minutes >= 60 || *seconds >= 60 {
                return None;
            }

            Some((*hours as f64 * 3600.0) + (*minutes as f64 * 60.0) + *seconds as f64)
        }
        TimeCodeFormat::HhMmSsCs => {
            let [hours, minutes, seconds, centiseconds] = parts.as_slice() else {
                return None;
            };
            if *minutes >= 60 || *seconds >= 60 || *centiseconds >= 100 {
                return None;
            }

            Some(
                (*hours as f64 * 3600.0)
                    + (*minutes as f64 * 60.0)
                    + *seconds as f64
                    + (*centiseconds as f64 / 100.0),
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
            if *minutes >= 60 || *seconds >= 60 || *frames as f64 >= fps {
                return None;
            }

            Some(
                (*hours as f64 * 3600.0)
                    + (*minutes as f64 * 60.0)
                    + *seconds as f64
                    + (*frames as f64 / fps),
            )
        }
    }
}

#[export]
pub fn guess_time_code_format(time_code: &str) -> Option<String> {
    if time_code.trim().is_empty() {
        return None;
    }

    let part_count = time_code
        .split(':')
        .try_fold(0usize, |count, part| {
            part.parse::<u32>().ok().map(|_| count + 1)
        })?;

    match part_count {
        2 => Some(TimeCodeFormat::MmSs.as_str().to_string()),
        3 => Some(TimeCodeFormat::HhMmSs.as_str().to_string()),
        4 => Some(TimeCodeFormat::HhMmSsFf.as_str().to_string()),
        _ => None,
    }
}

#[export]
pub fn time_to_frame(time: f64, fps: f64) -> f64 {
    (time * fps).round()
}

#[export]
pub fn frame_to_time(frame: f64, fps: f64) -> f64 {
    frame / fps
}

#[export]
pub fn snap_time_to_frame(time: f64, fps: f64) -> f64 {
    if fps <= 0.0 {
        return time;
    }

    frame_to_time(time_to_frame(time, fps), fps)
}

#[export]
pub fn get_snapped_seek_time(raw_time: f64, duration: f64, fps: f64) -> f64 {
    let snapped_time = snap_time_to_frame(raw_time, fps);
    let last_frame = get_last_frame_time(duration, fps);
    snapped_time.clamp(0.0, last_frame)
}

#[export]
pub fn get_last_frame_time(duration: f64, fps: f64) -> f64 {
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
        assert_eq!(round_to_frame(1.24, 10.0), 1.2);
        assert_eq!(round_to_frame(1.26, 10.0), 1.3);
    }

    #[test]
    fn formats_default_time_codes() {
        assert_eq!(
            format_time_code(3723.45, None, None),
			Some("01:02:03:44".to_string()),
        );
        assert_eq!(
            format_time_code(65.0, Some("MM:SS".to_string()), None),
            Some("01:05".to_string()),
        );
    }

    #[test]
    fn formats_frame_based_time_codes() {
        assert_eq!(
            format_time_code(1.5, Some("HH:MM:SS:FF".to_string()), Some(30.0)),
            Some("00:00:01:15".to_string()),
        );
        assert_eq!(
            format_time_code(1.5, Some("HH:MM:SS:FF".to_string()), None),
            None,
        );
    }

    #[test]
    fn parses_time_codes() {
        assert_eq!(
            parse_time_code("01:05", Some("MM:SS".to_string()), None),
            Some(65.0),
        );
        assert_eq!(
            parse_time_code("00:00:01:15", Some("HH:MM:SS:FF".to_string()), Some(30.0)),
            Some(1.5),
        );
        assert_eq!(
            parse_time_code("00:00:01:30", Some("HH:MM:SS:FF".to_string()), Some(30.0)),
            None,
        );
    }

    #[test]
    fn guesses_time_code_formats() {
        assert_eq!(guess_time_code_format("01:05"), Some("MM:SS".to_string()));
        assert_eq!(
            guess_time_code_format("00:00:01"),
            Some("HH:MM:SS".to_string()),
        );
        assert_eq!(
            guess_time_code_format("00:00:01:15"),
            Some("HH:MM:SS:FF".to_string()),
        );
    }

    #[test]
    fn snaps_and_clamps_seek_time() {
        assert_eq!(time_to_frame(1.26, 10.0), 13.0);
        assert_eq!(frame_to_time(13.0, 10.0), 1.3);
        assert_eq!(snap_time_to_frame(1.26, 10.0), 1.3);
        assert_eq!(get_last_frame_time(10.0, 5.0), 9.8);
        assert_eq!(get_snapped_seek_time(10.0, 10.0, 5.0), 9.8);
    }
}
