use tauri::{Manager, PhysicalSize, WindowEvent};

const TARGET_WIDTH_PX: f64 = 1180.0;
const TARGET_HEIGHT_PX: f64 = 1000.0;
const MIN_WIDTH_PX: f64 = 960.0;
const MIN_HEIGHT_PX: f64 = 680.0;

fn apply_dpi_adjusted_size(
    window: &tauri::WebviewWindow,
    scale_factor: Option<f64>,
) -> tauri::Result<()> {
    let dpi_scale = scale_factor.unwrap_or(window.scale_factor()?).max(0.1);
    let fit_scale = window
        .current_monitor()?
        .map(|monitor| {
            let size = monitor.size();
            let available_width = size.width.saturating_sub(48) as f64;
            let available_height = size.height.saturating_sub(80) as f64;
            (available_width / TARGET_WIDTH_PX)
                .min(available_height / TARGET_HEIGHT_PX)
                .min(1.0)
        })
        .unwrap_or(1.0)
        .max(0.5);

    let target_size = PhysicalSize::new(
        (TARGET_WIDTH_PX * fit_scale).round() as u32,
        (TARGET_HEIGHT_PX * fit_scale).round() as u32,
    );
    let minimum_size = PhysicalSize::new(
        (MIN_WIDTH_PX * fit_scale).round() as u32,
        (MIN_HEIGHT_PX * fit_scale).round() as u32,
    );

    window.set_min_size(Some(minimum_size))?;
    window.set_size(target_size)?;
    window.set_zoom(fit_scale / dpi_scale)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("main window was not created");
            apply_dpi_adjusted_size(&window, None)?;
            window.center()?;
            window.show()?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::ScaleFactorChanged { scale_factor, .. } = event {
                if let Some(webview) = window.app_handle().get_webview_window(window.label()) {
                    let _ = apply_dpi_adjusted_size(&webview, Some(*scale_factor));
                    let _ = webview.center();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
